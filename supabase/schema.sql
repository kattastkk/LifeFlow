-- LifeFlow database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ── Profiles ────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  line_user_id text unique,
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Tasks (long-term) ───────────────────────────────────────
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  priority text check (priority in ('Low','Medium','High')) default 'Medium',
  category text default 'Personal',
  status text check (status in ('To Do','In Progress','Completed')) default 'To Do',
  created_at timestamptz default now()
);

-- ── Today items (daily checklist) ──────────────────────────
create table today_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  date date default current_date,
  created_at timestamptz default now()
);

-- ── Daily history (archived Today logs) ────────────────────
create table daily_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  completed_count int default 0,
  total_count int default 0,
  completion_rate int default 0,
  items jsonb default '[]',
  unique(user_id, date)
);

-- ── Events (calendar) ───────────────────────────────────────
create table events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  event_date date not null,
  event_time time,
  status text default 'Confirmed',
  created_at timestamptz default now()
);

-- ── Habits ──────────────────────────────────────────────────
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '🌟',
  color text default '#db2777',
  created_at timestamptz default now()
);

create table habit_completions (
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  primary key (habit_id, date)
);

-- ── Moods ───────────────────────────────────────────────────
create table moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  value int check (value between 1 and 5) not null,
  note text,
  unique(user_id, date)
);

-- ── Journal ─────────────────────────────────────────────────
create table journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text,
  content text not null,
  prompt text,
  date date default current_date,
  created_at timestamptz default now()
);

-- ── Projects (group To Do items) ───────────────────────────
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '📁',
  created_at timestamptz default now()
);

-- ── To Do list (simple checklist) ──────────────────────────
create table todo_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  text text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ── Want To Do (wishlist) ───────────────────────────────────
create table want_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text default 'Other',
  note text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ── Row Level Security ──────────────────────────────────────
-- Every table is scoped to the signed-in user. Without these
-- policies, RLS-enabled tables deny all access by default (safe),
-- but we need explicit policies for the app to read/write its own rows.

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table today_items enable row level security;
alter table daily_history enable row level security;
alter table events enable row level security;
alter table habits enable row level security;
alter table habit_completions enable row level security;
alter table moods enable row level security;
alter table journal_entries enable row level security;
alter table projects enable row level security;
alter table todo_items enable row level security;
alter table want_items enable row level security;

create policy "Users manage their own profile"
  on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage their own tasks"
  on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own today items"
  on today_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own daily history"
  on daily_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own events"
  on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own habits"
  on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own habit completions"
  on habit_completions for all
  using (exists (select 1 from habits where habits.id = habit_completions.habit_id and habits.user_id = auth.uid()))
  with check (exists (select 1 from habits where habits.id = habit_completions.habit_id and habits.user_id = auth.uid()));

create policy "Users manage their own moods"
  on moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own journal entries"
  on journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own projects"
  on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own todo items"
  on todo_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own want items"
  on want_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
