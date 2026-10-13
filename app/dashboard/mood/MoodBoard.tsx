"use client";

import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import type { Mood } from "@/types/database";
import { setMood, deleteMood } from "./actions";

const MOODS = [
  { label: "Very Happy", icon: "😄", value: 5, color: "#22c55e" },
  { label: "Happy", icon: "🙂", value: 4, color: "#84cc16" },
  { label: "Neutral", icon: "😐", value: 3, color: "#f59e0b" },
  { label: "Sad", icon: "😔", value: 2, color: "#f97316" },
  { label: "Very Sad", icon: "😢", value: 1, color: "#ef4444" },
] as const;

type Change = { type: "set"; mood: Mood } | { type: "delete"; date: string };

function reduce(moods: Mood[], c: Change): Mood[] {
  switch (c.type) {
    case "set":
      return [...moods.filter((m) => m.date !== c.mood.date), c.mood];
    case "delete":
      return moods.filter((m) => m.date !== c.date);
  }
}

// Shift a YYYY-MM-DD string by whole days without local-timezone drift.
function shiftDay(day: string, delta: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const longDate = (day: string) =>
  new Date(day + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function MoodBoard({ moods: serverMoods, today }: { moods: Mood[]; today: string }) {
  const [moods, apply] = useOptimistic(serverMoods, reduce);
  const [, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState(() => serverMoods.find((m) => m.date === today)?.note ?? "");
  const [showAll, setShowAll] = useState(false);

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const byDate = new Map(moods.map((m) => [m.date, m]));
  const selected = byDate.get(date) ?? null;
  const todayMood = byDate.get(today) ?? null;

  const pickDate = (d: string) => {
    if (!d || d > today) return;
    setDate(d);
    setNote(byDate.get(d)?.note ?? "");
  };

  const save = (value: number) => {
    const n = note.trim() || null;
    run(
      { type: "set", mood: { id: selected?.id ?? date, user_id: "", date, value: value as Mood["value"], note: n } },
      () => setMood(fd({ date, value: String(value), note: n ?? "" })),
    );
  };

  const remove = (d: string) => {
    if (d === date) setNote("");
    run({ type: "delete", date: d }, () => deleteMood(fd({ date: d })));
  };

  const last14 = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
  const avg = moods.length ? (moods.reduce((s, m) => s + m.value, 0) / moods.length).toFixed(1) : "—";
  const sorted = [...moods].sort((a, b) => b.date.localeCompare(a.date));
  const recent = showAll ? sorted : sorted.slice(0, 10);
  const yesterday = shiftDay(today, -1);

  const chip = (active: boolean) => ({
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: `1.5px solid ${active ? "#db2777" : "var(--border)"}`,
    background: active ? "#db2777" : "transparent",
    color: active ? "#fff" : "var(--muted)",
    cursor: "pointer",
  });

  return (
    <>
      <div className="lf-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          <h3 style={{ fontWeight: 600, color: "var(--foreground)" }}>{date === today ? "How are you feeling today?" : "How were you feeling?"}</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => pickDate(today)} style={chip(date === today)}>
              Today
            </button>
            <button type="button" onClick={() => pickDate(yesterday)} style={chip(date === yesterday)}>
              Yesterday
            </button>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => pickDate(e.target.value)}
              aria-label="Pick a date"
              className="lf-input"
              style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
            />
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          {longDate(date)}
          {selected ? " · logged — pick a mood to change it" : date !== today ? " · not logged yet" : ""}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => save(m.value)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                borderRadius: 14,
                border: `2px solid ${selected?.value === m.value ? m.color : "transparent"}`,
                background: selected?.value === m.value ? m.color + "20" : "transparent",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 32 }}>{m.icon}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.label}</span>
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about your day (optional)..."
          rows={2}
          className="lf-input"
          style={{ resize: "vertical" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
          <p style={{ fontSize: 11, color: "var(--muted)" }}>Pick a mood above to save it along with your note.</p>
          {selected && (selected.note ?? "") !== note.trim() && (
            <button type="button" onClick={() => save(selected.value)} className="lf-btn lf-btn-primary" style={{ padding: "4px 12px", fontSize: 12 }}>
              Save note
            </button>
          )}
        </div>
      </div>

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
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 4, fontSize: 15 }}>Last 14 days</h3>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>Tap a day to log or change it.</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96 }}>
          {last14.map((d) => {
            const m = byDate.get(d);
            const h = m ? (m.value / 5) * 72 : 0;
            const moodData = m ? MOODS.find((x) => x.value === m.value) : null;
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => pickDate(d)}
                title={d}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2, height: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <div
                  style={{
                    width: "100%",
                    height: m ? h : 4,
                    background: moodData?.color || "var(--border)",
                    borderRadius: "4px 4px 0 0",
                    minHeight: 4,
                    opacity: m ? 0.85 : 0.5,
                  }}
                />
                <div style={{ fontSize: 9, marginTop: 4, color: active ? "#db2777" : "var(--muted)", fontWeight: active ? 700 : 400 }}>{Number(d.slice(8))}</div>
              </button>
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
            <div key={m.date} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => pickDate(m.date)}
                title="Edit this day"
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 24 }}>{moodData?.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 500, color: "var(--foreground)", fontSize: 14 }}>{moodData?.label}</span>
                    <span style={{ fontSize: 11, color: m.date === date ? "#db2777" : "var(--muted)" }}>{m.date}</span>
                  </span>
                  {m.note && <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{m.note}</span>}
                </span>
              </button>
              <button type="button" onClick={() => remove(m.date)} title="Delete" style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}>
                ✕
              </button>
            </div>
          );
        })}
        {sorted.length > 10 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="lf-btn lf-btn-ghost" style={{ marginTop: 10, padding: "4px 10px", fontSize: 12 }}>
            {showAll ? "Show less ▲" : `Show all ${sorted.length} ▼`}
          </button>
        )}
      </div>
    </>
  );
}
