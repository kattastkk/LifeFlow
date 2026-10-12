import { createClient } from "@/lib/supabase/server";
import type { TodayItem } from "@/types/database";
import { finishDay } from "./actions";
import TodayChecklist from "./TodayChecklist";

export default async function TodayPage(props: PageProps<"/dashboard/today">) {
  const { ended: endedParam } = await props.searchParams;
  const ended = typeof endedParam === "string" ? endedParam : null;

  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: items }, { data: historyRow }] = await Promise.all([
    supabase.from("today_items").select("*").eq("date", todayStr).order("created_at", { ascending: false }),
    supabase.from("daily_history").select("id").eq("date", todayStr).maybeSingle(),
  ]);

  const alreadyArchived = !!historyRow;

  const endToday = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <form action={finishDay}>
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            background: alreadyArchived ? "#ede9fe" : "linear-gradient(135deg,#818cf8,#6366f1)",
            color: alreadyArchived ? "#7c3aed" : "#fff",
            fontWeight: 600,
            fontSize: 13,
            border: alreadyArchived ? "1px solid #e9d5ff" : "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            whiteSpace: "nowrap",
          }}
        >
          🌙 {alreadyArchived ? "Re-archive Today" : "End Today"}
        </button>
      </form>
      {alreadyArchived && <div style={{ fontSize: 10, color: "#7c3aed" }}>✦ Already archived today</div>}
    </div>
  );

  const banner = (
    <>
      {ended === "saved" && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12, fontSize: 13, color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
          🌙 <strong>Today&apos;s memories have been saved.</strong> Your checklist has been archived and cleared for tomorrow.
        </div>
      )}
      {ended === "updated" && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#ede9fe", border: "1px solid #e9d5ff", borderRadius: 12, fontSize: 13, color: "#7c3aed", display: "flex", alignItems: "center", gap: 8 }}>
          💜 <strong>Archive updated.</strong> Today&apos;s log has been refreshed with your latest progress.
        </div>
      )}
      {ended === "empty" && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, fontSize: 13, color: "#b91c1c", display: "flex", alignItems: "center", gap: 8 }}>
          ☁️ <strong>Nothing to save.</strong> Add some items first before ending your day.
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680, margin: "0 auto" }}>
      <TodayChecklist items={(items ?? []) as TodayItem[]} headerRight={endToday} banner={banner} />
    </div>
  );
}
