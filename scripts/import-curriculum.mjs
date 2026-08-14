import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { z } from "zod";

const guidance = z.object({ concept: z.string().min(1), outcomes: z.array(z.string().min(1)).min(1), activities: z.array(z.string().min(1)).min(1), materials: z.array(z.string().min(1)).min(1), checks: z.array(z.string().min(1)).min(1), assignment: z.string().min(1) });
const topic = z.object({ title: z.string().min(1), ordinal: z.number().int().positive(), sourceUrl: z.url(), provenance: z.string().min(1), guidance });
const dataset = z.object({ board: z.string().min(1), academicYear: z.string().regex(/^\d{4}-\d{2}$/), sourceLabel: z.string().min(1), sourceUrl: z.url(), classes: z.array(z.object({ name: z.string().min(1), ordinal: z.number().int().positive(), subjects: z.array(z.object({ name: z.string().min(1), ordinal: z.number().int().positive(), books: z.array(z.object({ title: z.string().min(1), ordinal: z.number().int().positive(), sourceUrl: z.url(), chapters: z.array(z.object({ title: z.string().min(1), ordinal: z.number().int().positive(), sourceUrl: z.url(), topics: z.array(topic).min(1) })).min(1) })).min(1) })).min(1) })).min(1) });

const source = process.argv.find((value) => value.endsWith(".json")) ?? "data/curriculum/cbse-ncert-2026-27.json";
const auditOnly = process.argv.includes("--audit");
const raw = JSON.parse(await readFile(source, "utf8"));
const parsed = dataset.safeParse(raw);
if (!parsed.success) { console.error(JSON.stringify(parsed.error.flatten(), null, 2)); process.exit(1); }
const value = parsed.data;
const topicKeys = new Set(); let count = 0;
for (const classEntry of value.classes) for (const subject of classEntry.subjects) for (const book of subject.books) for (const chapter of book.chapters) for (const item of chapter.topics) { const key = [classEntry.name, subject.name, book.title, chapter.title, item.title].map((part) => part.trim().toLocaleLowerCase()).join("|"); if (topicKeys.has(key)) { console.error(`Duplicate curriculum topic: ${key}`); process.exit(1); } topicKeys.add(key); count++; }
const summary = { board: value.board, academicYear: value.academicYear, classes: value.classes.length, subjects: value.classes.reduce((total, item) => total + item.subjects.length, 0), books: value.classes.flatMap((item) => item.subjects).reduce((total, item) => total + item.books.length, 0), chapters: value.classes.flatMap((item) => item.subjects).flatMap((item) => item.books).reduce((total, item) => total + item.chapters.length, 0), topics: count, source: value.sourceUrl };
if (auditOnly) { console.log(JSON.stringify({ status: "valid", ...summary }, null, 2)); process.exit(0); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required to import a validated curriculum dataset."); process.exit(1); }
const checksum = createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await sql.begin(async (transaction) => {
    const [version] = await transaction`INSERT INTO curriculum_versions (board, academic_year, source_url, source_label, checksum) VALUES (${value.board}, ${value.academicYear}, ${value.sourceUrl}, ${value.sourceLabel}, ${checksum}) ON CONFLICT (board, academic_year, checksum) DO UPDATE SET source_url = EXCLUDED.source_url, source_label = EXCLUDED.source_label RETURNING id`;
    for (const classEntry of value.classes) {
      const [classRow] = await transaction`INSERT INTO curriculum_classes (version_id, name, ordinal) VALUES (${version.id}, ${classEntry.name}, ${classEntry.ordinal}) ON CONFLICT (version_id, name) DO UPDATE SET ordinal = EXCLUDED.ordinal RETURNING id`;
      for (const subject of classEntry.subjects) {
        const [subjectRow] = await transaction`INSERT INTO curriculum_subjects (class_id, name, ordinal) VALUES (${classRow.id}, ${subject.name}, ${subject.ordinal}) ON CONFLICT (class_id, name) DO UPDATE SET ordinal = EXCLUDED.ordinal RETURNING id`;
        for (const book of subject.books) {
          const [bookRow] = await transaction`INSERT INTO curriculum_books (subject_id, title, source_url, ordinal) VALUES (${subjectRow.id}, ${book.title}, ${book.sourceUrl}, ${book.ordinal}) ON CONFLICT (subject_id, title) DO UPDATE SET source_url = EXCLUDED.source_url, ordinal = EXCLUDED.ordinal RETURNING id`;
          for (const chapter of book.chapters) {
            const [chapterRow] = await transaction`INSERT INTO curriculum_chapters (book_id, title, ordinal, source_url) VALUES (${bookRow.id}, ${chapter.title}, ${chapter.ordinal}, ${chapter.sourceUrl}) ON CONFLICT (book_id, title) DO UPDATE SET ordinal = EXCLUDED.ordinal, source_url = EXCLUDED.source_url RETURNING id`;
            for (const item of chapter.topics) await transaction`INSERT INTO curriculum_topics (chapter_id, title, ordinal, guidance, provenance, source_url) VALUES (${chapterRow.id}, ${item.title}, ${item.ordinal}, ${transaction.json(item.guidance)}, ${item.provenance}, ${item.sourceUrl}) ON CONFLICT (chapter_id, title) DO UPDATE SET ordinal = EXCLUDED.ordinal, guidance = EXCLUDED.guidance, provenance = EXCLUDED.provenance, source_url = EXCLUDED.source_url`;
          }
        }
      }
    }
  });
  console.log(JSON.stringify({ status: "imported", checksum, ...summary }, null, 2));
} finally { await sql.end(); }
