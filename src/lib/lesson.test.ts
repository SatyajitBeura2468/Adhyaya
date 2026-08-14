import { describe, expect, it } from "vitest";

import { generateLesson, type CurriculumTopic } from "./lesson";

const topic: CurriculumTopic = { id: "topic", grade: "Class VIII", subject: "Mathematics", book: "Mathematics", chapter: "Algebraic Expressions", topic: "Terms and coefficients", sourceUrl: "https://ncert.nic.in/example", provenance: "Test fixture", guidance: { concept: "terms and coefficients", outcomes: ["Identify a term."], activities: ["Sort expression cards."], materials: ["Cards"], checks: ["Ask one oral question."], assignment: "Write two expressions." } };

describe("deterministic lesson generation", () => {
  it("builds a complete 45-minute lesson from persisted curriculum guidance", () => { const lesson = generateLesson(topic, { duration: 45 }); expect(lesson.sequence.reduce((sum, item) => sum + item.minutes, 0)).toBe(45); expect(lesson.learningOutcomes).toEqual(["Identify a term."]); expect(lesson.materials).toEqual(["Cards"]); });
  it("makes selected teaching and assessment preferences part of the generated plan", () => { const lesson = generateLesson(topic, { duration: 45, approach: "Hands-on", assessmentPreference: "Exit slip" }); expect(lesson.sequence[1].method).toBe("Hands-on"); expect(lesson.assessment[0]).toContain("Exit slip"); });
  it("honours an explicit no-homework request", () => expect(generateLesson(topic, { duration: 45, special: "No homework today" }).assignment).toBeNull());
});
