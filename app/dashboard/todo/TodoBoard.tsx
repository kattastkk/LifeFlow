"use client";

import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import type { Project, TodoItem } from "@/types/database";
import {
  addProject,
  renameProject,
  deleteProject,
  saveBoardOrder,
  addTodo,
  toggleTodo,
  updateTodo,
  deleteTodo,
} from "./actions";

// order holds box ids ("inbox" or a project id) from left to right.
type Board = { projects: Project[]; items: TodoItem[]; order: string[] };

type Change =
  | { type: "addProject"; project: Project }
  | { type: "renameProject"; id: string; name: string }
  | { type: "deleteProject"; id: string }
  | { type: "reorder"; order: string[] }
  | { type: "addItem"; item: TodoItem }
  | { type: "toggleItem"; id: string }
  | { type: "updateItem"; id: string; text: string }
  | { type: "deleteItem"; id: string };

function reduce(b: Board, c: Change): Board {
  switch (c.type) {
    case "addProject":
      return { ...b, projects: [...b.projects, c.project] };
    case "renameProject":
      return { ...b, projects: b.projects.map((p) => (p.id === c.id ? { ...p, name: c.name } : p)) };
    case "reorder":
      return { ...b, order: c.order };
    case "deleteProject":
      // Mirrors the FK's ON DELETE SET NULL: items fall back to the Inbox.
      return {
        ...b,
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
  onRename,
  onDelete,
  onGrab,
}: {
  id: string;
  emoji: string;
  name: string;
  items: TodoItem[];
  onAdd: (projectId: string, text: string) => void;
  onToggle: (item: TodoItem) => void;
  onEditItem: (id: string, text: string) => void;
  onDeleteItem: (id: string) => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onGrab: (grabbing: boolean) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameText, setNameText] = useState(name);
  const startRename = () => {
    setNameText(name);
    setRenaming(true);
  };
  const saveName = () => {
    const t = nameText.trim();
    setRenaming(false);
    if (t && t !== name) onRename?.(t);
  };
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
    <div className="lf-card flex h-full flex-col gap-3">
      {/* The header is the drag grip, except while the name is being typed. */}
      <div
        onPointerDown={() => !renaming && onGrab(true)}
        onPointerUp={() => onGrab(false)}
        className={`flex items-center justify-between gap-2 ${renaming ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-foreground">
          <span className="select-none text-muted" title="Drag to move">⠿</span>
          <span className="text-lg">{emoji}</span>
          {renaming ? (
            <input
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setNameText(name);
                  setRenaming(false);
                }
              }}
              autoFocus
              className="lf-input"
              style={{ padding: "4px 8px", fontSize: 13 }}
            />
          ) : (
            <span
              onClick={onRename && startRename}
              className={`truncate ${onRename ? "cursor-text hover:text-primary" : ""}`}
              title={onRename ? "Click to rename" : undefined}
            >
              {name}
            </span>
          )}
        </h2>
        {onRename && !renaming && (
          <button type="button" onClick={startRename} className="text-xs opacity-60 hover:opacity-100" title="Rename project">
            ✏️
          </button>
        )}
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

export default function TodoBoard({ projects, items, order }: Board) {
  const [board, apply] = useOptimistic({ projects, items, order }, reduce);
  const [, startTransition] = useTransition();
  const [projectName, setProjectName] = useState("");
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null);

  // Saved order first, then any boxes it doesn't know about yet (new projects).
  const boxIds = ["inbox", ...board.projects.map((p) => p.id)];
  const savedOrder = [
    ...board.order.filter((id) => boxIds.includes(id)),
    ...boxIds.filter((id) => !board.order.includes(id)),
  ];
  const shownOrder = liveOrder ?? savedOrder;

  const dragOver = (e: React.DragEvent, overId: string) => {
    if (!dragId) return;
    e.preventDefault();
    if (overId === dragId) return;
    // Take the hovered box's slot: it shifts toward where the dragged box came from.
    setLiveOrder((cur) => {
      const next = [...(cur ?? savedOrder)];
      const to = next.indexOf(overId);
      next.splice(next.indexOf(dragId), 1);
      next.splice(to, 0, dragId);
      return next;
    });
  };

  const endDrag = () => {
    const next = liveOrder;
    setGrabbedId(null);
    setDragId(null);
    if (!next || next.join() === savedOrder.join()) {
      setLiveOrder(null);
      return;
    }
    // Clear the live order in the same transition so the board never flashes back.
    startTransition(async () => {
      setLiveOrder(null);
      apply({ type: "reorder", order: next });
      await saveBoardOrder(fd({ order: JSON.stringify(next) }));
    });
  };

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

  const renameProj = (id: string, name: string) =>
    run({ type: "renameProject", id, name }, () => renameProject(fd({ id, name })));

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

      <div onPointerUp={() => setGrabbedId(null)} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shownOrder.map((boxId) => {
          const p = board.projects.find((proj) => proj.id === boxId);
          return (
            <div
              key={boxId}
              draggable={grabbedId === boxId}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", boxId);
                setDragId(boxId);
              }}
              onDragOver={(e) => dragOver(e, boxId)}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={endDrag}
              className={dragId === boxId ? "opacity-40" : ""}
            >
              {p ? (
                <ProjectCard
                  id={p.id}
                  emoji={p.emoji}
                  name={p.name}
                  items={board.items.filter((i) => i.project_id === p.id)}
                  onRename={(name) => renameProj(p.id, name)}
                  onDelete={() => deleteProj(p.id)}
                  onGrab={(g) => setGrabbedId(g ? p.id : null)}
                  {...cardProps}
                />
              ) : (
                <ProjectCard
                  id="inbox"
                  emoji="📥"
                  name="Inbox"
                  items={board.items.filter((i) => !i.project_id)}
                  onGrab={(g) => setGrabbedId(g ? "inbox" : null)}
                  {...cardProps}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
