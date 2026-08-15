import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  classSections,
  curriculumBooks,
  curriculumChapters,
  curriculumClasses,
  curriculumSubjects,
  curriculumTopics,
  curriculumVersions,
  lessons,
  subjects,
  teacherProfiles,
  teacherAssignments,
  timetableEntries,
  timetablePeriods,
  users,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import type { CurriculumSetupCatalogue, LessonRecord, WorkspaceBootstrap } from "@/lib/app-types";
import { auth, authConfigured } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateLesson, lessonContentSchema } from "@/lib/lesson";
import { normalizeOnboardingInput } from "@/lib/onboarding";

export class AuthorizationError extends Error {}
export class ConfigurationError extends Error {}

export type ViewerContext = { userId: string; workspaceId: string; role: "owner" | "teacher"; onboardingComplete: boolean; name: string; email: string; image: string | null };

function isoDate(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

function asLessonStatus(status: "draft" | "ready"): "Draft" | "Ready" { return status === "ready" ? "Ready" : "Draft"; }

export async function requireViewer(): Promise<ViewerContext> {
  if (!authConfigured) throw new ConfigurationError("Neon Auth is not configured.");
  const { data } = await auth.getSession();
  if (!data?.user?.id || !data.user.email) throw new AuthorizationError("Sign in is required.");
  const identity = data.user;
  const name = identity.name?.trim() || identity.email.split("@")[0];
  const database = db();
  const [user] = await database.insert(users).values({
    authUserId: identity.id,
    email: identity.email,
    name,
    image: identity.image ?? null,
  }).onConflictDoUpdate({
    target: users.authUserId,
    set: { email: identity.email, name, image: identity.image ?? null, updatedAt: new Date() },
  }).returning();
  if (!user) throw new AuthorizationError("Could not establish your account.");
  const [membership] = await database.select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role, onboardingCompletedAt: workspaces.onboardingCompletedAt })
    .from(workspaceMembers).innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id)).limit(1);
  if (membership) return { userId: user.id, workspaceId: membership.workspaceId, role: membership.role, onboardingComplete: Boolean(membership.onboardingCompletedAt), name: user.name, email: user.email, image: user.image };
  const [workspace] = await database.insert(workspaces).values({ name: `${name}'s workspace` }).returning();
  if (!workspace) throw new AuthorizationError("Could not create your workspace.");
  await database.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
  await database.insert(teacherProfiles).values({ userId: user.id, displayName: name }).onConflictDoNothing();
  return { userId: user.id, workspaceId: workspace.id, role: "owner", onboardingComplete: false, name: user.name, email: user.email, image: user.image };
}

async function curriculumRecordsForSubjects(curriculumSubjectIds: string[]) {
  if (!curriculumSubjectIds.length) return { books: [], chapters: [], topics: [] };
  const database = db();
  const [books, chapters, topics] = await Promise.all([
    database.select({ id: curriculumBooks.id, curriculumSubjectId: curriculumBooks.subjectId, title: curriculumBooks.title, ordinal: curriculumBooks.ordinal, sourceUrl: curriculumBooks.sourceUrl, sourceLabel: curriculumBooks.sourceLabel, sourceType: curriculumBooks.sourceType })
      .from(curriculumBooks).where(inArray(curriculumBooks.subjectId, curriculumSubjectIds)).orderBy(curriculumBooks.ordinal),
    database.select({ id: curriculumChapters.id, bookId: curriculumChapters.bookId, title: curriculumChapters.title, ordinal: curriculumChapters.ordinal })
      .from(curriculumChapters).innerJoin(curriculumBooks, eq(curriculumChapters.bookId, curriculumBooks.id)).where(inArray(curriculumBooks.subjectId, curriculumSubjectIds)).orderBy(curriculumChapters.ordinal),
    database.select({ id: curriculumTopics.id, chapterId: curriculumTopics.chapterId, title: curriculumTopics.title, guidance: curriculumTopics.guidance, provenance: curriculumTopics.provenance, sourceUrl: curriculumTopics.sourceUrl })
      .from(curriculumTopics).innerJoin(curriculumChapters, eq(curriculumTopics.chapterId, curriculumChapters.id)).innerJoin(curriculumBooks, eq(curriculumChapters.bookId, curriculumBooks.id))
      .where(inArray(curriculumBooks.subjectId, curriculumSubjectIds)).orderBy(curriculumTopics.ordinal),
  ]);
  return { books, chapters, topics: topics.map((row) => ({ ...row, guidance: row.guidance as { concept: string; outcomes: string[]; activities: string[]; materials: string[]; checks: string[]; assignment: string } })) };
}

export async function getCurriculumSetupCatalogue(context: ViewerContext): Promise<CurriculumSetupCatalogue> {
  const database = db();
  const [workspace] = await database.select({ academicYear: workspaces.academicYear }).from(workspaces).where(eq(workspaces.id, context.workspaceId)).limit(1);
  if (!workspace) throw new AuthorizationError("Workspace not found.");
  const [version] = await database.select({ id: curriculumVersions.id }).from(curriculumVersions).where(eq(curriculumVersions.academicYear, workspace.academicYear)).orderBy(desc(curriculumVersions.importedAt)).limit(1);
  if (!version) return { classes: [], subjects: [] };
  const [classes, subjects] = await Promise.all([
    database.select({ id: curriculumClasses.id, name: curriculumClasses.name, ordinal: curriculumClasses.ordinal, canonicalKey: curriculumClasses.canonicalKey }).from(curriculumClasses).where(eq(curriculumClasses.versionId, version.id)).orderBy(curriculumClasses.ordinal),
    database.select({ id: curriculumSubjects.id, curriculumClassId: curriculumSubjects.classId, name: curriculumSubjects.name, ordinal: curriculumSubjects.ordinal, canonicalKey: curriculumSubjects.canonicalKey, sourceUrl: curriculumSubjects.sourceUrl, provenance: curriculumSubjects.provenance, sourceType: curriculumSubjects.sourceType })
      .from(curriculumSubjects).innerJoin(curriculumClasses, eq(curriculumSubjects.classId, curriculumClasses.id)).where(eq(curriculumClasses.versionId, version.id)).orderBy(curriculumSubjects.ordinal),
  ]);
  return { classes, subjects };
}

export async function getWorkspaceBootstrap(context: ViewerContext): Promise<WorkspaceBootstrap> {
  const database = db();
  const [workspace] = await database.select().from(workspaces).where(eq(workspaces.id, context.workspaceId)).limit(1);
  if (!workspace) throw new AuthorizationError("Workspace not found.");
  const lessonRows = await database.select({
    id: lessons.id, date: lessons.lessonDate, duration: lessons.durationMinutes, status: lessons.status, updatedAt: lessons.updatedAt, content: lessons.content,
    classGroup: classSections.label, subject: subjects.name, topic: curriculumTopics.title, chapter: curriculumChapters.title, period: timetablePeriods.label,
  }).from(lessons)
    .innerJoin(classSections, eq(lessons.classSectionId, classSections.id))
    .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
    .innerJoin(curriculumTopics, eq(lessons.topicId, curriculumTopics.id))
    .innerJoin(curriculumChapters, eq(curriculumTopics.chapterId, curriculumChapters.id))
    .leftJoin(timetablePeriods, eq(lessons.timetablePeriodId, timetablePeriods.id))
    .where(and(eq(lessons.workspaceId, context.workspaceId), isNull(lessons.deletedAt))).orderBy(desc(lessons.updatedAt));
  const lessonList: LessonRecord[] = lessonRows.map((row) => ({
    id: row.id, date: isoDate(row.date), duration: row.duration, status: asLessonStatus(row.status), updatedAt: row.updatedAt.toISOString(),
    classGroup: row.classGroup, subject: row.subject, chapter: row.chapter, topic: row.topic, period: row.period ?? "Unscheduled",
    content: lessonContentSchema.parse(row.content),
  }));
  const [classes, workspaceSubjects, assignments, periods, timetable] = await Promise.all([
    database.select({ id: classSections.id, grade: classSections.grade, section: classSections.section, label: classSections.label, curriculumClassId: classSections.curriculumClassId }).from(classSections).where(and(eq(classSections.workspaceId, context.workspaceId), eq(classSections.active, true))),
    database.select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(eq(subjects.workspaceId, context.workspaceId), eq(subjects.active, true))),
    database.select({ id: teacherAssignments.id, classSectionId: teacherAssignments.classSectionId, subjectId: teacherAssignments.subjectId, curriculumSubjectId: teacherAssignments.curriculumSubjectId, curriculumSubjectName: curriculumSubjects.name, curriculumClassId: curriculumSubjects.classId })
      .from(teacherAssignments).leftJoin(curriculumSubjects, eq(teacherAssignments.curriculumSubjectId, curriculumSubjects.id)).where(and(eq(teacherAssignments.workspaceId, context.workspaceId), eq(teacherAssignments.teacherId, context.userId))),
    database.select({ id: timetablePeriods.id, label: timetablePeriods.label, ordinal: timetablePeriods.ordinal, startsAt: timetablePeriods.startsAt, endsAt: timetablePeriods.endsAt }).from(timetablePeriods).where(eq(timetablePeriods.workspaceId, context.workspaceId)),
    database.select({ id: timetableEntries.id, weekday: timetableEntries.weekday, periodId: timetableEntries.periodId, classSectionId: timetableEntries.classSectionId, subjectId: timetableEntries.subjectId }).from(timetableEntries).where(eq(timetableEntries.workspaceId, context.workspaceId)),
  ]);
  const curriculum = await curriculumRecordsForSubjects(assignments.flatMap((assignment) => assignment.curriculumSubjectId ? [assignment.curriculumSubjectId] : []));
  return { viewer: { name: context.name, email: context.email, image: context.image, workspaceName: workspace.name, schoolName: workspace.schoolName }, lessons: lessonList, classes, subjects: workspaceSubjects, assignments, periods: periods.sort((a, b) => a.ordinal - b.ordinal), timetable, curriculum };
}

const setupSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().max(180).optional().nullable(),
  displayName: z.string().trim().min(2).max(120),
  defaultDurationMinutes: z.number().int().min(20).max(120).default(45),
  classes: z.array(z.object({ curriculumClassId: z.string().uuid(), section: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(120).optional() })).min(1).max(30),
  assignments: z.array(z.object({ classIndex: z.number().int().min(0), curriculumSubjectId: z.string().uuid(), label: z.string().trim().min(2).max(120).optional() })).min(1).max(90),
  periods: z.array(z.object({ label: z.string().trim().min(1).max(50), startsAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), endsAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() })).min(1).max(12),
  timetable: z.array(z.object({ weekday: z.number().int().min(1).max(7), periodIndex: z.number().int().min(0), assignmentIndex: z.number().int().min(0) })).max(84).default([]),
});

export async function saveSetup(context: ViewerContext, input: unknown) {
  if (context.role !== "owner") throw new AuthorizationError("Only workspace owners can change setup.");
  const values = setupSchema.parse(normalizeOnboardingInput(input));
  const database = db();
  const curriculumClassIds = values.classes.map((item) => item.curriculumClassId);
  const curriculumSubjectIds = values.assignments.map((item) => item.curriculumSubjectId);
  const [canonicalClasses, canonicalSubjects] = await Promise.all([
    database.select({ id: curriculumClasses.id, name: curriculumClasses.name }).from(curriculumClasses).where(inArray(curriculumClasses.id, curriculumClassIds)),
    database.select({ id: curriculumSubjects.id, classId: curriculumSubjects.classId, name: curriculumSubjects.name }).from(curriculumSubjects).where(inArray(curriculumSubjects.id, curriculumSubjectIds)),
  ]);
  if (canonicalClasses.length !== new Set(curriculumClassIds).size) throw new Error("One or more selected classes are no longer in the verified curriculum.");
  if (canonicalSubjects.length !== new Set(curriculumSubjectIds).size) throw new Error("One or more selected subjects are no longer in the verified curriculum.");
  const canonicalClassById = new Map(canonicalClasses.map((item) => [item.id, item]));
  const canonicalSubjectById = new Map(canonicalSubjects.map((item) => [item.id, item]));
  const classAssignmentCounts = new Map<number, number>();
  for (const assignment of values.assignments) {
    const classEntry = values.classes[assignment.classIndex]; const subjectEntry = canonicalSubjectById.get(assignment.curriculumSubjectId);
    if (!classEntry || !subjectEntry || subjectEntry.classId !== classEntry.curriculumClassId) throw new Error("Each subject must belong to the selected canonical class.");
    classAssignmentCounts.set(assignment.classIndex, (classAssignmentCounts.get(assignment.classIndex) ?? 0) + 1);
  }
  if (values.classes.some((_, index) => !classAssignmentCounts.get(index))) throw new Error("Add at least one verified subject for every class section.");
  await database.update(workspaces).set({ name: values.workspaceName, schoolName: values.schoolName || null, onboardingCompletedAt: new Date(), updatedAt: new Date() }).where(eq(workspaces.id, context.workspaceId));
  await database.insert(teacherProfiles).values({ userId: context.userId, displayName: values.displayName, defaultDurationMinutes: values.defaultDurationMinutes, updatedAt: new Date() }).onConflictDoUpdate({ target: teacherProfiles.userId, set: { displayName: values.displayName, defaultDurationMinutes: values.defaultDurationMinutes, updatedAt: new Date() } });
  const classRows = await Promise.all(values.classes.map(async (item) => {
    const canonicalClass = canonicalClassById.get(item.curriculumClassId)!; const label = item.label || `${canonicalClass.name}-${item.section}`;
    const [row] = await database.insert(classSections).values({ workspaceId: context.workspaceId, grade: canonicalClass.name, section: item.section, label, curriculumClassId: canonicalClass.id }).onConflictDoUpdate({ target: [classSections.workspaceId, classSections.grade, classSections.section], set: { label, curriculumClassId: canonicalClass.id, active: true } }).returning();
    return row!;
  }));
  const assignmentRows = await Promise.all(values.assignments.map(async (assignment) => {
    const canonicalSubject = canonicalSubjectById.get(assignment.curriculumSubjectId)!; const classSection = classRows[assignment.classIndex]!; const name = assignment.label || canonicalSubject.name;
    const [row] = await database.insert(subjects).values({ workspaceId: context.workspaceId, name }).onConflictDoUpdate({ target: [subjects.workspaceId, subjects.name], set: { active: true } }).returning();
    await database.insert(teacherAssignments).values({ workspaceId: context.workspaceId, teacherId: context.userId, classSectionId: classSection.id, subjectId: row!.id, curriculumSubjectId: canonicalSubject.id }).onConflictDoUpdate({ target: [teacherAssignments.teacherId, teacherAssignments.classSectionId, teacherAssignments.subjectId], set: { curriculumSubjectId: canonicalSubject.id } });
    return row!;
  }));
  const periodRows = await Promise.all(values.periods.map(async (period, index) => {
    const [row] = await database.insert(timetablePeriods).values({ workspaceId: context.workspaceId, label: period.label, ordinal: index + 1, startsAt: period.startsAt || null, endsAt: period.endsAt || null }).onConflictDoUpdate({ target: [timetablePeriods.workspaceId, timetablePeriods.ordinal], set: { label: period.label, startsAt: period.startsAt || null, endsAt: period.endsAt || null } }).returning();
    return row!;
  }));
  for (const entry of values.timetable) {
    const period = periodRows[entry.periodIndex]; const assignment = values.assignments[entry.assignmentIndex]; const classSection = assignment ? classRows[assignment.classIndex] : undefined; const subject = assignment ? assignmentRows[entry.assignmentIndex] : undefined;
    if (!period || !classSection || !subject) continue;
    await database.insert(timetableEntries).values({ workspaceId: context.workspaceId, weekday: entry.weekday, periodId: period.id, classSectionId: classSection.id, subjectId: subject.id }).onConflictDoUpdate({ target: [timetableEntries.workspaceId, timetableEntries.weekday, timetableEntries.periodId], set: { classSectionId: classSection.id, subjectId: subject.id } });
  }
}

const createLessonSchema = z.object({ classSectionId: z.string().uuid(), subjectId: z.string().uuid(), topicId: z.string().uuid(), timetablePeriodId: z.string().uuid().nullable().optional(), date: z.string().date(), duration: z.number().int().min(20).max(120), special: z.string().max(600).optional(), approach: z.string().max(80).optional(), assessmentPreference: z.string().max(80).optional() });

async function ownedAssignment(context: ViewerContext, classSectionId: string, subjectId: string) {
  const database = db();
  const [[classSection], [assignment]] = await Promise.all([
    database.select().from(classSections).where(and(eq(classSections.id, classSectionId), eq(classSections.workspaceId, context.workspaceId))).limit(1),
    database.select({ curriculumSubjectId: teacherAssignments.curriculumSubjectId }).from(teacherAssignments).where(and(eq(teacherAssignments.workspaceId, context.workspaceId), eq(teacherAssignments.teacherId, context.userId), eq(teacherAssignments.classSectionId, classSectionId), eq(teacherAssignments.subjectId, subjectId))).limit(1),
  ]);
  if (!classSection || !assignment) throw new AuthorizationError("That class-subject teaching assignment is not part of this workspace.");
  if (!classSection.curriculumClassId || !assignment.curriculumSubjectId) throw new AuthorizationError("This teaching assignment needs a verified curriculum mapping before a lesson can be created.");
  return assignment.curriculumSubjectId;
}

export async function createLesson(context: ViewerContext, input: unknown) {
  const values = createLessonSchema.parse(input);
  const curriculumSubjectId = await ownedAssignment(context, values.classSectionId, values.subjectId);
  const [topic] = await db().select({
    id: curriculumTopics.id, topic: curriculumTopics.title, guidance: curriculumTopics.guidance, provenance: curriculumTopics.provenance, sourceUrl: curriculumTopics.sourceUrl,
    chapter: curriculumChapters.title, book: curriculumBooks.title, subject: curriculumSubjects.name, grade: curriculumClasses.name,
  }).from(curriculumTopics)
    .innerJoin(curriculumChapters, eq(curriculumTopics.chapterId, curriculumChapters.id))
    .innerJoin(curriculumBooks, eq(curriculumChapters.bookId, curriculumBooks.id))
    .innerJoin(curriculumSubjects, eq(curriculumBooks.subjectId, curriculumSubjects.id))
    .innerJoin(curriculumClasses, eq(curriculumSubjects.classId, curriculumClasses.id))
    .where(and(eq(curriculumTopics.id, values.topicId), eq(curriculumBooks.subjectId, curriculumSubjectId))).limit(1);
  if (!topic) throw new Error("The selected curriculum topic is unavailable.");
  const content = generateLesson({ ...topic, guidance: topic.guidance as Parameters<typeof generateLesson>[0]["guidance"] }, { duration: values.duration, special: values.special, approach: values.approach, assessmentPreference: values.assessmentPreference });
  const [lesson] = await db().insert(lessons).values({ workspaceId: context.workspaceId, teacherId: context.userId, classSectionId: values.classSectionId, subjectId: values.subjectId, topicId: values.topicId, timetablePeriodId: values.timetablePeriodId ?? null, lessonDate: values.date, durationMinutes: values.duration, content }).returning({ id: lessons.id });
  return lesson;
}

const updateLessonSchema = z.object({ content: lessonContentSchema.optional(), status: z.enum(["Draft", "Ready"]).optional(), date: z.string().date().optional(), timetablePeriodId: z.string().uuid().nullable().optional(), duration: z.number().int().min(20).max(120).optional() }).refine((value) => Object.keys(value).length > 0);

export async function updateLesson(context: ViewerContext, lessonId: string, input: unknown) {
  const values = updateLessonSchema.parse(input);
  const [existing] = await db().select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.workspaceId, context.workspaceId), isNull(lessons.deletedAt))).limit(1);
  if (!existing) throw new AuthorizationError("Lesson not found.");
  await db().update(lessons).set({
    ...(values.content ? { content: values.content } : {}),
    ...(values.status ? { status: values.status === "Ready" ? "ready" : "draft" } : {}),
    ...(values.date ? { lessonDate: values.date } : {}),
    ...(values.timetablePeriodId !== undefined ? { timetablePeriodId: values.timetablePeriodId } : {}),
    ...(values.duration ? { durationMinutes: values.duration } : {}),
    updatedAt: new Date(),
  }).where(eq(lessons.id, lessonId));
}

export async function duplicateLesson(context: ViewerContext, lessonId: string) {
  const [row] = await db().select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.workspaceId, context.workspaceId), isNull(lessons.deletedAt))).limit(1);
  if (!row) throw new AuthorizationError("Lesson not found.");
  const [copy] = await db().insert(lessons).values({ ...row, id: undefined, status: "draft", lessonDate: new Date().toISOString().slice(0, 10), createdAt: undefined, updatedAt: new Date(), deletedAt: null }).returning({ id: lessons.id });
  return copy;
}

export async function persistedLesson(context: ViewerContext, lessonId: string) {
  const bootstrap = await getWorkspaceBootstrap(context);
  const lesson = bootstrap.lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new AuthorizationError("Lesson not found.");
  return lesson;
}
