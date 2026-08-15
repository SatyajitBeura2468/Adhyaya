import { describe, expect, it } from "vitest";

import { canonicalSubjectsForSection } from "./curriculum-selection";

const subject = (id: string, curriculumClassId: string, name: string) => ({ id, curriculumClassId, name, ordinal: 1, canonicalKey: id, sourceUrl: null, provenance: null, sourceType: null });
const classes = { nine: { id: "9-A", grade: "9th", section: "A", label: "9th-A", curriculumClassId: "class-9" }, twelve: { id: "12-Sci", grade: "12", section: "Sci", label: "12-Sci", curriculumClassId: "class-12" }, ten: { id: "10-B", grade: "10", section: "B", label: "10-B", curriculumClassId: "class-10" } };
const subjects = [subject("ix-maths", "class-9", "Mathematics"), subject("ix-science", "class-9", "Science"), subject("x-ai", "class-10", "Artificial Intelligence"), subject("x-maths", "class-10", "Mathematics"), subject("xii-bio", "class-12", "Biology")];

describe("canonical class subject selection", () => {
  it("uses a canonical class ID rather than a section name", () => {
    expect(canonicalSubjectsForSection(classes.nine, subjects, [])).toMatchObject([{ id: "ix-maths" }, { id: "ix-science" }]);
    expect(canonicalSubjectsForSection(classes.twelve, subjects, [])).toEqual([expect.objectContaining({ id: "xii-bio" })]);
  });
  it("keeps all Class X subjects, including Artificial Intelligence, available", () => expect(canonicalSubjectsForSection(classes.ten, subjects, [])).toEqual(expect.arrayContaining([expect.objectContaining({ id: "x-ai" }), expect.objectContaining({ id: "x-maths" })])));
  it("prioritises an assigned subject without using assignments as an availability gate", () => {
    const choices = canonicalSubjectsForSection(classes.nine, subjects, [{ id: "assignment", classSectionId: "9-A", subjectId: "workspace-subject", curriculumSubjectId: "ix-science", curriculumSubjectName: "Science", curriculumClassId: "class-9" }]);
    expect(choices.map((item) => item.id)).toEqual(["ix-science", "ix-maths"]);
  });
});
