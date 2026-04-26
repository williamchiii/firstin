# FirstIn

AI-powered emergency triage management — built at HackaBull VII.

Patients check in, describe their symptoms, and receive an instant ESI triage score. Staff see a live priority queue and can act on each case from a dedicated dashboard.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, JavaScript) |
| Styling | Tailwind v4 + shadcn/ui |
| Database & Auth | Supabase |
| AI triage | Google Gemini API |
| Text-to-speech | ElevenLabs API |
| Deploy | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com) API key
- An [ElevenLabs](https://elevenlabs.io) API key (optional — set `ELEVENLABS_MOCK_MODE=true` to skip)

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

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `STAFF_ALLOWED_EMAILS` | Comma-separated emails permitted to access `/staff` |

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes (intake, triage, queue, patients…)
│   ├── patient/      # Patient check-in flow
│   └── staff/        # Staff dashboard
├── components/       # Shared UI components
└── lib/              # DB helpers, AI clients, triage logic
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run Vitest tests
```

## Deployment

Deploy to [Vercel](https://vercel.com) in one click — set the same environment variables in your project settings and you're done.
