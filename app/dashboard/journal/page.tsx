import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/types/database";
import { addJournalEntry, updateJournalEntry, deleteJournalEntry } from "./actions";

const PROMPTS = [
  "What made you smile today?",
  "What challenge did you overcome today?",
  "What are you grateful for today?",
  "What is one thing you want to improve tomorrow?",
  "Describe a moment of peace you experienced today.",
  "What did you learn about yourself today?",
  "Who inspired you today, and why?",
  "What would you do differently if you could replay today?",
];

export default async function JournalPage(props: PageProps<"/dashboard/journal">) {
  const { view: viewParam, q: qParam, edit: editParam } = await props.searchParams;
  const view = typeof viewParam === "string" ? viewParam : "list";
  const search = typeof qParam === "string" ? qParam : "";
  const editId = typeof editParam === "string" ? editParam : null;
  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length];

  const supabase = await createClient();
  const { data } = await supabase.from("journal_entries").select("*").order("date", { ascending: false });
  const entries = (data ?? []) as JournalEntry[];
  const editing = editId ? entries.find((e) => e.id === editId) ?? null : null;

  const filtered = entries.filter((j) =>
    `${j.title ?? ""}${j.content}${j.prompt ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Journal</h2>
        {view === "list" && (
          <Link href="/dashboard/journal?view=write" className="lf-btn lf-btn-primary">
            + New entry
          </Link>
        )}
      </div>

      {(view === "write" || editing) && (
        <form key={editing?.id ?? "new"} action={editing ? updateJournalEntry : addJournalEntry} className="lf-card">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {!editing && (
            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8b5cf6", marginBottom: 4 }}>✨ Today&apos;s prompt</div>
              <div style={{ fontSize: 14, color: "#6d28d9", fontStyle: "italic" }}>{prompt}</div>
              <input type="hidden" name="prompt" value={prompt} />
            </div>
          )}
          <input
            name="title"
            placeholder="Entry title (optional)"
            defaultValue={editing?.title ?? ""}
            className="lf-input"
            style={{ marginBottom: 12, fontSize: 16 }}
          />
          <textarea
            name="content"
            placeholder="Write your thoughts here..."
            defaultValue={editing?.content ?? ""}
            required
            rows={12}
            className="lf-input"
            style={{ resize: "vertical", lineHeight: 1.7 }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <Link href="/dashboard/journal" className="lf-btn lf-btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="lf-btn lf-btn-primary">
              Save entry
            </button>
          </div>
        </form>
      )}

      {view === "list" && !editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8b5cf6", marginBottom: 6 }}>✨ Today&apos;s reflection prompt</div>
            <div style={{ fontSize: 15, color: "#6d28d9", fontStyle: "italic", marginBottom: 12 }}>&quot;{prompt}&quot;</div>
            <Link href="/dashboard/journal?view=write" className="lf-btn lf-btn-primary" style={{ fontSize: 13 }}>
              Start writing
            </Link>
          </div>

          <form action="/dashboard/journal">
            <input name="q" defaultValue={search} placeholder="🔍 Search entries..." className="lf-input" />
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
                {search ? "No entries found" : "Start writing your first entry"}
              </div>
            )}
            {filtered.map((j) => (
              <div key={j.id} className="lf-card">
                <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 600, marginBottom: 4 }}>📅 {j.date}</div>
                {j.title && <div style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>{j.title}</div>}
                {j.prompt && <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--muted)", marginBottom: 6 }}>{j.prompt}</div>}
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    lineHeight: 1.6,
                  }}
                >
                  {j.content}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                  <Link href={`/dashboard/journal?edit=${j.id}`} style={{ fontSize: 11, color: "#8b5cf6" }}>
                    Edit
                  </Link>
                  <form action={deleteJournalEntry}>
                    <input type="hidden" name="id" value={j.id} />
                    <button type="submit" style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}>
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
