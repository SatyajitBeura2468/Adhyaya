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

export type CurriculumRecord = {
  id: string;
  grade: string;
  subject: string;
  book: string;
  chapter: string;
  topic: string;
  guidance: { concept: string; outcomes: string[]; activities: string[]; materials: string[]; checks: string[]; assignment: string };
  provenance: string;
  sourceUrl: string;
};

export type PeriodRecord = { id: string; label: string; ordinal: number; startsAt: string | null; endsAt: string | null };
export type ClassRecord = { id: string; grade: string; section: string; label: string };
export type SubjectRecord = { id: string; name: string };

export type TimetableRecord = { id: string; weekday: number; periodId: string; classSectionId: string; subjectId: string };

export type WorkspaceBootstrap = {
  viewer: { name: string; email: string; image: string | null; workspaceName: string; schoolName: string | null };
  lessons: LessonRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  periods: PeriodRecord[];
  timetable: TimetableRecord[];
  curriculum: CurriculumRecord[];
};
