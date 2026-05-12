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
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. In Supabase, create a project, enable email/password auth, and run the SQL migrations in order:

```text
supabase/migrations/001_create_tasks.sql
supabase/migrations/002_create_profiles.sql
supabase/migrations/003_add_onboarding_to_profiles.sql
supabase/migrations/004_add_follow_up_ai_to_tasks.sql
supabase/migrations/005_set_follow_up_default_to_one_day.sql
supabase/migrations/006_add_google_calendar_sync.sql
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
- The app dashboard lives at `/app`, voice capture/confirmation at `/app/new`, completed history at `/app/history`, and settings at `/app/settings`.
- Pricing lives at `/pricing`.
- First-time onboarding lives at `/onboarding` and is shown until `profiles.onboarding_completed` is true.
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

## Follow-up AI

Follow-up AI is Premium-only and never sends emails or messages automatically. It only generates copy-ready follow-up text.

Run `supabase/migrations/004_add_follow_up_ai_to_tasks.sql` to add:

- `follow_up_enabled`
- `follow_up_after_days`
- `follow_up_suggestion`
- `follow_up_last_generated_at`

A task is eligible when it is `pending`, Follow-up AI is enabled, `created_at` is older than the selected delay, and no suggestion exists or the last suggestion was generated more than 24 hours ago.
The default follow-up delay is 1 day when no value is selected.

To test:

- Free user: keep `profiles.plan = 'free'`; the confirmation screen and dashboard show locked upgrade UI.
- Premium user: set `profiles.plan = 'premium'` and `premium_until` to `null` or a future timestamp; enable Follow-up AI on a task and age `created_at` beyond the selected delay.

## Google Calendar Sync

Google Calendar Sync is Premium-only and MVP-scoped to one-way event creation from Zantalk tasks. It does not update, delete, or two-way sync calendar events.

Run `supabase/migrations/006_add_google_calendar_sync.sql` to create `google_connections` and add task sync columns. Tokens are stored server-side in `google_connections` with RLS enabled and are never sent to the frontend.

Required Google Cloud setup:

- Create an OAuth client.
- Add the production redirect URI: `https://zantalk.vercel.app/api/auth/callback/google`
- Add the local redirect URI: `http://localhost:3000/api/auth/callback/google`
- Add OAuth scope: `https://www.googleapis.com/auth/calendar.events`

Required environment variables:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

To test:

- Free user: keep `profiles.plan = 'free'`; Google Calendar shows locked Premium UI.
- Premium user: set `profiles.plan = 'premium'`; open `/app/settings`, connect Google Calendar, then use “Add to Google Calendar” on a task.

## Future Payments

Real Stripe or RevenueCat checkout is not implemented yet. The future integration points live in:

```text
src/lib/server/plans.ts
```

Use these placeholders when adding payments later:

- `startCheckout(planInterval)`
- `syncSubscriptionStatus(userId)`
