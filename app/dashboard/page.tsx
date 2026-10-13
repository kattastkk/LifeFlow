import { createClient } from "@/lib/supabase/server";
import type { Task, TodayItem, CalendarEvent, Habit, HabitCompletion, Mood, JournalEntry, TodoItem, WantItem } from "@/types/database";
import DashboardView from "./DashboardView";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = isoDate(now);
  const yearAgo = new Date(now);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const [
    { data: tasks },
    { data: todayItems },
    { data: events },
    { data: habits },
    { data: completions },
    { data: mood },
    { data: journal },
    { data: todoItems },
    { data: wantItems },
  ] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("today_items").select("*"),
    supabase.from("events").select("*").eq("event_date", today).order("event_time", { ascending: true }),
    supabase.from("habits").select("*").order("created_at", { ascending: true }),
    supabase.from("habit_completions").select("*").gte("date", isoDate(yearAgo)),
    supabase.from("moods").select("*").eq("date", today).maybeSingle(),
    supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(1),
    supabase.from("todo_items").select("*"),
    supabase.from("want_items").select("*"),
  ]);

  return (
    <DashboardView
      today={today}
      dateLabel={now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Bangkok" })}
      tasks={(tasks ?? []) as Task[]}
      todayItems={(todayItems ?? []) as TodayItem[]}
      events={(events ?? []) as CalendarEvent[]}
      habits={(habits ?? []) as Habit[]}
      completions={(completions ?? []) as HabitCompletion[]}
      todayMood={(mood as Mood | null) ?? null}
      latestJournal={((journal ?? []) as JournalEntry[])[0] ?? null}
      todoItems={(todoItems ?? []) as TodoItem[]}
      wantItems={(wantItems ?? []) as WantItem[]}
    />
  );
}
