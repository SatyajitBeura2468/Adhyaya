import type { LessonContent } from "@/lib/lesson";

export type LessonRecord = {
  id: string;
  date: string;
  period: string;
  duration: number;
  classGroup: string;
  subject: string;
  chapter: string;
  topic: string;
  status: "Draft" | "Ready";
  updatedAt: string;
  content: LessonContent;
};

export type CurriculumTopicRecord = {
  id: string;
  chapterId: string;
  title: string;
  guidance: { concept: string; outcomes: string[]; activities: string[]; materials: string[]; checks: string[]; assignment: string };
  provenance: string;
  sourceUrl: string;
};

export type CurriculumChapterRecord = { id: string; bookId: string; title: string; ordinal: number };
export type CurriculumBookRecord = { id: string; curriculumSubjectId: string; title: string; ordinal: number; sourceUrl: string; sourceLabel: string | null; sourceType: string | null };
export type CurriculumSubjectRecord = { id: string; curriculumClassId: string; name: string; ordinal: number; canonicalKey: string | null; sourceUrl: string | null; provenance: string | null; sourceType: string | null };
export type CurriculumClassRecord = { id: string; name: string; ordinal: number; canonicalKey: string | null };

export type PeriodRecord = { id: string; label: string; ordinal: number; startsAt: string | null; endsAt: string | null };
export type ClassRecord = { id: string; grade: string; section: string; label: string; curriculumClassId: string | null };
export type SubjectRecord = { id: string; name: string };
export type AssignmentRecord = { id: string; classSectionId: string; subjectId: string; curriculumSubjectId: string | null; curriculumSubjectName: string | null; curriculumClassId: string | null };

export type TimetableRecord = { id: string; weekday: number; periodId: string; classSectionId: string; subjectId: string };

export type WorkspaceBootstrap = {
  viewer: { name: string; email: string; image: string | null; workspaceName: string; schoolName: string | null };
  lessons: LessonRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  assignments: AssignmentRecord[];
  periods: PeriodRecord[];
  timetable: TimetableRecord[];
  curriculum: { subjects: CurriculumSubjectRecord[]; books: CurriculumBookRecord[]; chapters: CurriculumChapterRecord[]; topics: CurriculumTopicRecord[] };
};

export type CurriculumSetupCatalogue = { classes: CurriculumClassRecord[]; subjects: CurriculumSubjectRecord[] };
