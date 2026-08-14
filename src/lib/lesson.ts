import { z } from "zod";

export const lessonContentSchema = z.object({
  title: z.string().min(1).max(240),
  learningOutcomes: z.array(z.string().min(1)).min(1),
  sequence: z.array(z.object({ title: z.string(), minutes: z.number().int().positive(), teacherAction: z.string(), studentAction: z.string(), method: z.string() })).min(1),
  materials: z.array(z.string()),
  assessment: z.array(z.string()),
  assignment: z.string().nullable().optional(),
  teacherNotes: z.string().nullable().optional(),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;
export type CurriculumTopic = {
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

const splitMinutes = (duration: number) => duration <= 35 ? [4, 8, 12, 7, 4] : duration <= 45 ? [5, 10, 15, 10, 5] : [7, 12, 18, 13, 5];

export function generateLesson(topic: CurriculumTopic, input: { duration: number; special?: string; approach?: string; assessmentPreference?: string }): LessonContent {
  const durations = splitMinutes(input.duration);
  const special = input.special?.trim();
  const approach = input.approach ? ` Use a ${input.approach.toLowerCase()} approach.` : "";
  const assessment = input.assessmentPreference ? `${input.assessmentPreference}: ${topic.guidance.checks[0] ?? "Observe learner explanations."}` : topic.guidance.checks[0] ?? "Observe learner explanations.";
  return lessonContentSchema.parse({
    title: `${topic.topic}: ${topic.chapter}`,
    learningOutcomes: topic.guidance.outcomes,
    sequence: [
      { title: "Connect", minutes: durations[0], method: "Retrieval", teacherAction: `Invite learners to recall what they already know about ${topic.guidance.concept}.${approach}`, studentAction: "Share a prior example or observation." },
      { title: "Explore", minutes: durations[1], method: input.approach ?? "Guided inquiry", teacherAction: topic.guidance.activities[0] ?? `Model the central idea: ${topic.guidance.concept}.`, studentAction: "Work with the example and explain a first observation." },
      { title: "Apply", minutes: durations[2], method: "Practice", teacherAction: `Guide pairs through a short application of ${topic.topic}.`, studentAction: "Solve, create, or demonstrate an application and compare reasoning." },
      { title: "Check understanding", minutes: durations[3], method: input.assessmentPreference ?? "Formative assessment", teacherAction: assessment, studentAction: "Respond independently and revise if needed." },
      { title: "Close", minutes: durations[4], method: "Reflection", teacherAction: "Ask learners to state the key idea and one remaining question.", studentAction: "Complete an exit reflection." },
    ],
    materials: topic.guidance.materials,
    assessment: [assessment, ...(topic.guidance.checks.slice(1))],
    assignment: special?.toLowerCase().includes("no homework") ? null : topic.guidance.assignment,
    teacherNotes: special || null,
  });
}
