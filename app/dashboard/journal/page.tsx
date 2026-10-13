import { createClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/types/database";
import JournalBoard from "./JournalBoard";

export default async function JournalPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("journal_entries").select("*").order("date", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Journal</h2>
      <JournalBoard entries={(data ?? []) as JournalEntry[]} today={today} />
    </div>
  );
}
