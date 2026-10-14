# NEXUS: AI Student Future Simulator

NEXUS is a student analytics and career-guidance application built with Next.js, Supabase, and Google Gemini. It helps students understand their current profile, explore career paths, and plan learning steps toward a selected career.

## Features

- Supabase student sign-in, linked student profiles, and faculty-managed academic metrics.
- Career matching, readiness analysis, skill gaps, recommendations, and future simulations.
- Four-phase career roadmaps with browser-local topic completion tracking.
- Topic-linked sample quizzes with results and explanations. Sample quizzes are static and are not AI-generated.
- Optional Gemini-generated student reports, with a labeled deterministic fallback when Gemini is unavailable or not configured.
- A faculty portal for managing academic records, subject to the external Supabase authorization and RLS configuration described below.

## Prerequisites

- Node.js 20.9 or newer.
- npm.
- A Supabase project configured with the tables used by the app: `student_users`, `students`, `academic_records`, and `faculty_users`.
- A Gemini API key if Gemini-generated reports are required. The report route has a deterministic fallback without it.

## Local Setup

Run these commands from the repository root:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create `.env.local` in the repository root or configure the same variable names in the deployment environment. `.env*` files are ignored by Git; do not force-add them.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
```

The Supabase URL and publishable key are client configuration. Keep `GEMINI_API_KEY` server-side. Never commit environment values, access tokens, service-role keys, or other credentials.

## Data and Authorization

Students sign in with Supabase Auth and are linked to a student record through `student_users`. The app reads linked identity from `students` and faculty-managed attendance, marks, and assignment completion from `academic_records`. The faculty portal checks membership in `faculty_users`. Missing academic values remain unavailable rather than being treated as zero. CGPA and personal profile details are student-reported; learning completion and quiz results are stored in that browser and do not sync across devices.

This repository does not include Supabase SQL migrations or RLS policy definitions. Configure and verify policies in Supabase before deployment. Students must only access their linked records, and faculty-only reads and writes must require authorized faculty membership. The UI membership check does not replace database-side RLS.

## Checks and Tests

```bash
npm run lint
npx tsc --noEmit
npm run test:engines
npm run build
```

`test:routes` checks the running application, including that the AI report endpoint rejects unauthenticated requests. Start the dev server in one terminal, then run this command from the repository root:

```bash
npm run test:routes
```

The route test defaults to `http://localhost:3000`; set `NEXUS_BASE_URL` to test another local URL. See [HACKATHON_DEMO_CHECKLIST.md](HACKATHON_DEMO_CHECKLIST.md) for the demo run-through.
