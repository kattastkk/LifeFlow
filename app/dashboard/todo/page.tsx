import { createClient } from "@/lib/supabase/server";
import type { Project, TodoItem } from "@/types/database";
import { addProject, deleteProject, addTodo, toggleTodo, deleteTodo } from "./actions";

function ProjectCard({
  id,
  emoji,
  name,
  items,
  deletable,
}: {
  id: string;
  emoji: string;
  name: string;
  items: TodoItem[];
  deletable: boolean;
}) {
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
        {deletable && (
          <form action={deleteProject}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-xs text-muted hover:text-primary" title="Delete project">
              ✕
            </button>
          </form>
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

      <form action={addTodo} className="flex gap-2">
        <input type="hidden" name="project_id" value={id} />
        <input name="text" placeholder="Add a task..." required className="lf-input" style={{ padding: "6px 10px", fontSize: 13 }} />
        <button type="submit" className="lf-btn lf-btn-primary shrink-0" style={{ padding: "6px 12px", fontSize: 13 }}>
          +
        </button>
      </form>

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {sorted.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
            <form action={toggleTodo}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="completed" value={String(item.completed)} />
              <button type="submit" className="text-base leading-none">
                {item.completed ? "☑️" : "⬜️"}
              </button>
            </form>
            <span className={`flex-1 truncate text-sm ${item.completed ? "text-muted line-through" : "text-foreground"}`}>
              {item.text}
            </span>
            <form action={deleteTodo}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-xs text-muted hover:text-primary" title="Delete">
                ✕
              </button>
            </form>
          </div>
        ))}
        {sorted.length === 0 && <p className="py-2 text-center text-sm text-muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

export default async function TodoListPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: todoItems }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: true }),
    supabase.from("todo_items").select("*").order("created_at", { ascending: false }),
  ]);

  const allProjects = (projects ?? []) as Project[];
  const allItems = (todoItems ?? []) as TodoItem[];
  const inboxItems = allItems.filter((i) => !i.project_id);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#93c5fd,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📝</div>
        <div>
          <h1 className="font-display text-3xl text-foreground">To Do List</h1>
          <p className="text-sm text-muted">Every project, side by side.</p>
        </div>
      </div>

      <form action={addProject} className="lf-card mt-6 flex gap-2">
        <input name="name" placeholder="New project name..." required className="lf-input" />
        <button type="submit" className="lf-btn lf-btn-primary shrink-0">
          + Add Project
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <ProjectCard id="inbox" emoji="📥" name="Inbox" items={inboxItems} deletable={false} />
        {allProjects.map((p) => (
          <ProjectCard
            key={p.id}
            id={p.id}
            emoji={p.emoji}
            name={p.name}
            items={allItems.filter((i) => i.project_id === p.id)}
            deletable
          />
        ))}
      </div>
    </div>
  );
}
