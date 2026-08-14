import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["owner", "teacher"]);
export const lessonStatus = pgEnum("lesson_status", ["draft", "ready"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: text("name").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("users_auth_user_unique").on(table.authUserId), uniqueIndex("users_email_unique").on(table.email)]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  schoolName: text("school_name"),
  board: varchar("board", { length: 80 }).notNull().default("CBSE"),
  academicYear: varchar("academic_year", { length: 20 }).notNull().default("2026-27"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("teacher"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })]);

export const teacherProfiles = pgTable("teacher_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  defaultDurationMinutes: integer("default_duration_minutes").notNull().default(45),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const classSections = pgTable("class_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  grade: varchar("grade", { length: 20 }).notNull(),
  section: varchar("section", { length: 20 }).notNull(),
  label: text("label").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("class_sections_workspace_grade_section_unique").on(table.workspaceId, table.grade, table.section)]);

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: varchar("code", { length: 32 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("subjects_workspace_name_unique").on(table.workspaceId, table.name)]);

export const teacherAssignments = pgTable("teacher_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classSectionId: uuid("class_section_id").notNull().references(() => classSections.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("teacher_assignment_unique").on(table.teacherId, table.classSectionId, table.subjectId)]);

export const timetablePeriods = pgTable("timetable_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 50 }).notNull(),
  ordinal: integer("ordinal").notNull(),
  startsAt: time("starts_at"),
  endsAt: time("ends_at"),
}, (table) => [uniqueIndex("timetable_periods_workspace_ordinal_unique").on(table.workspaceId, table.ordinal)]);

export const timetableEntries = pgTable("timetable_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  weekday: smallint("weekday").notNull(),
  periodId: uuid("period_id").notNull().references(() => timetablePeriods.id, { onDelete: "cascade" }),
  classSectionId: uuid("class_section_id").notNull().references(() => classSections.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("timetable_entries_workspace_weekday_period_unique").on(table.workspaceId, table.weekday, table.periodId)]);

export const curriculumVersions = pgTable("curriculum_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  board: varchar("board", { length: 80 }).notNull(),
  academicYear: varchar("academic_year", { length: 20 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceLabel: text("source_label").notNull(),
  checksum: varchar("checksum", { length: 128 }).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("curriculum_version_unique").on(table.board, table.academicYear, table.checksum)]);

export const curriculumClasses = pgTable("curriculum_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => curriculumVersions.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 40 }).notNull(),
  ordinal: integer("ordinal").notNull(),
}, (table) => [uniqueIndex("curriculum_class_unique").on(table.versionId, table.name)]);

export const curriculumSubjects = pgTable("curriculum_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => curriculumClasses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ordinal: integer("ordinal").notNull(),
}, (table) => [uniqueIndex("curriculum_subject_unique").on(table.classId, table.name)]);

export const curriculumBooks = pgTable("curriculum_books", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull().references(() => curriculumSubjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  ordinal: integer("ordinal").notNull(),
}, (table) => [uniqueIndex("curriculum_book_unique").on(table.subjectId, table.title)]);

export const curriculumChapters = pgTable("curriculum_chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id").notNull().references(() => curriculumBooks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ordinal: integer("ordinal").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (table) => [uniqueIndex("curriculum_chapter_unique").on(table.bookId, table.title)]);

export const curriculumTopics = pgTable("curriculum_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  chapterId: uuid("chapter_id").notNull().references(() => curriculumChapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ordinal: integer("ordinal").notNull(),
  guidance: jsonb("guidance").notNull(),
  provenance: text("provenance").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (table) => [uniqueIndex("curriculum_topic_unique").on(table.chapterId, table.title)]);

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classSectionId: uuid("class_section_id").notNull().references(() => classSections.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  topicId: uuid("topic_id").notNull().references(() => curriculumTopics.id),
  timetablePeriodId: uuid("timetable_period_id").references(() => timetablePeriods.id),
  lessonDate: date("lesson_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: lessonStatus("status").notNull().default("draft"),
  content: jsonb("content").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
