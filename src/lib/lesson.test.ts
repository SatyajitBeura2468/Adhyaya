import { describe, expect, it } from "vitest";
import { curriculumTopics } from "./curriculum";
import { generateLesson } from "./lesson";
describe("deterministic lesson generation",()=>{it("builds a complete 45-minute lesson from topic guidance",()=>{const lesson=generateLesson(curriculumTopics[0],{duration:45});expect(lesson.sequence.reduce((sum,item)=>sum+item.minutes,0)).toBe(45);expect(lesson.learningOutcomes.length).toBeGreaterThan(0);expect(lesson.materials.length).toBeGreaterThan(0)});it("honours the no-homework request",()=>expect(generateLesson(curriculumTopics[0],{duration:45,special:"No homework today"}).assignment).toBe("No homework for this lesson."))});
