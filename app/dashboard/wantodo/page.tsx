import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { WantItem } from "@/types/database";
import { addWantItem, updateWantItem, toggleWantItem, deleteWantItem } from "./actions";

const WANT_CATS = ["Learning", "Travel", "Hobby", "Career", "Personal Growth", "Fun", "Other"];
const WANT_CAT_COLORS: Record<string, string> = {
  Learning: "#f59e0b",
  Travel: "#06b6d4",
  Hobby: "#a78bfa",
  Career: "#3b82f6",
  "Personal Growth": "#10b981",
  Fun: "#f97316",
  Other: "#94a3b8",
};
const WANT_CAT_BG: Record<string, string> = {
  Learning: "#fffbeb",
  Travel: "#ecfeff",
  Hobby: "#f5f3ff",
  Career: "#eff6ff",
  "Personal Growth": "#f0fdf4",
  Fun: "#fff7ed",
  Other: "#f8fafc",
};

export default async function WantToDoPage(props: PageProps<"/dashboard/wantodo">) {
  const { category: categoryParam, q: qParam, edit: editParam } = await props.searchParams;
  const filterCat = typeof categoryParam === "string" ? categoryParam : "All";
  const search = typeof qParam === "string" ? qParam : "";
  const editId = typeof editParam === "string" ? editParam : null;

  const supabase = await createClient();
  const { data } = await supabase.from("want_items").select("*").order("created_at", { ascending: false });
  const items = (data ?? []) as WantItem[];
  const editing = editId ? items.find((i) => i.id === editId) ?? null : null;

  const done = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const catCounts: Record<string, number> = {};
  WANT_CATS.forEach((c) => (catCounts[c] = items.filter((i) => i.category === c).length));

  const filtered = items
    .filter((i) => filterCat === "All" || i.category === filterCat)
    .filter((i) => `${i.title}${i.note ?? ""}${i.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.created_at.localeCompare(a.created_at));

  const qs = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filterCat !== "All") params.set("category", filterCat);
    if (search) params.set("q", search);
    Object.entries(overrides).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    return `/dashboard/wantodo?${params.toString()}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#f9a8d4,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            🌟
          </div>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, color: "var(--foreground)", lineHeight: 1 }}>Want To Do</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Dreams, ideas, and experiences I want to explore.</p>
          </div>
        </div>
      </div>

      {/* Add / Edit form (prototype uses a modal; this is always visible inline) */}
      <form key={editing?.id ?? "new"} action={editing ? updateWantItem : addWantItem} className="lf-card">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#f9a8d4,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🌟
          </div>
          <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>{editing ? "Edit goal" : "Add new goal"}</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input name="title" defaultValue={editing?.title ?? ""} placeholder="e.g. Visit Japan, Learn Blender…" required className="lf-input" />
          <select name="category" defaultValue={editing?.category ?? "Learning"} className="lf-input" style={{ width: "auto" }}>
            {WANT_CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <textarea name="note" defaultValue={editing?.note ?? ""} placeholder="Why do you want this? Any details…" rows={2} className="lf-input" style={{ resize: "vertical" }} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {editing && (
              <Link href={qs({ edit: "" })} className="lf-btn lf-btn-ghost">
                Cancel
              </Link>
            )}
            <button type="submit" style={{ padding: "10px 22px", borderRadius: 10, background: "linear-gradient(135deg,#f472b6,#fb923c)", color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>
              {editing ? "Save changes" : "Add goal"}
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
            <span style={{ fontSize: 20, fontWeight: 700, background: "linear-gradient(90deg,#f472b6,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "#fce7f3", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#f472b6,#fb923c)", width: `${pct}%`, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href={qs({ category: "" })}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: `1.5px solid ${filterCat === "All" ? "#f472b6" : "var(--border)"}`,
            background: filterCat === "All" ? "#f472b6" : "transparent",
            color: filterCat === "All" ? "#fff" : "var(--muted)",
          }}
        >
          All ({total})
        </Link>
        {WANT_CATS.filter((c) => catCounts[c] > 0).map((c) => (
          <Link
            key={c}
            href={qs({ category: filterCat === c ? "" : c })}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: `1.5px solid ${filterCat === c ? WANT_CAT_COLORS[c] : "var(--border)"}`,
              background: filterCat === c ? WANT_CAT_COLORS[c] : "transparent",
              color: filterCat === c ? "#fff" : "var(--muted)",
            }}
          >
            {c} ({catCounts[c]})
          </Link>
        ))}
      </div>

      <form action="/dashboard/wantodo">
        {filterCat !== "All" && <input type="hidden" name="category" value={filterCat} />}
        <input name="q" defaultValue={search} placeholder="🔍 Search goals, ideas, dreams…" className="lf-input" />
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌸</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "var(--foreground)" }}>
              {search || filterCat !== "All" ? "No matches found" : "Your dream list awaits"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              {search || filterCat !== "All" ? "Try a different search or filter." : "Start adding things you want to do, learn, and experience."}
            </div>
          </div>
        )}
        {filtered.map((item) => {
          const catColor = WANT_CAT_COLORS[item.category] ?? "#94a3b8";
          const cardBg = WANT_CAT_BG[item.category] ?? "#fff";
          return (
            <div key={item.id} className="lf-card" style={{ background: cardBg, border: `1px solid ${catColor}30`, opacity: item.completed ? 0.7 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: catColor + "22", color: catColor, fontWeight: 700 }}>{item.category}</span>
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
                  <form action={toggleWantItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="completed" value={String(item.completed)} />
                    <button
                      type="submit"
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: `1.5px solid ${catColor}`,
                        background: item.completed ? catColor : "transparent",
                        color: item.completed ? "#fff" : catColor,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {item.completed ? "✓ Done" : "Mark done"}
                    </button>
                  </form>
                  <Link href={qs({ edit: item.id })} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "var(--input)", color: "var(--muted)" }}>
                    ✏️
                  </Link>
                  <form action={deleteWantItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer" }}>
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
