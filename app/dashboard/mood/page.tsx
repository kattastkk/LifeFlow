import { createClient } from "@/lib/supabase/server";
import type { Mood } from "@/types/database";
import { setMood, deleteMood } from "./actions";

const MOODS = [
  { label: "Very Happy", icon: "😄", value: 5, color: "#22c55e" },
  { label: "Happy", icon: "🙂", value: 4, color: "#84cc16" },
  { label: "Neutral", icon: "😐", value: 3, color: "#f59e0b" },
  { label: "Sad", icon: "😔", value: 2, color: "#f97316" },
  { label: "Very Sad", icon: "😢", value: 1, color: "#ef4444" },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function MoodPage() {
  const supabase = await createClient();
  const todayStr = isoDate(new Date());

  const { data } = await supabase.from("moods").select("*").order("date", { ascending: false });
  const moods = (data ?? []) as Mood[];
  const todayMood = moods.find((m) => m.date === todayStr) ?? null;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return isoDate(d);
  });

  const avg = moods.length ? (moods.reduce((s, m) => s + m.value, 0) / moods.length).toFixed(1) : "—";
  const recent = [...moods].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Mood Tracker</h2>

      <form action={setMood} className="lf-card">
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>How are you feeling today?</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="submit"
              name="value"
              value={m.value}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                borderRadius: 14,
                border: `2px solid ${todayMood?.value === m.value ? m.color : "transparent"}`,
                background: todayMood?.value === m.value ? m.color + "20" : "transparent",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 32 }}>{m.icon}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.label}</span>
            </button>
          ))}
        </div>
        <textarea
          name="note"
          placeholder="Add a note about your day (optional)..."
          rows={2}
          defaultValue={todayMood?.note ?? ""}
          className="lf-input"
          style={{ resize: "vertical" }}
        />
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Pick a mood above to save it along with your note.</p>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12 }}>
        {[
          { label: "Days tracked", val: moods.length, color: "#db2777" },
          { label: "Avg mood (1-5)", val: avg, color: "#f59e0b" },
          { label: "Today's mood", val: todayMood ? MOODS.find((m) => m.value === todayMood.value)?.icon : "—", color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="lf-card" style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="lf-card">
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 16, fontSize: 15 }}>Last 14 days</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
          {last14.map((d) => {
            const m = moods.find((x) => x.date === d);
            const h = m ? (m.value / 5) * 72 : 0;
            const moodData = m ? MOODS.find((x) => x.value === m.value) : null;
            return (
              <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", height: h, background: moodData?.color || "transparent", borderRadius: "4px 4px 0 0", minHeight: m ? 4 : 0, opacity: 0.85 }} />
                <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>{new Date(d + "T00:00").getDate()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          {MOODS.map((m) => (
            <div key={m.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
              {m.label}
            </div>
          ))}
        </div>
      </div>

      <div className="lf-card">
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 12, fontSize: 15 }}>Mood history</h3>
        {recent.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💭</div>
            No mood entries yet
          </div>
        )}
        {recent.map((m) => {
          const moodData = MOODS.find((x) => x.value === m.value);
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 24 }}>{moodData?.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500, color: "var(--foreground)", fontSize: 14 }}>{moodData?.label}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.date}</span>
                </div>
                {m.note && <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.note}</div>}
              </div>
              <form action={deleteMood}>
                <input type="hidden" name="date" value={m.date} />
                <button type="submit" style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}>
                  ✕
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
