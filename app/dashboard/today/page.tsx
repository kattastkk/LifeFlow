import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { TodayItem } from "@/types/database";
import {
  addTodayItem,
  toggleTodayItem,
  deleteTodayItem,
  updateTodayItem,
  clearCompletedToday,
  finishDay,
} from "./actions";

function ItemRow({ item, editId, isLast }: { item: TodayItem; editId: string | null; isLast: boolean }) {
  if (editId === item.id) {
    return (
      <form
        action={updateTodayItem}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)" }}
      >
        <input type="hidden" name="id" value={item.id} />
        <input name="text" defaultValue={item.text} autoFocus className="lf-input" style={{ flex: 1, padding: "6px 10px", fontSize: 14 }} />
        <button type="submit" style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "#ec4899", color: "#fff", border: "none", cursor: "pointer", fontWeight: 500 }}>
          Save
        </button>
        <Link href="/dashboard/today" style={{ fontSize: 12, padding: "3px 8px", borderRadius: 8, background: "var(--input)", color: "var(--muted)" }}>
          ✕
        </Link>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <form action={toggleTodayItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="completed" value={String(item.completed)} />
        <button
          type="submit"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            flexShrink: 0,
            border: `2px solid ${item.completed ? "#ec4899" : "var(--border)"}`,
            background: item.completed ? "#ec4899" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {item.completed && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
        </button>
      </form>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: "var(--foreground)",
          textDecoration: item.completed ? "line-through" : "none",
          opacity: item.completed ? 0.45 : 1,
          lineHeight: 1.5,
        }}
      >
        {item.text}
      </span>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <Link href={`/dashboard/today?edit=${item.id}`} style={{ fontSize: 13, padding: "3px 8px", borderRadius: 8, color: "var(--muted)", opacity: 0.6 }} title="Edit">
          ✏️
        </Link>
        <form action={deleteTodayItem}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" style={{ fontSize: 13, padding: "3px 8px", borderRadius: 8, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", opacity: 0.7 }} title="Delete">
            ✕
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function TodayPage(props: PageProps<"/dashboard/today">) {
  const { edit: editParam, ended: endedParam } = await props.searchParams;
  const editId = typeof editParam === "string" ? editParam : null;
  const ended = typeof endedParam === "string" ? endedParam : null;

  const supabase = await createClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: items }, { data: historyRow }] = await Promise.all([
    supabase.from("today_items").select("*").eq("date", todayStr).order("created_at", { ascending: false }),
    supabase.from("daily_history").select("id").eq("date", todayStr).maybeSingle(),
  ]);

  const todayItems = (items ?? []) as TodayItem[];
  const alreadyArchived = !!historyRow;

  const done = todayItems.filter((i) => i.completed).length;
  const total = todayItems.length;
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  const sorted = [...todayItems].sort((a, b) => {
    if (a.completed === b.completed) return b.created_at.localeCompare(a.created_at);
    return Number(a.completed) - Number(b.completed);
  });
  const incomplete = sorted.filter((i) => !i.completed);
  const completedItems = sorted.filter((i) => i.completed);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680, margin: "0 auto" }}>
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #f9a8d4, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              ☀️
            </div>
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "var(--foreground)", lineHeight: 1 }}>Today&apos;s Plan</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {allDone ? "🎉 Everything done — great work!" : "Focus on what matters today."}
              </p>
            </div>
          </div>
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
        </div>

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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total", val: total, icon: "📋" },
          { label: "Completed", val: done, icon: "✅" },
          { label: "Remaining", val: remaining, icon: "⏳" },
        ].map((s) => (
          <div key={s.label} className="lf-card" style={{ textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="lf-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Daily progress</span>
            <span style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(90deg,#ec4899,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "#f3e8ff", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg, #ec4899, #a855f7)", width: `${pct}%`, transition: "width 0.5s ease" }} />
          </div>
          {allDone && <div style={{ marginTop: 10, fontSize: 13, color: "#be185d", textAlign: "center", fontWeight: 500 }}>🎊 All done! You crushed today&apos;s plan!</div>}
        </div>
      )}

      <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: 16, padding: "16px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#be185d", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>✦ Add to today</div>
        <form action={addTodayItem} style={{ display: "flex", gap: 10 }}>
          <input
            name="text"
            placeholder="e.g. Read Python for 30 minutes, Buy groceries…"
            required
            className="lf-input"
            style={{ flex: 1, background: "#fff", borderColor: "#fbcfe8" }}
          />
          <button type="submit" style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            + Add
          </button>
        </form>
        <div style={{ fontSize: 11, color: "#be185d", marginTop: 8, opacity: 0.7 }}>Press Enter to add quickly</div>
      </div>

      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        {incomplete.length > 0 && (
          <div>
            <div style={{ padding: "14px 20px 6px", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ⏳ To do — {incomplete.length} remaining
            </div>
            {incomplete.map((item, idx, arr) => (
              <ItemRow key={item.id} item={item} editId={editId} isLast={idx === arr.length - 1 && completedItems.length === 0} />
            ))}
          </div>
        )}

        {completedItems.length > 0 && (
          <div>
            <div
              style={{
                padding: "14px 20px 6px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>✅ Completed — {done}</span>
              <form action={clearCompletedToday}>
                <button type="submit" style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>
                  Clear all
                </button>
              </form>
            </div>
            {completedItems.map((item, idx, arr) => (
              <ItemRow key={item.id} item={item} editId={editId} isLast={idx === arr.length - 1} />
            ))}
          </div>
        )}

        {total === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--foreground)", fontWeight: 400 }}>A fresh day awaits</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Add your first item above to get started.</div>
          </div>
        )}
      </div>
    </div>
  );
}
