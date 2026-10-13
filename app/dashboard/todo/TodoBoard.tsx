"use client";

import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import type { Project, TodoItem } from "@/types/database";
import { addProject, deleteProject, addTodo, toggleTodo, updateTodo, deleteTodo } from "./actions";

type Board = { projects: Project[]; items: TodoItem[] };

type Change =
  | { type: "addProject"; project: Project }
  | { type: "deleteProject"; id: string }
  | { type: "addItem"; item: TodoItem }
  | { type: "toggleItem"; id: string }
  | { type: "updateItem"; id: string; text: string }
  | { type: "deleteItem"; id: string };

function reduce(b: Board, c: Change): Board {
  switch (c.type) {
    case "addProject":
      return { ...b, projects: [...b.projects, c.project] };
    case "deleteProject":
      // Mirrors the FK's ON DELETE SET NULL: items fall back to the Inbox.
      return {
        projects: b.projects.filter((p) => p.id !== c.id),
        items: b.items.map((i) => (i.project_id === c.id ? { ...i, project_id: null } : i)),
      };
    case "addItem":
      return { ...b, items: [c.item, ...b.items] };
    case "toggleItem":
      return { ...b, items: b.items.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i)) };
    case "updateItem":
      return { ...b, items: b.items.map((i) => (i.id === c.id ? { ...i, text: c.text } : i)) };
    case "deleteItem":
      return { ...b, items: b.items.filter((i) => i.id !== c.id) };
  }
}

function ProjectCard({
  id,
  emoji,
  name,
  items,
  onAdd,
  onToggle,
  onEditItem,
  onDeleteItem,
  onDelete,
}: {
  id: string;
  emoji: string;
  name: string;
  items: TodoItem[];
  onAdd: (projectId: string, text: string) => void;
  onToggle: (item: TodoItem) => void;
  onEditItem: (id: string, text: string) => void;
  onDeleteItem: (id: string) => void;
  onDelete?: () => void;
}) {
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const saveEdit = (id: string) => {
    const t = editText.trim();
    setEditId(null);
    if (t) onEditItem(id, t);
  };
  const done = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const sorted = [...items].sort((a, b) => {
    if (a.completed === b.completed) return b.created_at.localeCompare(a.created_at);
    return Number(a.completed) - Number(b.completed);
  });

  return (
    <div className="lf-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-lg">{emoji}</span> {name}
        </h2>
        {onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-muted hover:text-primary" title="Delete project">
            ✕
          </button>
        )}
      </div>

      {total > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{done}/{total} done</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--primary)" }} />
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          setText("");
          onAdd(id, t);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task..."
          className="lf-input"
          style={{ padding: "6px 10px", fontSize: 13 }}
        />
        <button type="submit" className="lf-btn lf-btn-primary shrink-0" style={{ padding: "6px 12px", fontSize: 13 }}>
          +
        </button>
      </form>

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {sorted.map((item) =>
          editId === item.id ? (
            <form
              key={item.id}
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit(item.id);
              }}
              className="flex items-center gap-2 px-1 py-1"
            >
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditId(null)}
                autoFocus
                className="lf-input"
                style={{ padding: "4px 8px", fontSize: 13 }}
              />
              <button type="submit" className="lf-btn lf-btn-primary shrink-0" style={{ padding: "4px 10px", fontSize: 12 }}>
                Save
              </button>
              <button type="button" onClick={() => setEditId(null)} className="text-xs text-muted hover:text-primary" title="Cancel">
                ✕
              </button>
            </form>
          ) : (
          <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
            <button type="button" onClick={() => onToggle(item)} className="text-base leading-none">
              {item.completed ? "☑️" : "⬜️"}
            </button>
            <span
              onDoubleClick={() => {
                setEditId(item.id);
                setEditText(item.text);
              }}
              className={`flex-1 truncate text-sm ${item.completed ? "text-muted line-through" : "text-foreground"}`}
            >
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditId(item.id);
                setEditText(item.text);
              }}
              className="text-xs opacity-60 hover:opacity-100"
              title="Edit"
            >
              ✏️
            </button>
            <button type="button" onClick={() => onDeleteItem(item.id)} className="text-xs text-muted hover:text-primary" title="Delete">
              ✕
            </button>
          </div>
          ),
        )}
        {sorted.length === 0 && <p className="py-2 text-center text-sm text-muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

export default function TodoBoard({ projects, items }: Board) {
  const [board, apply] = useOptimistic({ projects, items }, reduce);
  const [, startTransition] = useTransition();
  const [projectName, setProjectName] = useState("");

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const addProj = (e: React.FormEvent) => {
    e.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    setProjectName("");
    run(
      { type: "addProject", project: { id, user_id: "", name, emoji: "📁", created_at: new Date().toISOString() } },
      () => addProject(fd({ id, name })),
    );
  };

  const addItem = (projectId: string, text: string) => {
    const id = crypto.randomUUID();
    run(
      {
        type: "addItem",
        item: { id, user_id: "", project_id: projectId === "inbox" ? null : projectId, text, completed: false, created_at: new Date().toISOString() },
      },
      () => addTodo(fd({ id, text, project_id: projectId })),
    );
  };

  const toggleItem = (item: TodoItem) =>
    run({ type: "toggleItem", id: item.id }, () => toggleTodo(fd({ id: item.id, completed: String(item.completed) })));

  const editItem = (id: string, text: string) =>
    run({ type: "updateItem", id, text }, () => updateTodo(fd({ id, text })));

  const deleteItem = (id: string) => run({ type: "deleteItem", id }, () => deleteTodo(fd({ id })));

  const deleteProj = (id: string) => run({ type: "deleteProject", id }, () => deleteProject(fd({ id })));

  const cardProps = { onAdd: addItem, onToggle: toggleItem, onEditItem: editItem, onDeleteItem: deleteItem };

  return (
    <>
      <form onSubmit={addProj} className="lf-card mt-6 flex gap-2">
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New project name..." className="lf-input" />
        <button type="submit" className="lf-btn shrink-0 bg-sidebar-active text-white hover:opacity-90">
          + Add Project
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <ProjectCard id="inbox" emoji="📥" name="Inbox" items={board.items.filter((i) => !i.project_id)} {...cardProps} />
        {board.projects.map((p) => (
          <ProjectCard
            key={p.id}
            id={p.id}
            emoji={p.emoji}
            name={p.name}
            items={board.items.filter((i) => i.project_id === p.id)}
            onDelete={() => deleteProj(p.id)}
            {...cardProps}
          />
        ))}
      </div>
    </>
  );
}
