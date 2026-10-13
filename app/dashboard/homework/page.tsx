import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { localToday, TIME_ZONE } from "@/lib/ical";
import { classChangeKind } from "@/lib/classChanges";
import type { Homework } from "@/types/database";
import { addHomework, updateHomework, toggleHomework, deleteHomework } from "./actions";
import SyncButton from "../sync/SyncButton";

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function groupLabel(date: string, today: string) {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${date}T12:00:00+07:00`),
  );
}

function urgency(diff: number) {
  if (diff <= 0) return { bg: "#fee2e2", fg: "#dc2626", text: "Due today" };
  if (diff <= 2) return { bg: "#ffedd5", fg: "#ea580c", text: `${diff} day${diff > 1 ? "s" : ""} left` };
  return { bg: "#fef3c7", fg: "#b45309", text: `${diff} days left` };
}

export default async function HomeworkPage(props: PageProps<"/dashboard/homework">) {
  const { edit: editParam, done: doneParam } = await props.searchParams;
  const editId = typeof editParam === "string" ? editParam : null;
  const showDone = doneParam === "1";
  const today = localToday();

  const supabase = await createClient();
  const { data } = await supabase
    .from("homework")
    .select("*")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });
  // Class cancellations / make-ups come through the same MyCourses feed but live on the Calendar.
  const rows = (data ?? []) as Homework[];
  const all = rows.filter((h) => !classChangeKind(h.title));
  const classChanges = rows.length - all.length;
  const visible = showDone ? all : all.filter((h) => !h.completed);
  const pending = all.filter((h) => !h.completed).length;
  const editing = editId ? all.find((h) => h.id === editId) ?? null : null;

  const groups = new Map<string, Homework[]>();
  for (const h of visible) groups.set(h.due_date, [...(groups.get(h.due_date) ?? []), h]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#fcd34d,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📚</div>
          <div>
            <h1 className="font-display text-3xl text-foreground">Homework</h1>
            <p className="text-sm text-muted">
              {pending} assignment{pending === 1 ? "" : "s"} to go, from today onward.
            </p>
            {classChanges > 0 && (
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                {classChanges} class cancellation{classChanges === 1 ? "" : "s"} / make-up{classChanges === 1 ? "" : "s"} are on the{" "}
                <Link href="/dashboard/calendar" style={{ color: "#db2777" }} className="hover:underline">
                  Calendar
                </Link>
                .
              </p>
            )}
          </div>
        </div>
        <SyncButton />
      </div>

      <form key={editing?.id ?? "new"} action={editing ? updateHomework : addHomework} className="lf-card">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 16 }}>{editing ? "Edit homework" : "Add homework"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input name="title" defaultValue={editing?.title ?? ""} placeholder="Assignment name" required className="lf-input" />
          <input name="course" defaultValue={editing?.course ?? ""} placeholder="Course (e.g. ITCS241)" className="lf-input" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="date" name="due_date" defaultValue={editing?.due_date ?? today} min={editing ? undefined : today} required className="lf-input" />
            <input type="time" name="due_time" defaultValue={editing?.due_time?.slice(0, 5) ?? "23:59"} className="lf-input" />
          </div>
          <input type="url" name="url" defaultValue={editing?.url ?? ""} placeholder="Link (optional)" className="lf-input" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {editing && (
              <Link href="/dashboard/homework" className="lf-btn lf-btn-ghost">
                Cancel
              </Link>
            )}
            <button type="submit" className="lf-btn lf-btn-primary">
              {editing ? "Save" : "+ Add homework"}
            </button>
          </div>
        </div>
      </form>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href={showDone ? "/dashboard/homework" : "/dashboard/homework?done=1"} className="lf-btn lf-btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
          {showDone ? "Hide submitted" : "Show submitted"}
        </Link>
      </div>

      {groups.size === 0 && (
        <div className="lf-card" style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          No homework due. Press Sync to check MyCourses for new assignments.
        </div>
      )}

      {[...groups.entries()].map(([date, items]) => {
        const diff = daysBetween(today, date);
        const u = urgency(diff);
        return (
          <div key={date} className="lf-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>{groupLabel(date, today)}</h3>
              <span style={{ background: u.bg, color: u.fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{u.text}</span>
            </div>
            {items.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <form action={toggleHomework}>
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="completed" value={String(h.completed)} />
                  <button type="submit" title={h.completed ? "Mark as not submitted" : "Mark as submitted"} className="text-lg leading-none">
                    {h.completed ? "☑️" : "⬜️"}
                  </button>
                </form>
                <div style={{ background: "#fff7ed", color: "#ea580c", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 56, textAlign: "center" }}>
                  {h.due_time ? h.due_time.slice(0, 5) : "All day"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: h.completed ? "var(--muted)" : "var(--foreground)", textDecoration: h.completed ? "line-through" : "none" }}>
                    {h.url ? (
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {h.title} ↗
                      </a>
                    ) : (
                      h.title
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {h.course ?? "No course"}
                    {h.source === "moodle" && " · MyCourses"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Link href={`/dashboard/homework?edit=${h.id}`} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                    Edit
                  </Link>
                  <form action={deleteHomework}>
                    <input type="hidden" name="id" value={h.id} />
                    <button type="submit" style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}>
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
