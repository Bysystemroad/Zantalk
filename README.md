# Zantalk

Zantalk is a mobile-first PWA voice-to-task assistant. Users record a task, OpenAI transcribes and parses it, then Supabase stores the structured reminder.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase Auth and Postgres
- OpenAI `gpt-4o-mini-transcribe` for speech-to-text
- OpenAI Responses API structured outputs for task parsing
- Browser PWA install support and local reminders

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Fill `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. In Supabase, create a project, enable email/password auth, and run the SQL migrations in order:

```text
supabase/migrations/001_create_tasks.sql
supabase/migrations/002_create_profiles.sql
```

5. Add these Supabase auth redirect URLs:

```text
http://localhost:3000/auth/confirm
http://localhost:3000/app
https://your-vercel-domain.vercel.app/auth/confirm
https://your-vercel-domain.vercel.app/app
```

6. Start development:

```bash
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Deploy On Vercel

Deploy as a standard Next.js project and add the same environment variables in Vercel. The app uses server-side route handlers for OpenAI, so `OPENAI_API_KEY` must remain server-only.

## MVP Notes

- Voice flow is record-then-parse through `/api/voice/parse`.
- Marketing landing page lives at `/`.
- Login lives at `/login`.
- The app dashboard lives at `/app`, voice capture/confirmation at `/app/new`, and completed history at `/app/history`.
- Pricing lives at `/pricing`.
- Missing parsed dates default to today in Europe/Berlin.
- Missing parsed times default to `10:00`.
- Local reminders use the browser notification permission and service worker display while the installed/open app can schedule timers. Guaranteed background push delivery is intentionally outside this MVP.

## Freemium Limits

Zantalk uses `public.profiles` to track each user's plan and daily voice usage.

- Free users can create 3 voice tasks per day.
- `daily_voice_count` resets automatically in server-side plan utilities when `last_voice_reset` is not today.
- The backend checks the limit before transcription/parsing and again before saving a voice-created task.
- When the limit is reached, APIs return:

```json
{
  "error": "Daily free limit reached",
  "code": "FREE_LIMIT_REACHED"
}
```

Premium users are identified by `plan = 'premium'` and an empty or future `premium_until`.

## Future Payments

Real Stripe or RevenueCat checkout is not implemented yet. The future integration points live in:

```text
src/lib/server/plans.ts
```

Use these placeholders when adding payments later:

- `startCheckout(planInterval)`
- `syncSubscriptionStatus(userId)`
