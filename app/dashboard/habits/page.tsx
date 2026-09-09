import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitCompletion } from "@/types/database";
import { addHabit, updateHabit, deleteHabit, toggleHabitDay } from "./actions";

const EMOJIS = ["🌟", "🏃", "💧", "📚", "🧘", "🥗", "💊", "💪", "🎵", "🌿", "☀️", "🛌", "✍️", "🧠", "❤️", "🏋️"];
const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HabitsPage(props: PageProps<"/dashboard/habits">) {
  const { edit: editParam } = await props.searchParams;
  const editId = typeof editParam === "string" ? editParam : null;

  const supabase = await createClient();
  const todayStr = isoDate(new Date());

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return isoDate(d);
  });
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return isoDate(d);
  });

  const { data: habitsData } = await supabase.from("habits").select("*").order("created_at", { ascending: true });
  const habits = (habitsData ?? []) as Habit[];
  const habitIds = habits.map((h) => h.id);

  let completions: HabitCompletion[] = [];
  if (habitIds.length > 0) {
    const { data } = await supabase
      .from("habit_completions")
      .select("*")
      .in("habit_id", habitIds)
      .gte("date", last30Days[0]);
    completions = (data ?? []) as HabitCompletion[];
  }

  const isDone = (habitId: string, date: string) => completions.some((c) => c.habit_id === habitId && c.date === date);

  const getStreak = (habitId: string) => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const k = isoDate(d);
      if (!isDone(habitId, k)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Habit Tracker</h2>
      </div>

      {/* New habit form (prototype uses a modal; this is always visible inline) */}
      <form action={addHabit} className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input name="name" placeholder="Habit name *" required className="lf-input" />
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Emoji</label>
          <select name="emoji" defaultValue="🌟" className="lf-input" style={{ width: "auto" }}>
            {EMOJIS.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Color</label>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map((c) => (
              <input
                key={c}
                type="radio"
                name="color"
                value={c}
                defaultChecked={c === "#8b5cf6"}
                style={{ width: 26, height: 26, borderRadius: "50%", accentColor: c, cursor: "pointer" }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="lf-btn lf-btn-primary">
            + New habit
          </button>
        </div>
      </form>

      {habits.length > 0 && (
        <div className="lf-card" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: 4, minWidth: 480 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", padding: "4px 0" }}>Habit</div>
            {last7Days.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: d === todayStr ? "#8b5cf6" : "var(--muted)",
                  fontWeight: d === todayStr ? 700 : 400,
                  padding: "4px 0",
                }}
              >
                {new Date(d + "T00:00").toLocaleDateString("en-US", { weekday: "short" })}
                <br />
                {new Date(d + "T00:00").getDate()}
              </div>
            ))}
            {habits.map((h) => (
              <div key={h.id} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{ fontSize: 18 }}>{h.emoji}</span>
                  <span style={{ fontSize: 13, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.name}
                  </span>
                </div>
                {last7Days.map((d) => {
                  const done = isDone(h.id, d);
                  const cell = (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: done ? h.color : "transparent",
                        border: `2px solid ${h.color}`,
                        opacity: done ? 1 : 0.35,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "#fff",
                      }}
                    >
                      {done ? "✓" : ""}
                    </div>
                  );
                  return (
                    <div key={`${h.id}${d}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {d === todayStr ? (
                        <form action={toggleHabitDay}>
                          <input type="hidden" name="habit_id" value={h.id} />
                          <input type="hidden" name="date" value={d} />
                          <input type="hidden" name="was_completed" value={String(done)} />
                          <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                            {cell}
                          </button>
                        </form>
                      ) : (
                        cell
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {habits.map((h) => {
          const streak = getStreak(h.id);
          const total = completions.filter((c) => c.habit_id === h.id).length;
          const rate = Math.round((last30Days.filter((d) => isDone(h.id, d)).length / 30) * 100);
          const done = isDone(h.id, todayStr);

          if (editId === h.id) {
            return (
              <form key={h.id} action={updateHabit} className="lf-card" style={{ borderLeft: `4px solid ${h.color}`, display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="hidden" name="id" value={h.id} />
                <input name="name" defaultValue={h.name} required className="lf-input" />
                <select name="emoji" defaultValue={h.emoji} className="lf-input" style={{ width: "auto" }}>
                  {EMOJIS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 10 }}>
                  {COLORS.map((c) => (
                    <input
                      key={c}
                      type="radio"
                      name="color"
                      value={c}
                      defaultChecked={c === h.color}
                      style={{ width: 26, height: 26, borderRadius: "50%", accentColor: c, cursor: "pointer" }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Link href="/dashboard/habits" className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                    Cancel
                  </Link>
                  <button type="submit" className="lf-btn lf-btn-primary" style={{ padding: "4px 10px", fontSize: 12 }}>
                    Save habit
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div key={h.id} className="lf-card" style={{ borderLeft: `4px solid ${h.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{h.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "var(--foreground)", fontSize: 15 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{rate}% last 30 days</div>
                </div>
                <form action={toggleHabitDay}>
                  <input type="hidden" name="habit_id" value={h.id} />
                  <input type="hidden" name="date" value={todayStr} />
                  <input type="hidden" name="was_completed" value={String(done)} />
                  <button
                    type="submit"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: done ? h.color : "transparent",
                      border: `2px solid ${h.color}`,
                      color: done ? "#fff" : h.color,
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {done ? "✓" : "○"}
                  </button>
                </form>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {streak > 0 && <span className="streak-badge">🔥 {streak}d streak</span>}
                <span style={{ background: "#f8fafc", color: "var(--muted)", borderRadius: 20, padding: "4px 10px", fontSize: 12 }}>✅ {total} total</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${rate}%`, background: h.color }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Link href={`/dashboard/habits?edit=${h.id}`} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                  Edit
                </Link>
                <form action={deleteHabit}>
                  <input type="hidden" name="id" value={h.id} />
                  <button type="submit" style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}>
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
