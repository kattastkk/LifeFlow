# LifeFlow

Personal life-management OS — tasks, habits, mood, journal, calendar, and more. Migrating from the original single-file `LifeFlow.html` (localStorage) prototype to Next.js + Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth), via `@supabase/ssr`

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) to create the tables and row-level-security policies.
3. In Supabase → Authentication → Providers, enable **Email** and (optionally) **Google** OAuth.
4. Copy your project URL and anon key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

6. Visit `http://localhost:3000` — you'll land on `/login`. Sign up, confirm your email (or use Google), and you'll be dropped on `/dashboard`.

## Structure

```
app/
  (auth)/login, (auth)/signup   — auth pages
  auth/actions.ts               — server actions (login/signup/oauth/logout)
  auth/callback/route.ts        — OAuth + email-confirmation callback
  dashboard/                    — placeholder landing page (build next: today, calendar, tasks, ...)
lib/supabase/                   — browser/server/middleware Supabase clients
types/database.ts               — row types matching supabase/schema.sql
supabase/schema.sql             — full DB schema + RLS policies
```

Pages from the original app (Today, Calendar, Tasks, To Do, Want To Do, Habits, Mood, Journal) will be migrated one at a time on top of this foundation — see `LifeFlow_ProjectSummary.md` for the full spec, data model, and design tokens.
