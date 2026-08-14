# Adhyaya architecture

## Foundation plan

The UI is intentionally teacher-first: Home, Create, My Plans, Planner and Settings are the only ordinary-teacher surfaces. Administrators gain school configuration later; a personal teacher must be able to begin after a minimal onboarding step.

## Curriculum and provenance

`curriculum_versions` identifies a source and academic year. `curriculum_topics` stores grade, subject, book, ordered chapter/topic and structured guidance. The natural-key unique index prevents accidental duplicate topics. A school’s class group (for example `VIII-B`) is deliberately separate from curriculum grade (`Class VIII`).

The import contract requires `sourceUrl`, grade, subject, book, chapter and topic. It reports valid, duplicate and invalid records rather than silently discarding data. Official input sources currently identified are NCERT’s textbook catalogue and CBSE’s 2026–27 curriculum page. Topic guidance may be curated but must say so in provenance.

## Canonical lesson

Every lesson persists relational context and a Zod-validated content object containing title, outcomes, timed sequence, materials, assessment, assignment and teacher notes. This avoids both a spreadsheet-shaped mega-table and over-normalisation of editable lesson prose. Export routes render from the same object.

## Generation

The deterministic generator takes verified topic guidance and lesson duration. It computes a proportionate five-stage teaching sequence, carries over curriculum outcomes/materials/checks and honours simple constraints such as no homework. There is no runtime model provider.

## Security and persistence completion gate

Production mutations must authenticate the user, look up workspace membership server-side, validate selected curriculum relationships and write only inside that workspace. The prepared Drizzle schema and SQL migration establish the essential foreign keys and unique constraints. Neon credentials and Google OAuth credentials are intentionally not in this repository, so persistence/auth are a deploy-time integration gate rather than a client-side imitation.

## Exports

PDF uses React PDF in a Node route, DOCX uses the `docx` package, and teaching copy invokes the browser print pathway. These are generated from lesson data on demand rather than being treated as the lesson itself.
