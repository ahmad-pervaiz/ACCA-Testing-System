# RISE School of Accountancy — ACCA CBT Examination System

A production-lean Computer-Based Testing platform: teachers upload PDF mock
papers and Claude converts them into structured MCQ exams; students sit an
authentic ACCA-style CBT with a tamper-resistant timer and get instant,
itemized feedback; teachers get one centralized, filterable results view
across every mock and batch.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js Server Actions + Supabase (Postgres, Auth, Storage)
- **AI extraction:** Claude (`claude-sonnet-5`) via `@anthropic-ai/sdk`, reading
  the PDF directly (native document understanding) and returning strict,
  schema-validated JSON (Zod + `output_config.format`)
- **Exam timer:** Server-anchored — the countdown deadline lives in
  `exam_sessions.deadline_at` in Postgres, not just the browser. A student can
  refresh, close the tab, or switch devices and the timer is exactly where it
  should be. Zustand + `localStorage` mirrors it locally for instant UI, but
  the server value is always what's graded against.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`. This creates
   every table, Row Level Security policy, and the two storage buckets
   (`mock-pdfs` private, `question-images` public).
3. In **Authentication → Providers → Email**, turn **off** "Confirm email" —
   students log in with a Student ID, not a real inbox (see below), so email
   confirmation links would never be delivered. (Registration also
   pre-confirms accounts server-side via the admin API either way, but
   disabling it avoids surprises if you create accounts by hand in the
   dashboard.)
4. Copy your Project URL, anon key, and service role key into `.env.local`
   (copy `.env.local.example` → `.env.local` first).

### Why students log in with an ID, not an email

Supabase Auth requires an email address. Students authenticate with their
RISE/ACCA Student ID, so the app deterministically derives an internal email
(`rise-2026-0001@students.rise.local`) from the ID — see
`src/lib/auth.ts::emailFromAccaId`. It's never shown to the student and
never used to contact anyone; it only exists so Supabase Auth has something
to key on.

## 2. Set up Anthropic

Add `ANTHROPIC_API_KEY` to `.env.local`. The extraction prompt and schema
live in `src/lib/anthropic.ts`.

## 3. Install & run

```bash
npm install
cp .env.local.example .env.local   # fill in the values above
npm run seed                        # creates the demo accounts below
npm run dev
```

> If your project directory lives on an NTFS/exFAT mount, `node_modules`
> there is extremely slow (thousands of tiny files over a non-native
> filesystem). Symlink it to a native-filesystem location instead, e.g.:
> `mkdir -p ~/.cache/<project>-node_modules && ln -s ~/.cache/<project>-node_modules node_modules`.

## Demo credentials

`npm run seed` creates one faculty account and one student account using the
`SEED_*` values in `.env.local` (defaults shown below — **change these
before deploying anywhere real**):

| Role    | Login              | Value                    | Password       |
| ------- | ------------------ | ------------------------ | -------------- |
| Teacher | Faculty email       | `ali.pervaiz@riseacademy.edu.pk` | `ChangeMe123!` |
| Student | RISE/ACCA Student ID| `RISE-2026-0001`         | `ChangeMe123!` |

Students can also self-register at `/student/register` (ID + name + batch +
password). Faculty accounts are provisioned by an administrator — either via
`npm run seed` / the seed script's env vars for more teachers, or directly in
the Supabase dashboard (create the `auth.users` row, then insert a matching
`public.users` row with `role = 'teacher'`).

## How the pieces fit together

- **Answer-key security:** the `questions` table (which holds
  `correct_option`/`explanation`) has no student-facing RLS policy at all.
  Every place a student needs exam content — taking the exam, reviewing
  results — goes through a Server Component or Server Action using the
  Supabase **service role** client (`src/lib/supabase/admin.ts`), which
  explicitly selects only the safe columns and strips the rest before the
  data is ever serialized to the browser.
- **Timer:** `beginExam` (`src/lib/actions/exam.ts`) creates the
  `exam_sessions` row with `deadline_at = now() + time_limit_minutes` on
  first visit. The exam client (`src/app/exam/[mockId]/take/exam-room.tsx`)
  computes remaining time from that timestamp every second and auto-submits
  at zero. Progress (answers, flags, current question) autosaves to the same
  row every 15s and on `beforeunload`.
- **Grading:** `submitExam` re-fetches the answer key server-side and scores
  the submission there — the client never sees `correct_option` before
  submitting, so there's nothing to tamper with in the browser.
- **PDF → MCQs:** `uploadAndParsePdf` (`src/lib/actions/mocks.ts`) stores the
  original PDF in the `mock-pdfs` bucket, sends it to Claude as a `document`
  content block, and inserts the parsed questions as a `draft` mock. Nothing
  is visible to students until the teacher reviews it at
  `/teacher/review/[mockId]` and clicks Publish.

## Project structure

```
src/
  app/
    student/              Student auth + dashboard
    teacher/               Faculty auth, upload, review/edit, results
    exam/[mockId]/          Pre-exam screen, live CBT engine, result review
  components/
    ui/                    Small hand-rolled primitives (button, card, dialog, …)
    shared/                 Brand header, portal shell/nav
  lib/
    actions/                Server Actions (auth, mocks, exam)
    supabase/               Browser / server / admin (service-role) clients
    anthropic.ts            PDF → structured MCQ extraction
    scoring.ts               Grading logic
    auth.ts, types.ts, constants.ts, utils.ts
  store/examStore.ts        Zustand store mirroring the live exam session
supabase/migrations/0001_init.sql
scripts/seed.ts
```
