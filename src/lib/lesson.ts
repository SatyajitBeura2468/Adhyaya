import { z } from "zod";

export const lessonContentSchema = z.object({
  title: z.string().min(1), learningOutcomes: z.array(z.string()).min(1),
  sequence: z.array(z.object({ title: z.string(), minutes: z.number(), teacherAction: z.string(), studentAction: z.string(), method: z.string() })).min(1),
  materials: z.array(z.string()), assessment: z.array(z.string()), assignment: z.string().optional(), teacherNotes: z.string().optional(),
});
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type CurriculumTopic = { id:string; grade:string; subject:string; book:string; chapter:string; topic:string; concept:string; outcomes:string[]; activities:string[]; materials:string[]; checks:string[]; assignment:string; provenance:string };
export type Lesson = { id:string; date:string; period:string; duration:number; classGroup:string; subject:string; chapter:string; topic:string; status:"Draft"|"Ready"; updatedAt:string; content:LessonContent };
const splitMinutes=(duration:number)=>duration<=35?[4,8,12,7,4]:duration<=45?[5,10,15,10,5]:[7,12,18,13,5];
export function generateLesson(topic:CurriculumTopic,input:Pick<Lesson,"duration">&{special?:string}):LessonContent{
  const [opening,explain,activity,check,recap]=splitMinutes(input.duration);
  return lessonContentSchema.parse({title:topic.topic,learningOutcomes:topic.outcomes,sequence:[
    {title:"Connect",minutes:opening,teacherAction:`Invite learners to recall what they already know about ${topic.concept.toLowerCase()}.`,studentAction:"Share one idea with a partner, then with the class.",method:"Discussion"},
    {title:"Explore",minutes:explain,teacherAction:`Introduce the core idea: ${topic.concept}`,studentAction:"Observe, listen and record key words or examples.",method:"Explanation"},
    {title:"Apply",minutes:activity,teacherAction:topic.activities[0]??"Guide a short, concrete practice activity.",studentAction:"Work in pairs or small groups and explain their thinking.",method:"Guided practice"},
    {title:"Check understanding",minutes:check,teacherAction:"Ask focused questions and notice misconceptions before moving on.",studentAction:"Respond individually, then compare a response with a peer.",method:"Formative check"},
    {title:"Close",minutes:recap,teacherAction:"Summarise the learning and connect it to the next lesson.",studentAction:"State one learning takeaway and one question they still have.",method:"Recap"}],
    materials:topic.materials,assessment:topic.checks,assignment:input.special?.toLowerCase().includes("no homework")?"No homework for this lesson.":topic.assignment,teacherNotes:input.special||undefined});
}
