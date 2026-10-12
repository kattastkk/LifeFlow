-- Migration: add the homework table. Run once in the Supabase SQL editor.
create table homework (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  course text,
  due_date date not null,
  due_time time,
  url text,
  completed boolean default false,
  source text check (source in ('moodle','manual')) default 'manual',
  external_id text,
  created_at timestamptz default now(),
  unique(user_id, external_id)
);

alter table homework enable row level security;

create policy "Users manage their own homework"
  on homework for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
