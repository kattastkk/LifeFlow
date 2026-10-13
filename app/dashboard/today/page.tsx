import { createClient } from "@/lib/supabase/server";
import type { TodayItem } from "@/types/database";
import TodayChecklist from "./TodayChecklist";

export default async function TodayPage() {
  const supabase = await createClient();
  // No date filter: unfinished items carry over until they're ticked or deleted.
  const { data: items } = await supabase.from("today_items").select("*").order("created_at", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680, margin: "0 auto" }}>
      <TodayChecklist items={(items ?? []) as TodayItem[]} />
    </div>
  );
}
