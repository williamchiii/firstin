-- WaitWise schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and CREATE POLICY IF NOT EXISTS equivalents.
-- Existing patients table: if it already exists with old columns, run the ALTER TABLE
-- block at the bottom to add the new columns without recreating it.

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- PATIENTS
-- identity + demographics + legacy triage snapshot
-- ============================================================

create table if not exists patients (
  id                  uuid primary key default gen_random_uuid(),

  -- auth / contact (new)
  auth_user_id        uuid references auth.users on delete set null,
  email               text unique,

  -- demographics
  name                text not null,
  language            text not null default 'en',
  patient_dob         date,

  -- legacy triage snapshot (kept for /api/intake backward compat)
  chief_complaint     text,
  symptoms            text,           -- CSV string (legacy)
  pain_level          int,
  esi_score           int,
  red_flags           text,
  clinical_rationale  text,

  -- queue
  status              text not null default 'waiting',
  queue_position      int,
  arrival_time        timestamptz not null default now(),

  created_at          timestamptz not null default now()
);

-- If patients table already exists, run these to add the new columns:
--   alter table patients add column if not exists auth_user_id uuid references auth.users on delete set null;
--   alter table patients add column if not exists email text unique;
--   alter table patients add column if not exists created_at timestamptz not null default now();


-- ============================================================
-- TRIAGE CASES
-- one row per voice intake session
-- ============================================================

create table if not exists triage_cases (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,

  -- voice capture
  transcript          text,
  parsed_json         jsonb,

  -- scoring
  esi_score           int check (esi_score between 1 and 5),
  chief_complaint     text,
  symptoms            text[],
  pain_level          int check (pain_level between 0 and 10),
  red_flags           text[],
  clinical_rationale  text,

  -- queue
  status              text not null default 'waiting'
                        check (status in ('waiting', 'in-treatment', 'discharged')),
  queue_position      int,
  arrival_time        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);


-- ============================================================
-- STAFF
-- nurses, doctors, admins — linked to Supabase auth users
-- ============================================================

create table if not exists staff (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users on delete cascade,
  email         text not null unique,
  full_name     text not null,
  role          text not null check (role in ('nurse', 'doctor', 'admin')),
  created_at    timestamptz not null default now()
);


-- ============================================================
-- CASE NOTES
-- staff notes on triage cases; triggers patient email (app layer)
-- ============================================================

create table if not exists case_notes (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references triage_cases(id) on delete cascade,
  staff_id    uuid not null references staff(id) on delete restrict,
  note        text not null,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists patients_auth_user_id_idx    on patients(auth_user_id);
create index if not exists patients_email_idx           on patients(email);
create index if not exists triage_cases_patient_id_idx  on triage_cases(patient_id);
create index if not exists triage_cases_status_esi_idx  on triage_cases(status, esi_score);
create index if not exists triage_cases_arrival_idx     on triage_cases(arrival_time);
create index if not exists case_notes_case_id_idx       on case_notes(case_id);
create index if not exists staff_auth_user_id_idx       on staff(auth_user_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Service role key (used in API routes) bypasses ALL RLS — no extra grants needed.
-- Anon key (used in browser client) is subject to these policies.

alter table patients      enable row level security;
alter table triage_cases  enable row level security;
alter table staff         enable row level security;
alter table case_notes    enable row level security;


-- ── helpers ──────────────────────────────────────────────────
-- Reusable inline check: is the calling user a staff member?
-- Used inside policy USING expressions.


-- ── patients ─────────────────────────────────────────────────

-- Patient reads their own row
create policy "patients: self select"
  on patients for select
  using (auth.uid() = auth_user_id);

-- Patient updates their own row (language, etc.)
create policy "patients: self update"
  on patients for update
  using (auth.uid() = auth_user_id);

-- Staff reads all patients
create policy "patients: staff select"
  on patients for select
  using (
    exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );

-- Staff updates all patients (status, queue_position, etc.)
create policy "patients: staff update"
  on patients for update
  using (
    exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );


-- ── triage_cases ──────────────────────────────────────────────

-- Patient reads their own cases
create policy "triage_cases: patient self select"
  on triage_cases for select
  using (
    exists (
      select 1 from patients
      where patients.id = triage_cases.patient_id
        and patients.auth_user_id = auth.uid()
    )
  );

-- Staff reads all cases
create policy "triage_cases: staff select"
  on triage_cases for select
  using (
    exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );

-- Staff updates cases (status, queue_position)
create policy "triage_cases: staff update"
  on triage_cases for update
  using (
    exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );


-- ── staff ──────────────────────────────────────────────────────

-- Staff reads their own row (needed for role checks on login)
create policy "staff: self select"
  on staff for select
  using (auth.uid() = auth_user_id);

-- Staff reads all staff rows (needed for notes attribution UI)
create policy "staff: all staff can read all"
  on staff for select
  using (
    exists (select 1 from staff s2 where s2.auth_user_id = auth.uid())
  );


-- ── case_notes ─────────────────────────────────────────────────

-- Patient reads notes on their own cases
create policy "case_notes: patient self select"
  on case_notes for select
  using (
    exists (
      select 1 from triage_cases tc
      join patients p on p.id = tc.patient_id
      where tc.id = case_notes.case_id
        and p.auth_user_id = auth.uid()
    )
  );

-- Staff reads all notes
create policy "case_notes: staff select"
  on case_notes for select
  using (
    exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );

-- Staff inserts notes (only as themselves — staff_id must match their own staff row)
create policy "case_notes: staff insert"
  on case_notes for insert
  with check (
    exists (
      select 1 from staff
      where staff.auth_user_id = auth.uid()
        and staff.id = case_notes.staff_id
    )
  );
