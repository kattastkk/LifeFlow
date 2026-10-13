import { createClient } from "@/lib/supabase/server";
import type { Mood } from "@/types/database";
import MoodBoard from "./MoodBoard";

export default async function MoodPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("moods").select("*").order("date", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Mood Tracker</h2>
      <MoodBoard moods={(data ?? []) as Mood[]} today={today} />
    </div>
  );
}
