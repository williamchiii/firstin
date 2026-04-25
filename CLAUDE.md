# Hackabull VII

## Stack
- **Framework:** Next.js 16, App Router, JavaScript (no TypeScript)
- **Styling:** Tailwind v4 + shadcn/ui
- **Database:** MongoDB Atlas via `mongodb` driver
- **AI:** Gemini API via `@google/genai`
- **Deploy:** Vercel

## Conventions
- API routes → `src/app/api/`
- React components → `src/components/`
- DB + AI client helpers → `src/lib/`
- JS only — no TypeScript
- No new dependencies without checking with the team first

## Team
3 people working in parallel via feature branches and PRs.

## Code Conventions
- **Variables/functions:** camelCase — **Constants:** UPPER_SNAKE_CASE
- **Components:** PascalCase, one per file, file named after the component (`Button.jsx` → `export default function Button`)
- **Utility files:** kebab-case (`db-client.js`) — **Component files:** PascalCase (`UserCard.jsx`)
- Write JSDoc comments above any function that takes params or returns data
- Add a 1-line section comment above logical blocks (`// --- DB connection ---`) for scannability
- Tailwind classes only — no inline styles
- Prefer small reusable components over one giant page file; split when a component exceeds ~150 lines
- Pull repeated logic into `src/lib/` helpers

## Don't
- Push directly to `main` after the initial scaffold
- Commit `.env.local`
- Add features outside the agreed scope
