import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, DailyHistory } from "@/types/database";
import { addEvent, updateEvent, deleteEvent } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthGrid(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  return cells;
}

export default async function CalendarPage(props: PageProps<"/dashboard/calendar">) {
  const { month: monthParam, edit: editParam, history: historyParam } = await props.searchParams;
  const now = new Date();
  const monthStr = typeof monthParam === "string" ? monthParam : `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [year, month1] = monthStr.split("-").map(Number);
  const month = month1 - 1;
  const editId = typeof editParam === "string" ? editParam : null;
  const historyDate = typeof historyParam === "string" ? historyParam : null;
  const todayStr = now.toISOString().slice(0, 10);

  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
  const nextMonth = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`;
  const firstOfMonth = `${year}-${pad(month + 1)}-01`;
  const lastOfMonth = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const supabase = await createClient();
  const [{ data: eventsData }, { data: historyData }] = await Promise.all([
    supabase.from("events").select("*").gte("event_date", firstOfMonth).lte("event_date", lastOfMonth),
    supabase.from("daily_history").select("*").order("date", { ascending: false }),
  ]);
  const events = (eventsData ?? []) as CalendarEvent[];
  const history = (historyData ?? []) as DailyHistory[];
  const editing = editId ? events.find((e) => e.id === editId) ?? null : null;
  const historyRecord = historyDate ? history.find((h) => h.date === historyDate) ?? null : null;

  const cells = monthGrid(year, month);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Calendar</h2>
          {history.length > 0 && <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 3 }}>💜 Dates with a purple dot have a daily history log — click to view.</p>}
        </div>
      </div>

      {/* Add / Edit event form (prototype uses a modal; this is always visible inline) */}
      <form key={editing?.id ?? "new"} action={editing ? updateEvent : addEvent} className="lf-card">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }}>{editing ? "Edit event" : "New event"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input name="title" defaultValue={editing?.title ?? ""} placeholder="Event title" required className="lf-input" />
          <textarea name="description" defaultValue={editing?.description ?? ""} placeholder="Description (optional)" rows={2} className="lf-input" style={{ resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="date" name="event_date" defaultValue={editing?.event_date ?? todayStr} required className="lf-input" />
            <input type="time" name="event_time" defaultValue={editing?.event_time ?? "09:00"} className="lf-input" />
          </div>
          <select name="status" defaultValue={editing?.status ?? "Confirmed"} className="lf-input">
            {["Confirmed", "Tentative", "Cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {editing && (
              <Link href={`/dashboard/calendar?month=${monthStr}`} className="lf-btn lf-btn-ghost">
                Cancel
              </Link>
            )}
            <button type="submit" className="lf-btn lf-btn-primary">
              {editing ? "Save" : "+ Add event"}
            </button>
          </div>
        </div>
      </form>

      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Link href={`/dashboard/calendar?month=${prevMonth}`} className="lf-btn lf-btn-ghost" style={{ padding: "6px 12px" }}>
            ←
          </Link>
          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--foreground)" }}>
            {MONTHS[month]} {year}
          </span>
          <Link href={`/dashboard/calendar?month=${nextMonth}`} className="lf-btn lf-btn-ghost" style={{ padding: "6px 12px" }}>
            →
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "8px 8px 0" }}>
          {DAYS_SHORT.map((d) => (
            <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 8px 8px", gap: 2 }}>
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} />;
            const isToday = date === todayStr;
            const dayNum = Number(date.slice(-2));
            const evs = events.filter((e) => e.event_date === date);
            const hist = history.find((h) => h.date === date) ?? null;
            const cellInner = (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, paddingRight: 2 }}>
                  <div className={`cal-day${isToday ? " today" : ""}`} style={{ width: 32, height: 32 }}>
                    {dayNum}
                  </div>
                  {hist && (
                    <div title={`${hist.completion_rate}% completed`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: hist.completion_rate === 100 ? "#10b981" : "#7c3aed" }} />
                      <div style={{ fontSize: 8, color: "#7c3aed", fontWeight: 700 }}>{hist.completion_rate}%</div>
                    </div>
                  )}
                </div>
                {evs.slice(0, 2).map((e) => (
                  <div key={e.id} style={{ fontSize: 10, padding: "1px 6px", background: "#ede9fe", color: "#8b5cf6", borderRadius: 4, marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {e.title}
                  </div>
                ))}
                {evs.length > 2 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 6 }}>+{evs.length - 2}</div>}
              </>
            );
            return (
              <div key={date} style={{ minHeight: 72, padding: "4px 2px", borderRadius: 8, background: hist ? "#faf5ff" : "transparent" }}>
                {hist ? (
                  <Link href={`/dashboard/calendar?month=${monthStr}&history=${date}`} style={{ display: "block" }}>
                    {cellInner}
                  </Link>
                ) : (
                  cellInner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {historyRecord && (
        <div className="lf-card" style={{ background: "#fff", border: "1px solid #e9d5ff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#c084fc,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              📖
            </div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: "var(--foreground)" }}>{historyRecord.date}</div>
              <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>Daily History Log</div>
            </div>
            <Link href={`/dashboard/calendar?month=${monthStr}`} style={{ marginLeft: "auto", fontSize: 20, color: "var(--muted)" }}>
              ✕
            </Link>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: "center", background: "#faf5ff", borderRadius: 12, padding: "10px 6px", border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: historyRecord.completion_rate === 100 ? "#10b981" : "#7c3aed" }}>{historyRecord.completion_rate}%</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Completion</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: "#faf5ff", borderRadius: 12, padding: "10px 6px", border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#ec4899" }}>{historyRecord.completed_count}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Done</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: "#faf5ff", borderRadius: 12, padding: "10px 6px", border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--muted)" }}>{historyRecord.total_count}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Total</div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 8, borderRadius: 4, background: "#f3e8ff", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#ec4899,#a855f7)", width: `${historyRecord.completion_rate}%` }} />
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Today&apos;s Log</div>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto" }}>
            {historyRecord.items.filter((i) => i.completed).map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#fdf2f8", borderRadius: 8, marginBottom: 3 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: "var(--foreground)", flex: 1 }}>{item.text}</span>
              </div>
            ))}
            {historyRecord.items.filter((i) => !i.completed).map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--border)", opacity: 0.55, marginBottom: 3 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10 }}>☐</span>
                </div>
                <span style={{ fontSize: 14, color: "var(--foreground)", flex: 1, textDecoration: "line-through" }}>{item.text}</span>
              </div>
            ))}
            {historyRecord.items.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No items were logged this day.
              </div>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="lf-card" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
          <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15, marginBottom: 12 }}>📖 Daily History Archive</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((h) => (
              <Link
                key={h.date}
                href={`/dashboard/calendar?month=${monthStr}&history=${h.date}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", borderRadius: 12, border: "1px solid #f3e8ff" }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: h.completion_rate === 100 ? "#d1fae5" : "#ede9fe", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: h.completion_rate === 100 ? "#059669" : "#7c3aed" }}>{h.completion_rate}%</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>
                    {h.completed_count}/{h.total_count}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 14 }}>{h.date}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {h.items.filter((i) => i.completed).slice(0, 2).map((i) => i.text).join(" · ") || "No items completed"}
                    {h.items.filter((i) => i.completed).length > 2 && ` +${h.items.filter((i) => i.completed).length - 2} more`}
                  </div>
                </div>
                <div style={{ fontSize: 18 }}>{h.completion_rate === 100 ? "🌟" : h.completion_rate >= 50 ? "✨" : "💙"}</div>
              </Link>
            ))}
            {history.length > 10 && <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", paddingTop: 4 }}>+{history.length - 10} more archived days</div>}
          </div>
        </div>
      )}

      <div className="lf-card">
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15, marginBottom: 12 }}>📋 All events</h3>
        {events.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No events yet
          </div>
        )}
        {[...events].sort((a, b) => (a.event_date > b.event_date ? 1 : -1)).map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ background: "#f5f3ff", color: "#8b5cf6", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 60, textAlign: "center" }}>
              <div>{e.event_date}</div>
              <div>{e.event_time}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: "var(--foreground)" }}>{e.title}</div>
              {e.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.description}</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/dashboard/calendar?month=${monthStr}&edit=${e.id}`} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit" style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}>
                  ✕
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
