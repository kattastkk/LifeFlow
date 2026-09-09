# LifeFlow — Full Project Summary
> Hand this document to Claude Code when starting the new project.

---

## What Is LifeFlow?

LifeFlow is a **personal life-management web app** — a single-page React application that acts as a personal OS. It helps users plan daily tasks, track habits, log moods, journal, manage calendar events, and maintain wishlists. All data currently lives in browser `localStorage`. The next phase moves it to a **real backend (Supabase) + LINE chatbot integration**.

---

## Current Tech Stack (Frontend-Only Phase)

| Layer | Technology |
|---|---|
| UI Framework | React 18 (via CDN, no build tool) |
| Language | JavaScript (Babel transpiled JSX in a single HTML file) |
| Styling | Inline styles + injected CSS string (no Tailwind, no CSS files) |
| Fonts | DM Sans + DM Serif Display (Google Fonts) |
| Data Storage | `localStorage` (browser only, no backend) |
| File | Single `LifeFlow.html` — 1,981 lines, ~128 KB |

---

## Pages & Components

### 9 Pages (Sidebar Tabs)

| Tab ID | Page Name | Icon | Purpose |
|---|---|---|---|
| `dashboard` | Dashboard | 🏠 | Overview of all sections, widgets, daily insights |
| `today` | Today | ☀️ | Daily planner checklist, End Today / archive feature |
| `calendar` | Calendar | 📅 | Month/Week/Day views, events, daily history dots |
| `tasks` | Tasks | ✅ | Long-term tasks with priority, due date, status |
| `todo` | To Do List | 📝 | Simple everyday checklist (no deadlines) |
| `wantodo` | Want To Do | 🌟 | Wishlist / bucket list with categories |
| `habits` | Habits | 🔥 | Daily habit tracker with streaks |
| `mood` | Mood | 💫 | Daily mood logger with 14-day chart |
| `journal` | Journal | 📝 | Daily journal with reflection prompts |

### React Components

```
LifeFlow()           — Root component, all state lives here
├── Dashboard()      — 8 widgets + Daily Activity Insights panel
├── TodayPage()      — Daily checklist + 🌙 End Today button
│   └── TodayItem()  — Single checklist row (toggle/edit/delete)
├── Calendar()       — Month grid + history dots + history modal
│   └── WeekDayView()
├── Tasks()          — Full CRUD task manager
├── TodoListPage()   — Simple checklist
│   └── TodoItem()
├── WantToDoPage()   — Wishlist with category filter + search
├── Habits()         — Weekly grid + streak + 30-day rate
├── MoodTracker()    — Mood picker + bar chart + history
├── Journal()        — Write / list / export entries
└── Helpers: SectionHeader, EmptyState, StatusBadge, PriorityBadge
```

---

## Data Structures (localStorage Keys)

### `lf_tasks` — Long-term tasks
```json
{ "id": "abc123", "title": "Complete SQL Assignment", "desc": "...",
  "due": "2025-09-10", "priority": "High",
  "category": "Work", "status": "To Do" }
```

### `lf_today_items` — Today's daily checklist
```json
{ "id": "abc123", "text": "Read Python for 30 min",
  "completed": false, "createdAt": "2025-09-08T09:00:00.000Z" }
```

### `lf_daily_history` — Archived daily logs (from "End Today")
```json
{ "date": "2025-09-07", "completedCount": 3, "totalCount": 5,
  "completionRate": 60,
  "items": [{ "id": "...", "text": "Buy groceries", "completed": true }] }
```

### `lf_events` — Calendar events
```json
{ "id": "abc123", "title": "Team standup", "desc": "Daily sync",
  "date": "2025-09-08", "time": "09:00", "status": "Confirmed" }
```

### `lf_habits` — Recurring habits
```json
{ "id": "abc123", "name": "Morning meditation", "emoji": "🧘",
  "color": "#db2777",
  "completions": { "2025-09-08": true, "2025-09-07": true } }
```

### `lf_moods` — Daily mood log
```json
{ "date": "2025-09-08", "value": 4, "note": "Had a good morning" }
```
> Mood values: 5=Very Happy, 4=Happy, 3=Neutral, 2=Sad, 1=Very Sad

### `lf_journals` — Journal entries
```json
{ "id": "abc123", "title": "Monday thoughts", "content": "...",
  "date": "2025-09-08", "prompt": "What made you smile today?" }
```

### `lf_todo_items` — Everyday to-do checklist
```json
{ "id": "abc123", "text": "Clean desk",
  "completed": false, "createdAt": "2025-09-08T10:00:00.000Z" }
```

### `lf_want_items` — Wishlist / bucket list
```json
{ "id": "abc123", "title": "Visit Japan", "category": "Travel",
  "note": "Cherry blossom season", "completed": false,
  "createdAt": "2025-09-08T10:00:00.000Z" }
```
> Categories: Learning, Travel, Hobby, Career, Personal Growth, Fun, Other

### `lf_dark` — Theme preference
```json
true
```

---

## Design System

| Token | Value |
|---|---|
| Primary color | `#db2777` (pink-600) |
| Primary hover | `#be185d` (rose-700) |
| Gradient (primary) | `linear-gradient(90deg, #ec4899, #db2777)` |
| Gradient (today) | `linear-gradient(90deg, #ec4899, #a855f7→now #ec4899)` |
| Light bg | `#FFE0EE` |
| Light card | `#ffffff` |
| Light input | `#FFC7E0` |
| Dark bg | `#0f0f1a` |
| Dark card | `#1a1a2e` |
| Dark sidebar | `#16162a` |
| Border (light) | `#e5e7eb` |
| Border (dark) | `#2d2d4a` |
| Text muted | `#6b7280` (light) / `#94a3b8` (dark) |
| Font | DM Sans (body), DM Serif Display (headings) |
| Card radius | `16px` |
| Button radius | `10px` |

---

## Feature: Daily History & End Today

When the user clicks **🌙 End Today** on the Today page:
1. Snapshot of `lf_today_items` is saved to `lf_daily_history` keyed by date
2. `lf_today_items` is cleared
3. Calendar shows a pink dot + completion % on archived dates
4. Clicking a dated dot opens a history modal with full item log
5. Dashboard shows "Yesterday's Reflection" widget + "Daily Activity Insights"

---

## What Needs to Be Built Next

### Phase 2: Real Backend + LINE Integration

#### Stack Recommendation
```
Frontend:   React + Vite + TypeScript + Tailwind CSS
Backend:    Node.js (Express or Fastify) OR Next.js API routes
Database:   Supabase (PostgreSQL + Auth + Realtime)
Auth:       Supabase Auth (Email + Google OAuth)
LINE:       LINE Messaging API (Webhook + LINE Notify or LIFF)
Hosting:    Vercel (frontend + API) or Railway (backend)
```

---

## Supabase Database Schema

```sql
-- Users (handled by Supabase Auth, extended here)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  line_user_id TEXT UNIQUE,   -- LINE userId for chatbot linking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (long-term)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, due_date DATE,
  priority TEXT CHECK (priority IN ('Low','Medium','High')) DEFAULT 'Medium',
  category TEXT DEFAULT 'Personal',
  status TEXT CHECK (status IN ('To Do','In Progress','Completed')) DEFAULT 'To Do',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Today Items (daily checklist)
CREATE TABLE today_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily History (archived Today logs)
CREATE TABLE daily_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_count INT DEFAULT 0, total_count INT DEFAULT 0,
  completion_rate INT DEFAULT 0,
  items JSONB DEFAULT '[]',
  UNIQUE(user_id, date)
);

-- Events (calendar)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  event_date DATE NOT NULL, event_time TIME,
  status TEXT DEFAULT 'Confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, emoji TEXT DEFAULT '🌟', color TEXT DEFAULT '#db2777',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_completions (
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  PRIMARY KEY (habit_id, date)
);

-- Moods
CREATE TABLE moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL, value INT CHECK (value BETWEEN 1 AND 5),
  note TEXT,
  UNIQUE(user_id, date)
);

-- Journal
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT, content TEXT NOT NULL, prompt TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- To Do List (simple checklist)
CREATE TABLE todo_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Want To Do (wishlist)
CREATE TABLE want_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, category TEXT DEFAULT 'Other',
  note TEXT, completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## LINE Chatbot Integration Plan

### Architecture
```
LINE App (User)
     │  sends message
     ▼
LINE Messaging API
     │  webhook POST
     ▼
Your Backend /api/line/webhook
     │  parse intent
     ▼
Supabase (read/write data)
     │  reply
     ▼
LINE Messaging API
     │  push/reply message
     ▼
LINE App (User sees response)
```

### LINE Bot Commands to Support

```
User types:           Bot does:
─────────────────────────────────────────────────────
"add task Buy milk"   → adds to today_items, replies ✅ Added!
"done Buy milk"       → marks today item complete
"today"               → shows today's checklist summary
"habits"              → shows today's habit completion status
"done [habit name]"   → marks habit as complete for today
"mood happy"          → logs mood = 4 (Happy) for today
"mood 😄"            → logs mood = 5 (Very Happy)
"journal [text]"      → saves a quick journal entry
"end day"             → archives today's items to daily_history
"summary"             → shows today's overall progress
"remind 3pm Meeting"  → schedules a LINE Notify reminder
```

### LINE Notifications (Push Messages)

| Trigger | Message |
|---|---|
| 8:00 AM daily | "☀️ Good morning! You have X tasks today." |
| 9:00 PM daily | "🌙 Don't forget to end your day!" (if not archived) |
| Event reminder | "⏰ Reminder: [event title] in 30 minutes" |
| Habit reminder | "🔥 You haven't logged your habits yet today!" |
| Task due today | "📋 Due today: [task title]" |

### LINE Linking Flow (connect LINE account to LifeFlow)
1. User logs into LifeFlow web app (Supabase Auth)
2. User goes to Settings → "Connect LINE"
3. App generates a one-time 6-digit code
4. User sends that code to the LINE bot: `connect 482910`
5. Backend saves `line_user_id` to `profiles` table
6. Bot replies: "✅ LINE linked to your LifeFlow account!"

---

## Environment Variables Needed

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # backend only, never expose to client

# LINE
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_NOTIFY_TOKEN=...              # optional, for LINE Notify

# App
NEXT_PUBLIC_APP_URL=https://lifeflow.vercel.app
```

---

## Suggested Folder Structure (Next.js)

```
lifeflow/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── today/page.tsx
│   ├── calendar/page.tsx
│   ├── tasks/page.tsx
│   └── ...
├── components/
│   ├── ui/                       # Shared: Button, Card, Modal, Badge
│   ├── dashboard/
│   ├── today/
│   ├── calendar/
│   └── ...
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── supabase-server.ts        # Server-side Supabase client
│   └── line.ts                   # LINE API helpers
├── api/
│   ├── line/
│   │   └── webhook/route.ts      # LINE webhook handler
│   ├── notify/route.ts           # Push notification sender
│   └── connect-line/route.ts     # LINE account linking
├── hooks/
│   ├── useTasks.ts
│   ├── useHabits.ts
│   └── ...
├── types/
│   └── index.ts                  # All TypeScript interfaces
├── .env.local
└── package.json
```

---

## Migration Plan (localStorage → Supabase)

1. **Phase 1 (current):** Single HTML file, localStorage, no auth
2. **Phase 2:** Add Supabase auth (Email + Google), migrate data model
3. **Phase 3:** Add LINE webhook backend, implement bot commands
4. **Phase 4:** Add LINE push notifications (cron jobs via Vercel)
5. **Phase 5:** Mobile PWA, offline support, export features

---

## Key Prompt for Claude Code

> "I'm building LifeFlow — a personal productivity app. The full feature spec and data structures are in this summary. Start by setting up Next.js + TypeScript + Tailwind + Supabase auth. Then migrate the existing pages one by one. The design uses pink tones (#db2777 primary). After the web app is stable, add a LINE Messaging API webhook that lets users update their data by chatting with the bot."

