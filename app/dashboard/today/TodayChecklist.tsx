"use client";

import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import type { TodayItem } from "@/types/database";
import { addTodayItem, toggleTodayItem, deleteTodayItem, updateTodayItem, clearCompletedToday } from "./actions";

type Change =
  | { type: "add"; item: TodayItem }
  | { type: "toggle"; id: string }
  | { type: "update"; id: string; text: string }
  | { type: "delete"; id: string }
  | { type: "clearCompleted" };

function reduce(items: TodayItem[], c: Change): TodayItem[] {
  switch (c.type) {
    case "add":
      return [c.item, ...items];
    case "toggle":
      return items.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i));
    case "update":
      return items.map((i) => (i.id === c.id ? { ...i, text: c.text } : i));
    case "delete":
      return items.filter((i) => i.id !== c.id);
    case "clearCompleted":
      return items.filter((i) => !i.completed);
  }
}

export default function TodayChecklist({ items: serverItems }: { items: TodayItem[] }) {
  const [items, apply] = useOptimistic(serverItems, reduce);
  const [, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setText("");
    run(
      { type: "add", item: { id, user_id: "", text: t, completed: false, date: now.slice(0, 10), created_at: now } },
      () => addTodayItem(fd({ id, text: t })),
    );
  };

  const toggle = (item: TodayItem) =>
    run({ type: "toggle", id: item.id }, () => toggleTodayItem(fd({ id: item.id, completed: String(item.completed) })));

  const remove = (id: string) => run({ type: "delete", id }, () => deleteTodayItem(fd({ id })));

  const saveEdit = (id: string) => {
    const t = editText.trim();
    setEditId(null);
    if (!t) return;
    run({ type: "update", id, text: t }, () => updateTodayItem(fd({ id, text: t })));
  };

  const clearDone = () => run({ type: "clearCompleted" }, () => clearCompletedToday());

  const done = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  const sorted = [...items].sort((a, b) => {
    if (a.completed === b.completed) return b.created_at.localeCompare(a.created_at);
    return Number(a.completed) - Number(b.completed);
  });
  const incomplete = sorted.filter((i) => !i.completed);
  const completedItems = sorted.filter((i) => i.completed);

  const row = (item: TodayItem, isLast: boolean) => {
    const rowStyle = { display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)" };
    if (editId === item.id) {
      return (
        <form key={item.id} onSubmit={(e) => { e.preventDefault(); saveEdit(item.id); }} style={rowStyle}>
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditId(null)}
            autoFocus
            className="lf-input"
            style={{ flex: 1, padding: "6px 10px", fontSize: 14 }}
          />
          <button type="submit" style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "#ec4899", color: "#fff", border: "none", cursor: "pointer", fontWeight: 500 }}>
            Save
          </button>
          <button type="button" onClick={() => setEditId(null)} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 8, background: "var(--input)", color: "var(--muted)", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </form>
      );
    }
    return (
      <div key={item.id} style={rowStyle}>
        <button
          type="button"
          onClick={() => toggle(item)}
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
        <span style={{ flex: 1, fontSize: 14, color: "var(--foreground)", textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.45 : 1, lineHeight: 1.5 }}>
          {item.text}
        </span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => { setEditId(item.id); setEditText(item.text); }}
            style={{ fontSize: 13, padding: "3px 8px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", opacity: 0.6 }}
            title="Edit"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => remove(item.id)}
            style={{ fontSize: 13, padding: "3px 8px", borderRadius: 8, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", opacity: 0.7 }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #f9a8d4, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            ☀️
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>Today&apos;s Plan</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{allDone ? "🎉 Everything done — great work!" : "Focus on what matters today."}</p>
          </div>
        </div>
      </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total", val: total, icon: "📋" },
          { label: "Completed", val: done, icon: "✅" },
          { label: "Remaining", val: total - done, icon: "⏳" },
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
        <form onSubmit={add} style={{ display: "flex", gap: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Read Python for 30 minutes, Buy groceries…"
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
            {incomplete.map((item, idx) => row(item, idx === incomplete.length - 1 && completedItems.length === 0))}
          </div>
        )}

        {completedItems.length > 0 && (
          <div>
            <div style={{ padding: "14px 20px 6px", fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>✅ Completed — {done}</span>
              <button type="button" onClick={clearDone} style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}>
                Clear all
              </button>
            </div>
            {completedItems.map((item, idx) => row(item, idx === completedItems.length - 1))}
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
    </>
  );
}
