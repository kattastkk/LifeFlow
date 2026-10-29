-- To Do list: remember the order of the project boxes (including the Inbox).
-- Run once in the Supabase SQL Editor.
alter table public.profiles add column if not exists todo_order text[] default '{}';
