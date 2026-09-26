# RISE School of Accountancy — ACCA CBT Examination System

A 100%-free Computer-Based Testing platform: the teacher creates mock exams
from JSON, students sit an authentic ACCA-style CBT with a tamper-resistant
timer and instant, itemized feedback, and the teacher gets one centralized,
filterable results view — with **no paid services anywhere** in the stack.

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router), React 19, TypeScript,
  Tailwind CSS v4, Server Actions
- **"Database":** Google Sheets, via a Google Apps Script Web App
  (`google-apps-script/Code.gs`) — completely free, no usage limits that a
  small school would ever hit
- **Auth:** a single hardcoded faculty account (email + server-side
  password), and real student accounts (email + salted-password-hash in a
  `Students` sheet, since RISE issues no institutional email to derive a
  login from) — both backed by a signed cookie, no auth provider
- **Exam timer:** server-anchored in a `Sessions` sheet — a student can
  refresh, close the tab, or switch devices and the countdown is exactly
  where it should be

## Why Google Apps Script is more than "a database"

Google Sheets has no Row Level Security, so `Code.gs` plays that role
itself — it's the real trust boundary, not just storage:

- `getMockForExam` **never returns `correct_option`/`explanation`** —
  those fields are stripped before the JSON leaves the script
- `submitExam` **re-reads the answer key itself and grades server-side** —
  it never trusts a score the browser sends
- Every teacher write (create/update/publish/archive a mock) requires
  `TEACHER_TOKEN`, a secret only this app's server ever holds
  (`GOOGLE_SCRIPT_TEACHER_TOKEN` — never sent to the browser, even though
  student-facing calls also go through Next.js's server, never directly
  from the browser, despite the `NEXT_PUBLIC_` prefix on the script URL)

## 1. Deploy the Google Apps Script backend

1. Create a new Google Sheet (sheets.new). **Extensions → Apps Script.**
2. Delete the default `Code.gs` contents and paste in the whole of
   `google-apps-script/Code.gs` from this repo.
3. Run the `setup` function once (function picker at the top → `setup` →
   ▶ Run). Grant the permissions it asks for.
4. Open **View → Executions** (or **View → Logs**) and copy the
   `TEACHER_TOKEN` value it printed.
5. **Deploy → New deployment → type "Web app"**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the Web app URL it gives you (ends in `/exec`).

Whenever you edit `Code.gs` afterwards, you must create a new deployment
(or a new version under **Manage deployments**) for the change to go live —
Apps Script Web Apps are versioned, not live-reloaded.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` — the Web app URL from step 1.6
- `GOOGLE_SCRIPT_TEACHER_TOKEN` — the token from step 1.4
- `TEACHER_PASSWORD` — pick a password for the one faculty login
- `SESSION_SECRET` — any long random string (`openssl rand -hex 32`)

## 3. Install & run

```bash
npm install
npm run dev
```

- Faculty: `/teacher/login` with `alipervaiz.ca269@gmail.com` (or whatever
  you set `NEXT_PUBLIC_TEACHER_EMAIL` to) + `TEACHER_PASSWORD`
- Students: `/student/register` once (Name, email, Student ID, batch,
  password), then `/student/login` with **email** + password. Students
  outside RISE (no RISE ID) can register too — pick "External /
  Self-Study" as the batch and make up any Student ID. Forgot password?
  `/student/forgot-password` emails a reset link via `MailApp` (free —
  sends through the deploying Google account's own Gmail).

> If your project directory lives on an NTFS/exFAT mount, `node_modules`
> there is extremely slow. Symlink it to a native-filesystem location
> instead: `mkdir -p ~/.cache/<project>-node_modules && ln -s ~/.cache/<project>-node_modules node_modules`.

## The trade-off, stated plainly

Students **are** authenticated — registration collects Name, a personal
email, a Student ID, batch, and a password; login checks **email** +
password against a salted hash stored in the `Students` sheet
(`google-apps-script/Code.gs` -> `hashPassword_`). Login is by email
rather than the Student ID specifically so students with no RISE ID can
still register and sit mocks. The one real trade-off: Apps Script has no
bcrypt/argon2 library, so the hash is salted SHA-256 — far better than
plaintext, but weaker than a proper password-hashing algorithm if the
underlying Sheet were ever exposed. For a school's practice-mock tool this
is a reasonable line to draw for a zero-infrastructure backend; it's not
what you'd want for anything holding real financial or personal data.
Duplicate exam attempts are still blocked (one result per mock+Student ID,
enforced in `Code.gs`), and the teacher's own account is a separate,
server-only password check.

Password reset never reveals whether an email is registered — asking for
a reset always responds the same way whether or not that address has an
account (`requestPasswordReset_` in `Code.gs`).

## Creating a mock (teacher)

Go to `/teacher/create-mock` and either drop a `.json` file or paste raw
JSON:

```json
{
  "mock_name": "FA1 Mock 01",
  "subject": "FA1",
  "time_limit_minutes": 120,
  "pass_percentage": 50,
  "questions": [
    {
      "question_number": 1,
      "question_text": "Which of the following is a current asset?",
      "option_a": "Land",
      "option_b": "Inventory",
      "option_c": "Goodwill",
      "option_d": "Machinery",
      "correct_option": "B",
      "explanation": "Inventory converts to cash within one operating cycle.",
      "marks": 2
    }
  ]
}
```

It's validated live (schema + duplicate question numbers) with a preview
before you can continue. After that you land on the review screen to
double-check questions, set the time limit/pass mark, assign batches, and
publish.

## Project structure

```
google-apps-script/Code.gs   The entire backend — deploy this to Google
src/
  app/
    student/                 Student sign-in (no password) + dashboard
    teacher/                 Faculty login, create-mock, review/edit, results
    exam/[mockId]/            Pre-exam screen, live CBT engine, result review
  components/
    ui/                       Small hand-rolled primitives
    shared/                    Brand header, portal shell/nav
  lib/
    actions/                   Server Actions (auth, mocks, exam)
    sheets.ts                  The only place that talks to Apps Script
    session.ts                 Signed-cookie session (HMAC-SHA256, no DB)
    mockSchema.ts               Zod schema for the teacher's JSON upload
    auth.ts, types.ts, constants.ts, utils.ts
  store/examStore.ts           Zustand store mirroring the live exam session
  proxy.ts                     Route protection by role (Next 16's renamed
                                "middleware" — reads the session cookie)
```
