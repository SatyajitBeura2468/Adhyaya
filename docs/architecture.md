# Adhyaya architecture

## Request boundary

The browser holds only transient interface state. It calls authenticated Next.js route handlers; those handlers obtain the Neon Auth session, mirror the identity into the product `users` table, resolve workspace membership, validate input with Zod, and then query Neon PostgreSQL through Drizzle.

No route trusts a workspace ID, teacher ID, lesson body, or curriculum record supplied by the browser. Export requests contain a lesson ID only and resolve the persisted record after authorization.

## Data model

The initial migration creates:

- `users`, `teacher_profiles`, `workspaces`, and `workspace_members` for authenticated identity and roles;
- `class_sections`, `subjects`, `teacher_assignments`, `timetable_periods`, and `timetable_entries` for school setup;
- `curriculum_versions → curriculum_classes → curriculum_subjects → curriculum_books → curriculum_chapters → curriculum_topics` for versioned provenance;
- `lessons` for editable canonical content with relational class, subject, topic, period, workspace, and teacher references.

The lesson body is validated JSON because outcomes, teaching sequence, materials, assessment, assignment, and teacher notes need frequent teacher-led editing. The rest of the context stays relational so the library, timetable, planner, and authorization checks are queryable.

## Identity and sessions

Neon Auth is provisioned in the same Neon project. Its database-backed auth schema holds the identity/session source of truth; Adhyaya's `users.auth_user_id` is the stable bridge. Google OAuth is initiated by the custom sign-in screen through the Neon Auth client. The session cache cookie is httpOnly and signed with `NEON_AUTH_COOKIE_SECRET`.

The page is dynamic and redirects unsigned visitors to sign-in. A first authenticated visit creates a private owner workspace; incomplete setup redirects to onboarding. This avoids hardcoded people, profiles, dates, timetable slots, or sample lessons.

## Curriculum import contract

`scripts/import-curriculum.mjs` accepts one versioned JSON source with a complete nested hierarchy. It rejects malformed URLs, missing teaching guidance, malformed year/version values, and duplicate natural topic paths before any database operation. A SHA-256 checksum identifies the imported source version. Every level uses a unique natural key plus `ON CONFLICT` upserts, making re-runs safe.

`npm run curriculum:audit` validates and reports class, subject, book, chapter, and topic coverage without connecting to the database. The included file is explicitly scoped; more coverage must be derived and reviewed from official CBSE/NCERT documents before importing.

## Exports and generation

Generation is deterministic: duration selects a five-stage time budget, while verified curriculum guidance and optional teaching/assessment preferences determine the content. PDF uses React PDF, DOCX uses `docx`, and print uses the browser from the same saved record. None are alternative data stores.
