-- Journal: one entry per day with six optional topics.
-- Run once in the Supabase SQL Editor.

-- Remove the three QA test entries from Sep 9 so each day has at most one entry.
delete from public.journal_entries
where id in (
  '9024903c-9000-4f4f-9a31-22bc91efeefe',
  '24eae449-8bc3-45c9-af3c-dec8a5aecf4b',
  '7a5a919c-a7e3-4f76-897e-cf1533ecc39f'
);

alter table public.journal_entries
  add column if not exists grateful text,
  add column if not exists felt_most text,
  add column if not exists achievements text,
  add column if not exists learned text,
  add column if not exists worries text,
  add column if not exists tomorrow text;

-- Every topic is optional, so the old free-text column may be empty.
alter table public.journal_entries alter column content set default '';
alter table public.journal_entries alter column date set not null;

create unique index if not exists journal_entries_user_date_key
  on public.journal_entries (user_id, date);
