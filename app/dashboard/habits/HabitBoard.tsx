"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { fd } from "@/lib/fd";
import type { Habit, HabitCompletion } from "@/types/database";
import { addHabit, updateHabit, deleteHabit, toggleHabitDay } from "./actions";

const EMOJIS = ["🌟", "🏃", "💧", "📚", "🧘", "🥗", "💊", "💪", "🎵", "🌿", "☀️", "🛌", "✍️", "🧠", "❤️", "🏋️"];
const COLORS = ["#db2777", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

type Board = { habits: Habit[]; completions: HabitCompletion[] };

type Change =
  | { type: "add"; habit: Habit }
  | { type: "update"; id: string; name: string; emoji: string; color: string }
  | { type: "delete"; id: string }
  | { type: "toggleDay"; habitId: string; date: string };

function reduce(b: Board, c: Change): Board {
  switch (c.type) {
    case "add":
      return { ...b, habits: [...b.habits, c.habit] };
    case "update":
      return { ...b, habits: b.habits.map((h) => (h.id === c.id ? { ...h, name: c.name, emoji: c.emoji, color: c.color } : h)) };
    case "delete":
      return { habits: b.habits.filter((h) => h.id !== c.id), completions: b.completions.filter((x) => x.habit_id !== c.id) };
    case "toggleDay": {
      const has = b.completions.some((x) => x.habit_id === c.habitId && x.date === c.date);
      return {
        ...b,
        completions: has
          ? b.completions.filter((x) => !(x.habit_id === c.habitId && x.date === c.date))
          : [...b.completions, { habit_id: c.habitId, date: c.date }],
      };
    }
  }
}

// Shift a YYYY-MM-DD string by whole days without local-timezone drift.
function shiftDay(day: string, delta: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Keep only the last character typed, so typing a new emoji replaces the old one.
function lastGrapheme(text: string) {
  const parts = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim()), (s) => s.segment);
  return parts[parts.length - 1] ?? "";
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

// EyeDropper only exists in Chromium browsers; the server snapshot keeps hydration stable.
const noSubscribe = () => () => {};
const useHasEyeDropper = () =>
  useSyncExternalStore(noSubscribe, () => "EyeDropper" in window, () => false);

function HabitForm({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: { name: string; emoji: string; color: string };
  submitLabel: string;
  onSave: (v: { name: string; emoji: string; color: string }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [color, setColor] = useState(initial.color);
  const hasDropper = useHasEyeDropper();

  const pickFromScreen = async () => {
    const Dropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      if (/^#[0-9a-f]{6}$/i.test(sRGBHex)) setColor(sRGBHex.toLowerCase());
    } catch {
      // The user pressed Esc; keep the current color.
    }
  };

  const label = { fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 } as const;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        onSave({ name: n, emoji: emoji.trim() || "🌟", color });
        if (!onCancel) {
          setName("");
          setEmoji("🌟");
        }
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name *" required className="lf-input" />
      <div>
        <label style={label}>Emoji — type any emoji, or pick one</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={emoji}
            onChange={(e) => setEmoji(lastGrapheme(e.target.value))}
            aria-label="Emoji"
            className="lf-input"
            style={{ width: 56, textAlign: "center", fontSize: 20, padding: "6px 4px" }}
          />
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              style={{ fontSize: 18, width: 32, height: 32, borderRadius: 8, border: `2px solid ${emoji === em ? color : "transparent"}`, background: "var(--input)", cursor: "pointer", padding: 0 }}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={label}>Color</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Open color wheel"
            style={{ width: 44, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "transparent" }}
          />
          {hasDropper && (
            <button type="button" onClick={pickFromScreen} title="Pick a color from the screen" className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
              🎯 Eyedropper
            </button>
          )}
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? "3px solid var(--foreground)" : "2px solid #fff", boxShadow: "0 0 0 1px var(--border)", cursor: "pointer", padding: 0 }}
            />
          ))}
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{color}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
            Cancel
          </button>
        )}
        <button type="submit" className="lf-btn lf-btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function HabitBoard({ habits, completions, today }: Board & { today: string }) {
  const [board, apply] = useOptimistic({ habits, completions }, reduce);
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const done = new Set(board.completions.map((c) => `${c.habit_id}|${c.date}`));
  const isDone = (habitId: string, date: string) => done.has(`${habitId}|${date}`);

  const last7Days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const last30Days = Array.from({ length: 30 }, (_, i) => shiftDay(today, i - 29));

  const getStreak = (habitId: string) => {
    let streak = 0;
    for (let d = today; isDone(habitId, d) && streak < 365; d = shiftDay(d, -1)) streak++;
    return streak;
  };

  const toggleDay = (habitId: string, date: string) =>
    run({ type: "toggleDay", habitId, date }, () =>
      toggleHabitDay(fd({ habit_id: habitId, date, was_completed: String(isDone(habitId, date)) })),
    );

  const add = (v: { name: string; emoji: string; color: string }) => {
    const id = crypto.randomUUID();
    run({ type: "add", habit: { id, user_id: "", ...v, created_at: new Date().toISOString() } }, () => addHabit(fd({ id, ...v })));
  };

  const save = (id: string, v: { name: string; emoji: string; color: string }) => {
    setEditId(null);
    run({ type: "update", id, ...v }, () => updateHabit(fd({ id, ...v })));
  };

  const remove = (id: string) => run({ type: "delete", id }, () => deleteHabit(fd({ id })));

  const dayLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

  return (
    <>
      <div className="lf-card">
        <HabitForm initial={{ name: "", emoji: "🌟", color: "#db2777" }} submitLabel="+ New habit" onSave={add} />
      </div>

      {board.habits.length > 0 && (
        <div className="lf-card" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: 4, minWidth: 480 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", padding: "4px 0" }}>Habit</div>
            {last7Days.map((d) => (
              <div
                key={d}
                style={{ textAlign: "center", fontSize: 11, color: d === today ? "var(--primary)" : "var(--muted)", fontWeight: d === today ? 700 : 400, padding: "4px 0" }}
              >
                {dayLabel(d)}
                <br />
                {Number(d.slice(8))}
              </div>
            ))}
            {board.habits.map((h) => (
              <div key={h.id} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{ fontSize: 18 }}>{h.emoji}</span>
                  <span style={{ fontSize: 13, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                </div>
                {last7Days.map((d) => {
                  const on = isDone(h.id, d);
                  return (
                    <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => toggleDay(h.id, d)}
                        aria-label={`${h.name} ${d}`}
                        aria-pressed={on}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: on ? h.color : "transparent",
                          border: `2px solid ${h.color}`,
                          opacity: on ? 1 : 0.35,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          color: "#fff",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {on ? "✓" : ""}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {board.habits.map((h) => {
          const streak = getStreak(h.id);
          const total = board.completions.filter((c) => c.habit_id === h.id).length;
          const rate = Math.round((last30Days.filter((d) => isDone(h.id, d)).length / 30) * 100);
          const doneToday = isDone(h.id, today);

          if (editId === h.id) {
            return (
              <div key={h.id} className="lf-card" style={{ borderLeft: `4px solid ${h.color}` }}>
                <HabitForm initial={h} submitLabel="Save habit" onSave={(v) => save(h.id, v)} onCancel={() => setEditId(null)} />
              </div>
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
                <button
                  type="button"
                  onClick={() => toggleDay(h.id, today)}
                  aria-pressed={doneToday}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: doneToday ? h.color : "transparent",
                    border: `2px solid ${h.color}`,
                    color: doneToday ? "#fff" : h.color,
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {doneToday ? "✓" : "○"}
                </button>
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
                <button type="button" onClick={() => setEditId(h.id)} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(h.id)}
                  style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
