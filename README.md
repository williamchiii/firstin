# FirstIn

> **"Because every second decides."**

FirstIn is an AI-powered emergency room pre-triage system built at HackaBull VII at the University of South Florida. Patients check in at a kiosk or on their phone, describe their symptoms in their native language, and are scored by a hybrid rule-based + Gemini AI engine in seconds. The nurse dashboard reorders the patient queue in real time — the sickest patient is always first.

Built to address the language barriers that lead to misclassification and worse outcomes for non-English speaking patients in emergency care — with support for Spanish, Haitian Creole, Portuguese, and Vietnamese.

---

## The Problem

| Stat | Reality |
|---|---|
| 2.5 hours | Average ER wait time in the US |
| 30% | ER visits that are non-urgent, delaying critical patients |
| 10–15 min | Lost per patient at manual front desk intake |
| 400,000+ | Spanish speakers in Hillsborough County alone |

---

## How It Works

1. **Patient arrives** — uses a hospital kiosk or their own phone
2. **Selects language** — English, Spanish, Haitian Creole, Portuguese, or Vietnamese
3. **Checks in** — via text form or AI voice conversation (ElevenLabs Conversational AI)
4. **Dynamic follow-up questions** — Gemini generates clinical follow-up questions tailored to the chief complaint
5. **Hybrid triage scoring** — deterministic rule-based scoring runs first; Gemini (`gemini-2.5-flash`) validates and refines the ESI score; the more conservative score always wins
6. **Queue reorders live** — nurse dashboard updates in real time via Supabase Realtime
7. **Patient receives audio confirmation** — ElevenLabs TTS speaks the wait category back to them in their language
8. **Patient tracks their status** — live queue position visible at `/patient/status`
9. **Nurse acts** — full triage card, red flag alerts, SOAP note generation, and prescription logging from a single dashboard

---

## ESI Scoring System

FirstIn uses a hybrid scoring approach — deterministic clinical rules run first, then a Gemini AI call validates and can override with a more conservative score.

| ESI | Label | Description |
|---|---|---|
| 1 | Immediate | Life-threatening — bypasses AI entirely |
| 2 | Emergent | High risk, could deteriorate fast |
| 3 | Urgent | Needs treatment, currently stable |
| 4 | Less Urgent | One resource needed |
| 5 | Non-Urgent | Could be seen at urgent care |

**Safety rules that cannot be overridden by AI:**
- ESI-1 keywords (chest pain, stroke, seizure, severe bleeding, unconscious) trigger an immediate hard-stop before any AI call
- ESI scores are server-side only — patients never see their score
- Nurse manual override wins over AI at all times
- If AI scoring fails, the patient still enters the queue with nurse review flagged

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, JavaScript) |
| Styling | Tailwind v4 + shadcn/ui |
| Database + Realtime | Supabase (PostgreSQL + Supabase Realtime) |
| AI triage scoring | Google Gemini API (`gemini-2.5-flash`) |
| Follow-up questions & SOAP notes | Google Gemini API (`gemini-2.0-flash`) |
| Voice intake | ElevenLabs Conversational AI |
| Multilingual TTS confirmation | ElevenLabs API (`eleven_multilingual_v2`) |
| Triage confirmation email | Resend |
| Deploy | Vercel |

---

## Features

- **Text or voice intake** — patients can fill in a form or speak to an AI voice agent
- **Multilingual support** — English, Spanish, Haitian Creole, Portuguese, Vietnamese
- **AI-powered follow-up questions** — Gemini generates dynamic clinical questions based on the chief complaint
- **Hybrid ESI scoring** — rule-based scoring with Gemini AI validation (most conservative score wins)
- **Wound photo analysis** — optional photo upload analyzed by Gemini for clinical description
- **Live staff dashboard** — real-time priority queue via Supabase Realtime
- **SOAP note generation** — one-click AI-generated clinical notes for each patient
- **Prescription logging** — authorized staff can issue and log prescriptions in the platform
- **Patient status tracking** — patients see their live queue position at `/patient/status`
- **Triage confirmation email** — Resend delivers a confirmation with ESI level and queue position
- **Multilingual audio confirmation** — ElevenLabs TTS reads out the wait category in the patient's language

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com) API key
- An [ElevenLabs](https://elevenlabs.io) API key and Conversational AI agent
- A [Resend](https://resend.com) account (for triage confirmation emails)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env.local
# Fill in your keys in .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server only, never expose to client |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS + voice intake) |
| `ELEVENLABS_AGENT_ID` | ElevenLabs Conversational AI agent ID (server-side) |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | ElevenLabs agent ID (client-side, for the voice widget) |
| `ELEVENLABS_MOCK_MODE` | Set to `true` to skip ElevenLabs TTS calls during local dev |
| `RESEND_API_KEY` | Resend API key for triage confirmation emails |
| `EMAIL_FROM` | Sender address for confirmation emails (default: `onboarding@resend.dev`) |
| `STAFF_ALLOWED_EMAILS` | Comma-separated emails permitted to access `/staff` |

---

