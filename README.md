# FirstIn

> **"Because every second decides."**

FirstIn is an AI-powered emergency room pre-triage system built at HackaBull VII at the University of South Florida. Patients check in at a hospital kiosk, describe their symptoms in their native language, and are scored by three parallel Gemini AI agents in under 5 seconds. The nurse dashboard reorders the patient queue in real time — the sickest patient is always first.

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

1. **Patient arrives** — sits at a hospital-provided kiosk in the ER lobby
2. **Selects language** — English, Spanish, Haitian Creole, Portuguese, or Vietnamese
3. **Describes symptoms** — AI generates dynamic clinical follow-up questions based on their complaint
4. **Three Gemini agents score in parallel** — Symptom Agent, History Agent, and Triage Agent run concurrently and produce an ESI score in under 5 seconds
5. **Queue reorders live** — nurse dashboard updates instantly via Supabase Realtime
6. **Patient receives audio confirmation** — ElevenLabs speaks their wait category back to them in their native language
7. **Nurse acts** — full triage card, red flag alerts, and one-click SOAP report PDF generation
8. **After discharge** — personalized recovery instructions sent by email and audio in their language, SMS check-in one week later

---

## ESI Scoring System

FirstIn uses a hybrid scoring approach — deterministic clinical rules run first, then three Gemini agents validate and refine the result. The more conservative score always wins.

| ESI | Label | Severity Score | Description |
|---|---|---|---|
| 1 | Immediate | 80+ or hard-stop keyword | Life-threatening — bypasses AI entirely |
| 2 | Emergent | 55–79 | High risk, could deteriorate fast |
| 3 | Urgent | 35–54 | Needs treatment, currently stable |
| 4 | Less Urgent | 15–34 | One resource needed |
| 5 | Non-Urgent | Below 15 | Could be seen at urgent care |

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
| AI triage agents | Google Gemini API (gemini-1.5-pro) |
| Dynamic follow-up questions | Google Gemini API (gemini-1.5-flash) |
| Multilingual audio | ElevenLabs API (eleven_multilingual_v2) |
| Discharge email | Resend |
| SMS check-in | Twilio |
| Deploy | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com) API key
- An [ElevenLabs](https://elevenlabs.io) API key
- A [Twilio](https://twilio.com) account (for SMS check-in)
- A [Resend](https://resend.com) account (for discharge email)

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
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_MOCK_MODE` | Set to true to skip ElevenLabs calls during local dev |
| `USE_MOCK_GEMINI` | Set to true to use hardcoded AI responses for demo resilience |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sending phone number |
| `RESEND_API_KEY` | Resend API key for discharge emails |
| `STAFF_ALLOWED_EMAILS` | Comma-separated emails permitted to access /staff |

---

