"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Task } from "@/types/database";
import { addTask, advanceTaskStatus, updateTask, deleteTask } from "./actions";

const STATUSES = ["To Do", "In Progress", "Completed"] as const;
const PRIORITIES = ["Low", "Medium", "High"] as const;
const CATEGORIES = ["Personal", "Work", "Health", "Learning", "Fitness", "Finance", "Social", "Other"];
const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  "To Do": "In Progress",
  "In Progress": "Completed",
  Completed: "To Do",
};

const PRIORITY_COLORS: Record<string, [string, string]> = {
  High: ["#fee2e2", "#dc2626"],
  Medium: ["#fef3c7", "#d97706"],
  Low: ["#d1fae5", "#059669"],
};
const STATUS_COLORS: Record<string, [string, string]> = {
  "To Do": ["#f1f5f9", "#64748b"],
  "In Progress": ["#fef3c7", "#d97706"],
  Completed: ["#d1fae5", "#059669"],
};

type Change =
  | { type: "add"; task: Task }
  | { type: "update"; task: Task }
  | { type: "delete"; id: string };

function reduce(tasks: Task[], c: Change): Task[] {
  switch (c.type) {
    case "add":
      return [...tasks, c.task];
    case "update":
      return tasks.map((t) => (t.id === c.task.id ? c.task : t));
    case "delete":
      return tasks.filter((t) => t.id !== c.id);
  }
}

function Tag({ label, colors }: { label: string; colors: [string, string] }) {
  return <span className="tag" style={{ background: colors[0], color: colors[1] }}>{label}</span>;
}

function taskFromForm(f: FormData, base: Partial<Task>): Task {
  return {
    id: base.id!,
    user_id: base.user_id ?? "",
    created_at: base.created_at ?? new Date().toISOString(),
    title: String(f.get("title") ?? "").trim(),
    description: String(f.get("description") ?? "").trim() || null,
    due_date: String(f.get("due_date") ?? "") || null,
    priority: (f.get("priority") as Task["priority"]) || "Medium",
    category: String(f.get("category") ?? "").trim() || "Personal",
    status: (f.get("status") as Task["status"]) || base.status || "To Do",
  };
}

export default function TaskList({ tasks: serverTasks }: { tasks: Task[] }) {
  const [tasks, apply] = useOptimistic(serverTasks, reduce);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("due");
  const [editId, setEditId] = useState<string | null>(null);

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (!String(f.get("title") ?? "").trim()) return;
    const id = crypto.randomUUID();
    f.set("id", id);
    form.reset();
    run({ type: "add", task: taskFromForm(f, { id }) }, () => addTask(f));
  };

  const advance = (t: Task) => {
    const f = new FormData();
    f.set("id", t.id);
    f.set("status", t.status);
    run({ type: "update", task: { ...t, status: NEXT_STATUS[t.status] } }, () => advanceTaskStatus(f));
  };

  const save = (e: React.FormEvent<HTMLFormElement>, t: Task) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!String(f.get("title") ?? "").trim()) return;
    f.set("id", t.id);
    setEditId(null);
    run({ type: "update", task: taskFromForm(f, t) }, () => updateTask(f));
  };

  const remove = (id: string) => {
    const f = new FormData();
    f.set("id", id);
    run({ type: "delete", id }, () => deleteTask(f));
  };

  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const filtered = tasks
    .filter((t) => (filter === "All" ? true : t.status === filter))
    .sort((a, b) => {
      if (sort === "due") return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      if (sort === "priority") return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
      return a.title.localeCompare(b.title);
    });

  return (
    <>
      <form onSubmit={add} className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input name="title" placeholder="Task title *" required className="lf-input" />
        <textarea name="description" placeholder="Description (optional)" rows={2} className="lf-input" style={{ resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Due date</label>
            <input type="date" name="due_date" className="lf-input" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Priority</label>
            <select name="priority" defaultValue="Medium" className="lf-input">
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Category</label>
          <select name="category" defaultValue="Personal" className="lf-input">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="lf-btn lf-btn-primary">
            + New task
          </button>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        {[
          { label: "Total", val: tasks.length, color: "#db2777" },
          { label: "Completed", val: completed, color: "#10b981" },
          { label: "In progress", val: inProgress, color: "#f59e0b" },
          { label: "Completion rate", val: `${pct}%`, color: "#3b82f6" },
        ].map((s) => (
          <div key={s.label} className="lf-card" style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="lf-card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>Overall completion</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#db2777" }}>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #db2777, #ec4899)" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`lf-btn ${filter === s ? "lf-btn-primary" : "lf-btn-ghost"}`}
            style={{ padding: "6px 14px" }}
          >
            {s}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="lf-input" style={{ width: "auto", padding: "7px 12px", marginLeft: "auto" }}>
          <option value="due">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            No tasks found
          </div>
        )}
        {filtered.map((t) =>
          editId === t.id ? (
            <form key={t.id} onSubmit={(e) => save(e, t)} className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input name="title" defaultValue={t.title} required autoFocus className="lf-input" />
              <textarea name="description" defaultValue={t.description ?? ""} rows={2} className="lf-input" style={{ resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="date" name="due_date" defaultValue={t.due_date ?? ""} className="lf-input" />
                <select name="priority" defaultValue={t.priority} className="lf-input">
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select name="category" defaultValue={t.category} className="lf-input">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select name="status" defaultValue={t.status} className="lf-input">
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditId(null)} className="lf-btn lf-btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="lf-btn lf-btn-primary">
                  Save task
                </button>
              </div>
            </form>
          ) : (
            <div key={t.id} className="lf-card" style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button
                type="button"
                onClick={() => advance(t)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${t.status === "Completed" ? "#10b981" : "var(--border)"}`,
                  background: t.status === "Completed" ? "#10b981" : "transparent",
                  color: "#fff",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                  cursor: "pointer",
                }}
              >
                {t.status === "Completed" ? "✓" : t.status === "In Progress" ? "●" : ""}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--foreground)",
                      textDecoration: t.status === "Completed" ? "line-through" : "none",
                      opacity: t.status === "Completed" ? 0.6 : 1,
                    }}
                  >
                    {t.title}
                  </span>
                  <Tag label={t.priority} colors={PRIORITY_COLORS[t.priority]} />
                  <Tag label={t.status} colors={STATUS_COLORS[t.status]} />
                </div>
                {t.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t.description}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  {t.due_date && <span style={{ fontSize: 11, color: "var(--muted)" }}>📅 {t.due_date}</span>}
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>🏷 {t.category}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={() => setEditId(t.id)} className="lf-btn lf-btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}>
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  style={{ padding: "4px 8px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </>
  );
}
