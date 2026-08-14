# Adhyaya

Adhyaya is a production lesson-planning workspace for CBSE teachers: sign in with Google, configure the classes and timetable you actually teach, choose a verified curriculum topic, generate a deterministic lesson, edit it, and export it as PDF, DOCX, or print.

## Production architecture

`Google sign-in → Neon Auth database session → server-side workspace authorization → Neon PostgreSQL / Drizzle → authenticated lesson/export routes`

- Neon Auth provides managed Google OAuth and database-backed sessions in the same Neon project.
- The app mirrors each authenticated account in `users`, then scopes every read/write to a `workspace_members` row on the server.
- First sign-in creates a private workspace. Onboarding persists the teacher profile, school, classes/sections, subjects, teaching periods, and optional weekly timetable.
- Lesson content is Zod-validated structured JSON alongside relational class, subject, topic, period, teacher, and workspace references.
- PDF and DOCX routes accept only a saved lesson ID and retrieve the authorized record on the server; the browser cannot export an arbitrary client payload.
- No runtime model provider or API key is used. Lesson generation is deterministic from structured curriculum guidance, duration, and the selected approach/assessment preference.

See [architecture documentation](docs/architecture.md) for the data model and authorization boundary.

## Curriculum data

Curriculum data lives in structured JSON under `data/curriculum/`, never in React. The included 2026–27 dataset is an official-source-backed Class VIII Mathematics release with 16 ordered NCERT chapter records. It is deliberately labelled to its source and is not a claim of nationwide coverage. Add further class/subject datasets only after verifying their chapter/topic hierarchy from the current official source.

```bash
npm run curriculum:audit
npm run curriculum:import
```

The importer validates the complete hierarchy, rejects malformed or duplicate topic paths, records a source checksum/version, and upserts safely on reruns. It will refuse to run without `DATABASE_URL`.

Official source roots:

- [NCERT textbook catalogue](https://www.ncert.nic.in/textbook.php?iesc1=0-12)
- [NCERT Class VIII booklet](https://www.ncert.nic.in/pdf/BookletClass8.pdf)
- [CBSE curriculum portal](https://cbseacademic.nic.in/curriculum_2027.html)

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

All three values are server-only. `NEON_AUTH_COOKIE_SECRET` must be a stable random value of at least 32 characters and must remain unchanged after deployment. Configure the same values as sensitive environment variables in Vercel.

For a live deployment, add every browser origin used as an OAuth `callbackURL` under **Neon Console → Auth → Configuration → Domains** (with `https://` and no trailing slash). In Google Cloud, the provider redirect URI is the branch-specific `${NEON_AUTH_BASE_URL}/callback/google` - not the Vercel URL. Adhyaya uses `src/proxy.ts` with the official Neon Auth middleware so the OAuth verifier is exchanged for app-domain session cookies before a protected page renders.

## Development and verification

```bash
npm install
npm run db:generate
npm run curriculum:audit
npm run lint
npm test
npm run build
```

Run `npm run db:migrate` against a fresh or controlled database only. The committed migration is an initial schema; do not point it at an unrelated database.
