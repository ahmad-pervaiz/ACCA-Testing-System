-- ============================================================================
-- RISE School of Accountancy — ACCA CBT Examination System
-- Initial schema: users, mocks, questions, exam sessions, exam results
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS  (mirrors auth.users; role-based profile row)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  acca_id text unique,                 -- RISE/ACCA Student ID (students only)
  batch text,                          -- e.g. "Batch 2026-A", "Morning Batch"
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_batch on public.users(batch);
create index if not exists idx_users_acca_id on public.users(acca_id);

-- ----------------------------------------------------------------------------
-- 2. MOCKS  (a mock test / exam paper)
-- ----------------------------------------------------------------------------
create table if not exists public.mocks (
  id uuid primary key default gen_random_uuid(),
  mock_name text not null,                       -- "FA1 Mock 01"
  subject text not null,                          -- "FA1"
  teacher_id uuid references public.users(id) on delete set null,
  teacher_name text not null default 'Ali Pervaiz',
  time_limit_minutes int not null default 120,
  total_questions int not null default 50,
  total_marks int not null default 100,
  pass_percentage int not null default 50,
  instructions text,
  source_pdf_path text,                           -- Supabase Storage object path
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mocks_status on public.mocks(status);
create index if not exists idx_mocks_subject on public.mocks(subject);

-- Which batches a mock is assigned/visible to
create table if not exists public.mock_batches (
  mock_id uuid not null references public.mocks(id) on delete cascade,
  batch text not null,
  primary key (mock_id, batch)
);

-- ----------------------------------------------------------------------------
-- 3. QUESTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null references public.mocks(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  image_url text,                                 -- diagram extracted from PDF
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text,
  marks int not null default 2,
  unique (mock_id, question_number)
);

create index if not exists idx_questions_mock_id on public.questions(mock_id);

-- ----------------------------------------------------------------------------
-- 4. EXAM SESSIONS  (server-anchored timer + autosave, survives refresh/crash)
-- ----------------------------------------------------------------------------
create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null references public.mocks(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  current_question int not null default 1,
  responses jsonb not null default '{}'::jsonb,    -- { "1": "A", "2": "C", ... }
  flagged jsonb not null default '[]'::jsonb,       -- [1, 5, 12]
  submitted boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (mock_id, student_id)
);

create index if not exists idx_exam_sessions_student on public.exam_sessions(student_id);

-- ----------------------------------------------------------------------------
-- 5. EXAM RESULTS
-- ----------------------------------------------------------------------------
create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null references public.mocks(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  student_name text not null,
  acca_id text not null,
  batch text not null,
  marks_obtained int not null,
  total_marks int not null,
  percentage numeric(5,2) not null,
  correct_count int not null,
  incorrect_count int not null,
  unattempted_count int not null,
  time_taken_seconds int not null,
  submission_time timestamptz not null default now(),
  student_responses jsonb not null,               -- { "1": "A", "2": "C", ... }
  unique (mock_id, student_id)
);

create index if not exists idx_exam_results_mock on public.exam_results(mock_id);
create index if not exists idx_exam_results_student on public.exam_results(student_id);
create index if not exists idx_exam_results_batch on public.exam_results(batch);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mocks_updated_at on public.mocks;
create trigger trg_mocks_updated_at before update on public.mocks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_exam_sessions_updated_at on public.exam_sessions;
create trigger trg_exam_sessions_updated_at before update on public.exam_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users enable row level security;
alter table public.mocks enable row level security;
alter table public.mock_batches enable row level security;
alter table public.questions enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_results enable row level security;

-- Helper: is the current user a teacher?
create or replace function public.is_teacher()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'teacher'
  );
$$;

-- USERS -----------------------------------------------------------------
create policy "users_select_self" on public.users
  for select using (id = auth.uid());
create policy "users_select_teacher_all" on public.users
  for select using (public.is_teacher());
create policy "users_update_self" on public.users
  for update using (id = auth.uid());
create policy "users_insert_self" on public.users
  for insert with check (id = auth.uid());

-- MOCKS -------------------------------------------------------------------
create policy "mocks_select_published" on public.mocks
  for select using (status = 'published' or teacher_id = auth.uid() or public.is_teacher());
create policy "mocks_write_teacher" on public.mocks
  for all using (public.is_teacher()) with check (public.is_teacher());

-- MOCK_BATCHES --------------------------------------------------------------
create policy "mock_batches_select" on public.mock_batches
  for select using (true);
create policy "mock_batches_write_teacher" on public.mock_batches
  for all using (public.is_teacher()) with check (public.is_teacher());

-- QUESTIONS ------------------------------------------------------------------
-- Students never read this table directly (answer key lives here).
-- All exam-time question delivery goes through a trusted server action
-- (service role) that strips correct_option/explanation before sending to
-- the browser. Only teachers may SELECT questions directly.
create policy "questions_write_teacher" on public.questions
  for all using (public.is_teacher()) with check (public.is_teacher());

-- EXAM_SESSIONS ----------------------------------------------------------
create policy "exam_sessions_own" on public.exam_sessions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "exam_sessions_teacher_read" on public.exam_sessions
  for select using (public.is_teacher());

-- EXAM_RESULTS -----------------------------------------------------------
create policy "exam_results_select_own" on public.exam_results
  for select using (student_id = auth.uid());
create policy "exam_results_select_teacher" on public.exam_results
  for select using (public.is_teacher());
create policy "exam_results_insert_own" on public.exam_results
  for insert with check (student_id = auth.uid());

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('mock-pdfs', 'mock-pdfs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('question-images', 'question-images', true)
  on conflict (id) do nothing;

create policy "mock_pdfs_teacher_rw" on storage.objects
  for all using (bucket_id = 'mock-pdfs' and public.is_teacher())
  with check (bucket_id = 'mock-pdfs' and public.is_teacher());

create policy "question_images_public_read" on storage.objects
  for select using (bucket_id = 'question-images');
create policy "question_images_teacher_write" on storage.objects
  for insert with check (bucket_id = 'question-images' and public.is_teacher());
