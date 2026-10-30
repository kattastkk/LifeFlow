"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import { WANT_CATS, catBg, catColor } from "@/lib/wantCategories";
import type { WantItem } from "@/types/database";
import { addWantItem, updateWantItem, toggleWantItem, deleteWantItem } from "./actions";

type Change =
  | { type: "add"; item: WantItem }
  | { type: "update"; id: string; title: string; category: string; note: string | null }
  | { type: "toggle"; id: string }
  | { type: "delete"; id: string };

function reduce(items: WantItem[], c: Change): WantItem[] {
  switch (c.type) {
    case "add":
      return [c.item, ...items];
    case "update":
      return items.map((i) => (i.id === c.id ? { ...i, title: c.title, category: c.category, note: c.note } : i));
    case "toggle":
      return items.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i));
    case "delete":
      return items.filter((i) => i.id !== c.id);
  }
}

export default function WantBoard({ items: serverItems }: { items: WantItem[] }) {
  const [items, apply] = useOptimistic(serverItems, reduce);
  const [, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Learning");
  const [note, setNote] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  // Built-in categories first, then any custom ones already in use.
  const used = Array.from(new Set(items.map((i) => i.category)));
  const allCats = [...WANT_CATS, ...used.filter((c) => !WANT_CATS.includes(c)).sort()];

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setCategory("Learning");
    setNote("");
  };

  const startEdit = (item: WantItem) => {
    setEditId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setNote(item.note ?? "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const cat = category.trim().slice(0, 40) || "Other";
    const n = note.trim() || null;
    if (editId) {
      const id = editId;
      run({ type: "update", id, title: t, category: cat, note: n }, () => updateWantItem(fd({ id, title: t, category: cat, note: n ?? "" })));
    } else {
      const id = crypto.randomUUID();
      run(
        { type: "add", item: { id, user_id: "", title: t, category: cat, note: n, completed: false, created_at: new Date().toISOString() } },
        () => addWantItem(fd({ id, title: t, category: cat, note: n ?? "" })),
      );
    }
    resetForm();
  };

  const toggle = (item: WantItem) =>
    run({ type: "toggle", id: item.id }, () => toggleWantItem(fd({ id: item.id, completed: String(item.completed) })));

  const remove = (id: string) => {
    if (editId === id) resetForm();
    run({ type: "delete", id }, () => deleteWantItem(fd({ id })));
  };

  const done = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const catCounts: Record<string, number> = {};
  items.forEach((i) => (catCounts[i.category] = (catCounts[i.category] ?? 0) + 1));
  // A filter on a category that no longer has items falls back to All.
  const activeCat = filterCat !== "All" && !catCounts[filterCat] ? "All" : filterCat;

  const filtered = items
    .filter((i) => activeCat === "All" || i.category === activeCat)
    .filter((i) => `${i.title}${i.note ?? ""}${i.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.created_at.localeCompare(a.created_at));

  const chip = (active: boolean, color: string) => ({
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: `1.5px solid ${active ? color : "var(--border)"}`,
    background: active ? color : "transparent",
    color: active ? "#fff" : "var(--muted)",
    cursor: "pointer",
  });

  return (
    <>
      <form ref={formRef} onSubmit={submit} className="lf-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,var(--primary-light),var(--highlight))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🌟
          </div>
          <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>{editId ? "Edit goal" : "Add new goal"}</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Visit Japan, Learn Blender…" required className="lf-input" />
          <div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category — pick one below or type your own"
              maxLength={40}
              className="lf-input"
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {allCats.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{ ...chip(category.trim() === c, catColor(c)), padding: "3px 10px", fontSize: 11 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why do you want this? Any details…" rows={2} className="lf-input" style={{ resize: "vertical" }} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {editId && (
              <button type="button" onClick={resetForm} className="lf-btn lf-btn-ghost">
                Cancel
              </button>
            )}
            <button type="submit" style={{ padding: "10px 22px", borderRadius: 10, background: "linear-gradient(135deg,var(--primary),var(--highlight))", color: "var(--on-primary)", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>
              {editId ? "Save changes" : "Add goal"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
        {[
          { label: "Total goals", val: total, icon: "🌟" },
          { label: "Achieved", val: done, icon: "🏆" },
          { label: "Still dreaming", val: total - done, icon: "💭" },
          { label: "Completion", val: `${pct}%`, icon: "📊" },
        ].map((s) => (
          <div key={s.label} className="lf-card" style={{ textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", marginTop: 4 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="lf-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>Goals achieved</span>
            <span style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(90deg,var(--primary),var(--highlight))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "var(--primary-soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,var(--primary),var(--highlight))", width: `${pct}%`, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setFilterCat("All")} style={chip(activeCat === "All", "var(--primary)")}>
          All ({total})
        </button>
        {allCats
          .filter((c) => catCounts[c])
          .map((c) => (
            <button key={c} type="button" onClick={() => setFilterCat(activeCat === c ? "All" : c)} style={chip(activeCat === c, catColor(c))}>
              {c} ({catCounts[c]})
            </button>
          ))}
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search goals, ideas, dreams…" className="lf-input" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌸</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--foreground)" }}>
              {search || activeCat !== "All" ? "No matches found" : "Your dream list awaits"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              {search || activeCat !== "All" ? "Try a different search or filter." : "Start adding things you want to do, learn, and experience."}
            </div>
          </div>
        )}
        {filtered.map((item) => {
          const color = catColor(item.category);
          return (
            <div key={item.id} className="lf-card" style={{ background: catBg(item.category), border: `1px solid ${color}30`, opacity: item.completed ? 0.7 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color + "22", color, fontWeight: 700 }}>{item.category}</span>
                {item.completed && (
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#d1fae5", color: "#059669", fontWeight: 700 }}>✓ Achieved</span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--foreground)", marginBottom: item.note ? 6 : 0, textDecoration: item.completed ? "line-through" : "none", lineHeight: 1.4 }}>
                {item.title}
              </div>
              {item.note && <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>{item.note}</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>
                  {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${color}`,
                      background: item.completed ? color : "transparent",
                      color: item.completed ? "#fff" : color,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {item.completed ? "✓ Done" : "Mark done"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    title="Edit"
                    style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "var(--input)", color: "var(--muted)", border: "none", cursor: "pointer" }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    title="Delete"
                    style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
