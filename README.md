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

4. In Supabase, create a project, enable email/password auth, and run `supabase/migrations/001_create_tasks.sql` in the SQL editor.

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
- Missing parsed dates default to today in Europe/Berlin.
- Missing parsed times default to `10:00`.
- Local reminders use the browser notification permission and service worker display while the installed/open app can schedule timers. Guaranteed background push delivery is intentionally outside this MVP.
