import type { AssignmentRecord, ClassRecord, CurriculumSubjectRecord } from "@/lib/app-types";

export function canonicalSubjectsForSection(section: ClassRecord | undefined, subjects: CurriculumSubjectRecord[], assignments: AssignmentRecord[]) {
  if (!section?.curriculumClassId) return [];
  const assigned = new Set(assignments.filter((assignment) => assignment.classSectionId === section.id && assignment.curriculumSubjectId).map((assignment) => assignment.curriculumSubjectId));
  return subjects.filter((subject) => subject.curriculumClassId === section.curriculumClassId).sort((left, right) => Number(assigned.has(right.id)) - Number(assigned.has(left.id)) || left.name.localeCompare(right.name));
}
