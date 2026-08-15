import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  classSections,
  curriculumBooks,
  curriculumChapters,
  curriculumClasses,
  curriculumSubjects,
  curriculumTopics,
  lessons,
  subjects,
  teacherProfiles,
  timetableEntries,
  timetablePeriods,
  users,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import type { CurriculumRecord, LessonRecord, WorkspaceBootstrap } from "@/lib/app-types";
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

async function curriculumRows(): Promise<CurriculumRecord[]> {
  const rows = await db().select({
    id: curriculumTopics.id, topic: curriculumTopics.title, guidance: curriculumTopics.guidance, provenance: curriculumTopics.provenance, sourceUrl: curriculumTopics.sourceUrl,
    chapter: curriculumChapters.title, book: curriculumBooks.title, subject: curriculumSubjects.name, grade: curriculumClasses.name,
  }).from(curriculumTopics)
    .innerJoin(curriculumChapters, eq(curriculumTopics.chapterId, curriculumChapters.id))
    .innerJoin(curriculumBooks, eq(curriculumChapters.bookId, curriculumBooks.id))
    .innerJoin(curriculumSubjects, eq(curriculumBooks.subjectId, curriculumSubjects.id))
    .innerJoin(curriculumClasses, eq(curriculumSubjects.classId, curriculumClasses.id));
  return rows.map((row) => ({ ...row, guidance: row.guidance as CurriculumRecord["guidance"] }));
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
  const [classes, workspaceSubjects, periods, timetable, curriculum] = await Promise.all([
    database.select({ id: classSections.id, grade: classSections.grade, section: classSections.section, label: classSections.label }).from(classSections).where(and(eq(classSections.workspaceId, context.workspaceId), eq(classSections.active, true))),
    database.select({ id: subjects.id, name: subjects.name }).from(subjects).where(and(eq(subjects.workspaceId, context.workspaceId), eq(subjects.active, true))),
    database.select({ id: timetablePeriods.id, label: timetablePeriods.label, ordinal: timetablePeriods.ordinal, startsAt: timetablePeriods.startsAt, endsAt: timetablePeriods.endsAt }).from(timetablePeriods).where(eq(timetablePeriods.workspaceId, context.workspaceId)),
    database.select({ id: timetableEntries.id, weekday: timetableEntries.weekday, periodId: timetableEntries.periodId, classSectionId: timetableEntries.classSectionId, subjectId: timetableEntries.subjectId }).from(timetableEntries).where(eq(timetableEntries.workspaceId, context.workspaceId)),
    curriculumRows(),
  ]);
  return { viewer: { name: context.name, email: context.email, image: context.image, workspaceName: workspace.name, schoolName: workspace.schoolName }, lessons: lessonList, classes, subjects: workspaceSubjects, periods: periods.sort((a, b) => a.ordinal - b.ordinal), timetable, curriculum };
}

const setupSchema = z.object({
  workspaceName: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().max(180).optional().nullable(),
  displayName: z.string().trim().min(2).max(120),
  defaultDurationMinutes: z.number().int().min(20).max(120).default(45),
  classes: z.array(z.object({ grade: z.string().trim().min(1).max(20), section: z.string().trim().min(1).max(20) })).min(1).max(30),
  subjects: z.array(z.string().trim().min(2).max(120)).min(1).max(30),
  periods: z.array(z.object({ label: z.string().trim().min(1).max(50), startsAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(), endsAt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() })).min(1).max(12),
  timetable: z.array(z.object({ weekday: z.number().int().min(1).max(7), periodIndex: z.number().int().min(0), classIndex: z.number().int().min(0), subjectIndex: z.number().int().min(0) })).max(84).default([]),
});

export async function saveSetup(context: ViewerContext, input: unknown) {
  if (context.role !== "owner") throw new AuthorizationError("Only workspace owners can change setup.");
  const values = setupSchema.parse(normalizeOnboardingInput(input));
  const database = db();
  await database.update(workspaces).set({ name: values.workspaceName, schoolName: values.schoolName || null, onboardingCompletedAt: new Date(), updatedAt: new Date() }).where(eq(workspaces.id, context.workspaceId));
  await database.insert(teacherProfiles).values({ userId: context.userId, displayName: values.displayName, defaultDurationMinutes: values.defaultDurationMinutes, updatedAt: new Date() }).onConflictDoUpdate({ target: teacherProfiles.userId, set: { displayName: values.displayName, defaultDurationMinutes: values.defaultDurationMinutes, updatedAt: new Date() } });
  const classRows = await Promise.all(values.classes.map(async (item) => {
    const label = `${item.grade}-${item.section}`;
    const [row] = await database.insert(classSections).values({ workspaceId: context.workspaceId, grade: item.grade, section: item.section, label }).onConflictDoUpdate({ target: [classSections.workspaceId, classSections.grade, classSections.section], set: { label, active: true } }).returning();
    return row!;
  }));
  const subjectRows = await Promise.all(values.subjects.map(async (name) => {
    const [row] = await database.insert(subjects).values({ workspaceId: context.workspaceId, name }).onConflictDoUpdate({ target: [subjects.workspaceId, subjects.name], set: { active: true } }).returning();
    return row!;
  }));
  const periodRows = await Promise.all(values.periods.map(async (period, index) => {
    const [row] = await database.insert(timetablePeriods).values({ workspaceId: context.workspaceId, label: period.label, ordinal: index + 1, startsAt: period.startsAt || null, endsAt: period.endsAt || null }).onConflictDoUpdate({ target: [timetablePeriods.workspaceId, timetablePeriods.ordinal], set: { label: period.label, startsAt: period.startsAt || null, endsAt: period.endsAt || null } }).returning();
    return row!;
  }));
  for (const entry of values.timetable) {
    const period = periodRows[entry.periodIndex]; const classSection = classRows[entry.classIndex]; const subject = subjectRows[entry.subjectIndex];
    if (!period || !classSection || !subject) continue;
    await database.insert(timetableEntries).values({ workspaceId: context.workspaceId, weekday: entry.weekday, periodId: period.id, classSectionId: classSection.id, subjectId: subject.id }).onConflictDoUpdate({ target: [timetableEntries.workspaceId, timetableEntries.weekday, timetableEntries.periodId], set: { classSectionId: classSection.id, subjectId: subject.id } });
  }
}

const createLessonSchema = z.object({ classSectionId: z.string().uuid(), subjectId: z.string().uuid(), topicId: z.string().uuid(), timetablePeriodId: z.string().uuid().nullable().optional(), date: z.string().date(), duration: z.number().int().min(20).max(120), special: z.string().max(600).optional(), approach: z.string().max(80).optional(), assessmentPreference: z.string().max(80).optional() });

async function ownedSetup(context: ViewerContext, classSectionId: string, subjectId: string) {
  const database = db();
  const [[classSection], [subject]] = await Promise.all([
    database.select().from(classSections).where(and(eq(classSections.id, classSectionId), eq(classSections.workspaceId, context.workspaceId))).limit(1),
    database.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.workspaceId, context.workspaceId))).limit(1),
  ]);
  if (!classSection || !subject) throw new AuthorizationError("That class or subject is not part of this workspace.");
}

export async function createLesson(context: ViewerContext, input: unknown) {
  const values = createLessonSchema.parse(input);
  await ownedSetup(context, values.classSectionId, values.subjectId);
  const topic = (await curriculumRows()).find((item) => item.id === values.topicId);
  if (!topic) throw new Error("The selected curriculum topic is unavailable.");
  const content = generateLesson(topic, { duration: values.duration, special: values.special, approach: values.approach, assessmentPreference: values.assessmentPreference });
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
