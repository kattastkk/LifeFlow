import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitCompletion } from "@/types/database";
import HabitBoard from "./HabitBoard";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HabitsPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = isoDate(now);
  const yearAgo = new Date(now);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const { data: habitsData } = await supabase.from("habits").select("*").order("created_at", { ascending: true });
  const habits = (habitsData ?? []) as Habit[];

  let completions: HabitCompletion[] = [];
  if (habits.length > 0) {
    const { data } = await supabase
      .from("habit_completions")
      .select("habit_id, date")
      .in("habit_id", habits.map((h) => h.id))
      .gte("date", isoDate(yearAgo));
    completions = (data ?? []) as HabitCompletion[];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Habit Tracker</h2>
      <HabitBoard habits={habits} completions={completions} today={today} />
    </div>
  );
}
