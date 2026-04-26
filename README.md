# FirstIn

FirstIn is a Next.js emergency room pre-triage app. Patients can check in through a text form or a voice intake flow, then staff can review a live queue sorted by Emergency Severity Index (ESI) priority.

The app was built for HackaBull and uses Supabase for patient data/auth, Gemini for clinical parsing and scoring, ElevenLabs for voice intake and audio, and Resend for confirmation emails.

## Features

- Patient-facing landing page and check-in flow
- Text intake form for demographics, symptoms, chief complaint, pain level, and language
- Voice intake flow powered by ElevenLabs Conversational AI
- Gemini transcript parsing, SOAP note generation, and ESI scoring
- Rule-based ESI fallback when AI scoring is unavailable
- Staff-only dashboard protected by Supabase Auth and an email allowlist
- Live queue updates through Supabase Realtime, with fallback polling
- Patient dashboard/status pages
- Confirmation emails through Resend
- Supabase schema for patients, triage cases, staff, and case notes
- Vitest coverage for triage and queue behavior

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Postgres, Auth, SSR, and Realtime
- Google Gemini API
- ElevenLabs Conversational AI and text-to-speech
- Resend
- Vitest

## Project Structure

```text
src/app/                  Next.js routes and API routes
src/app/api/intake        Text intake endpoint
src/app/api/voice         Voice token/finalization endpoints
src/app/api/queue         Staff queue endpoint
src/app/staff             Protected staff dashboard
src/app/patient           Patient login, dashboard, and status pages
src/lib                   Supabase, Gemini, ElevenLabs, triage, and validation helpers
src/components            Shared UI components
supabase/schema.sql       Database schema and RLS policies
tests                     Vitest tests
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- A Supabase project
- A Gemini API key
- An ElevenLabs API key and Conversational AI agent
- A Resend API key

### Install

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Run `supabase/schema.sql` in the Supabase SQL editor before using the app. The schema creates:

- `patients`
- `triage_cases`
- `staff`
- `case_notes`

It also enables row-level security and adds policies for patient and staff access.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=triage@firstin.local
STAFF_ALLOWED_EMAILS=
```

Useful optional variables used by the code:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_MODEL=gemini-2.5-flash
ELEVENLABS_MOCK_MODE=true
```

`STAFF_ALLOWED_EMAILS` should be a comma-separated list of staff emails allowed to access `/staff`.

## Scripts

```bash
npm run dev          # Start the development server
npm run build        # Build for production
npm run start        # Start the production server
npm run lint         # Run ESLint
npm run test         # Run Vitest once
npm run test:watch   # Run Vitest in watch mode
```

## Main Flows

1. A patient starts at `/` and clicks check in.
2. The patient chooses voice intake or typed intake at `/intake`.
3. The app validates the intake, scores acuity, and inserts a patient row in Supabase.
4. `/api/queue` returns patients ordered by `esi_score` and `arrival_time`.
5. Staff access `/staff`, sign in with Supabase Auth, and manage patient status from the dashboard.
6. Patients can use the patient pages to view their status and dashboard.

## Testing

Run the test suite with:

```bash
npm run test
```

Current tests cover intake validation, rule-based ESI scoring, queue reads, and patient status updates.
