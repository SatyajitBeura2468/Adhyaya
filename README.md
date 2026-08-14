# Adhyaya

Adhyaya is a calm, structured lesson-planning workspace for CBSE teachers. It makes the essential path deliberately short: select a class, subject, chapter and topic; generate an editable plan; save, reuse and export it.

## Product approach

- No runtime AI, paid-model integration or AI keys. Plans are generated deterministically from curated topic guidance.
- Curriculum data is versioned and carries source provenance. The intended production source layer is CBSE/NCERT.
- Lessons are canonical structured JSON; PDF, DOCX, print and teacher-facing views are representations of that same data.
- The teacher UI stays simple while curriculum coverage, source audits and school configuration remain behind the scenes.

## Current preview

The included preview is a fully interactive local/demo runtime with five curated CBSE/NCERT-aligned topics. It supports dependent selection, timed deterministic drafts, editing, save status, draft/ready, timetable prefill, search, reuse, weekly planner and PDF/DOCX/print exports. It deliberately does **not** present the seed as complete nationwide curriculum coverage.

## Architecture

Next.js App Router + TypeScript provides the product surface and server-side export routes. PostgreSQL/Neon is represented through Drizzle schema and committed SQL migrations. The production data boundary is:

`Browser → authenticated server action/route → Zod validation + workspace authorization → PostgreSQL`

See [architecture documentation](docs/architecture.md) for the domain model, migration plan and deployment requirements.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
npm run lint
npm test
npm run build
```

## Database and curriculum import

1. Create a dedicated Neon PostgreSQL project and set `DATABASE_URL` in `.env.local` and Vercel.
2. Apply the committed migration with `npm run db:migrate`.
3. Import only source-attributed curriculum records with `npm run curriculum:import -- path/to/curriculum.json`.
4. Run the coverage audit before claiming a grade/subject/version is supported.

The importer rejects missing provenance and detects duplicate natural keys. Production seed/import work must use current official CBSE and NCERT records, not frontend arrays or one school’s spreadsheet.

## Authentication and deployment

The production design uses Google sign-in with a database-backed session and workspace membership checks. Configure `AUTH_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only in the deployment environment; never commit them. Deploy to Vercel after database and OAuth configuration are complete.

## Validation

The generator has unit tests for timing and special constraints. The application is linted, production-built and visually checked at desktop/mobile before release. Add E2E coverage against an authenticated Neon environment before calling the database-backed product V1 complete.
