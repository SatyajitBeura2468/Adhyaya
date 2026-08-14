import { Document as DocxDocument, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { Document as PdfDocument, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { createElement } from "react";
import { z } from "zod";

import type { LessonRecord } from "@/lib/app-types";
import { AuthorizationError, persistedLesson, requireViewer } from "@/lib/dal";

export const runtime = "nodejs";
const styles = StyleSheet.create({ page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#182a22" }, brand: { fontSize: 22, fontFamily: "Times-Roman", marginBottom: 6 }, meta: { color: "#ae4c2d", fontSize: 9, marginBottom: 16 }, heading: { fontSize: 15, fontFamily: "Times-Roman", marginTop: 14, marginBottom: 6 }, item: { lineHeight: 1.55, marginBottom: 5 }, row: { borderBottom: "1 solid #d8d4c9", paddingVertical: 7 }, time: { color: "#ae4c2d", fontSize: 9, marginBottom: 2 } });
const exportRequest = z.object({ lessonId: z.string().uuid() });

function lessonText(lesson: LessonRecord) { return ["Adhyaya — Official Lesson Note", lesson.content.title, `${lesson.classGroup} · ${lesson.subject} · ${lesson.date} · ${lesson.period} · ${lesson.duration} minutes`, "Learning outcomes", ...lesson.content.learningOutcomes.map((item) => `• ${item}`), "Teaching sequence", ...lesson.content.sequence.flatMap((item) => [`${item.minutes} min · ${item.title}`, item.teacherAction, `Students: ${item.studentAction}`]), "Materials / TLM", ...lesson.content.materials.map((item) => `• ${item}`), "Assessment", ...lesson.content.assessment.map((item) => `• ${item}`), "Assignment", lesson.content.assignment ?? "—"]; }
function pdfTree(lesson: LessonRecord) { const section = (title: string, items: string[]) => createElement(View, { key: title }, createElement(Text, { style: styles.heading }, title), ...items.map((item, index) => createElement(Text, { key: index, style: styles.item }, `• ${item}`))); return createElement(PdfDocument, null, createElement(Page, { size: "A4", style: styles.page }, createElement(Text, { style: styles.brand }, "Adhyaya"), createElement(Text, { style: styles.meta }, `OFFICIAL LESSON NOTE  ·  ${lesson.classGroup}  ·  ${lesson.subject}  ·  ${lesson.date}  ·  ${lesson.period}`), createElement(Text, { style: { fontSize: 22, fontFamily: "Times-Roman" } }, lesson.content.title), section("Learning outcomes", lesson.content.learningOutcomes), createElement(Text, { style: styles.heading }, "Teaching sequence"), ...lesson.content.sequence.map((item, index) => createElement(View, { key: index, style: styles.row }, createElement(Text, { style: styles.time }, `${item.minutes} MIN · ${item.title.toUpperCase()} · ${item.method}`), createElement(Text, { style: styles.item }, item.teacherAction), createElement(Text, { style: styles.item }, `Students: ${item.studentAction}`))), section("Materials / TLM", lesson.content.materials), section("Assessment", lesson.content.assessment), section("Assignment", [lesson.content.assignment ?? "—"]))); }

export async function POST(request: Request) {
  try {
    const { lessonId } = exportRequest.parse(await request.json());
    const lesson = await persistedLesson(await requireViewer(), lessonId);
    if (new URL(request.url).searchParams.get("format") === "docx") {
      const document = new DocxDocument({ sections: [{ children: lessonText(lesson).map((line, index) => new Paragraph({ heading: index === 0 ? HeadingLevel.TITLE : [3, 6, 12, 15, 18].includes(index) ? HeadingLevel.HEADING_2 : undefined, children: [new TextRun(line)] })) }] });
      const buffer = await Packer.toBuffer(document);
      return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": "attachment; filename=lesson-plan.docx" } });
    }
    const buffer = await renderToBuffer(pdfTree(lesson));
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=lesson-plan.pdf" } });
  } catch (error) { return Response.json({ message: "We couldn't prepare this export. Your lesson is still safe." }, { status: error instanceof AuthorizationError ? 403 : 400 }); }
}
