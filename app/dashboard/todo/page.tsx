import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project, TodoItem } from "@/types/database";
import { addProject, deleteProject, addTodo, toggleTodo, deleteTodo } from "./actions";

export default async function TodoListPage(props: PageProps<"/dashboard/todo">) {
  const { project: projectParam } = await props.searchParams;
  const selected = typeof projectParam === "string" ? projectParam : "inbox";

  const supabase = await createClient();

  const [{ data: projects }, { data: todoItems }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("todo_items")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const allProjects = (projects ?? []) as Project[];
  const allItems = (todoItems ?? []) as TodoItem[];

  const filtered =
    selected === "inbox"
      ? allItems.filter((i) => !i.project_id)
      : allItems.filter((i) => i.project_id === selected);

  const selectedProject = allProjects.find((p) => p.id === selected);
  const heading =
    selected === "inbox" ? "📥 Inbox" : selectedProject ? `${selectedProject.emoji} ${selectedProject.name}` : "To Do";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto flex max-w-4xl gap-6">
        <aside className="w-56 shrink-0 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted">Projects</h2>
          <nav className="flex flex-col gap-1">
            <Link
              href="/dashboard/todo?project=inbox"
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                selected === "inbox" ? "bg-primary text-white" : "hover:bg-input"
              }`}
            >
              📥 Inbox
            </Link>
            {allProjects.map((p) => (
              <div key={p.id} className="group flex items-center gap-1">
                <Link
                  href={`/dashboard/todo?project=${p.id}`}
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-sm transition-colors ${
                    selected === p.id ? "bg-primary text-white" : "hover:bg-input"
                  }`}
                >
                  {p.emoji} {p.name}
                </Link>
                <form action={deleteProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    title="Delete project"
                    className="hidden px-1 text-xs text-muted hover:text-primary group-hover:block"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </nav>

          <form action={addProject} className="mt-4 flex gap-2">
            <input
              name="name"
              placeholder="New project"
              required
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-2 py-1 text-sm text-white hover:bg-primary-hover"
            >
              +
            </button>
          </form>
        </aside>

        <main className="flex-1 rounded-2xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl text-primary">{heading}</h1>

          <form action={addTodo} className="mt-4 flex gap-2">
            <input type="hidden" name="project_id" value={selected} />
            <input
              name="text"
              placeholder="Add a task..."
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
            >
              Add
            </button>
          </form>

          <ul className="mt-6 flex flex-col gap-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <form action={toggleTodo}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="completed" value={String(item.completed)} />
                  <button type="submit" className="text-lg leading-none">
                    {item.completed ? "☑️" : "⬜️"}
                  </button>
                </form>
                <span
                  className={`flex-1 text-sm ${
                    item.completed ? "text-muted line-through" : "text-foreground"
                  }`}
                >
                  {item.text}
                </span>
                <form action={deleteTodo}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-primary"
                    title="Delete"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="mt-2 text-sm text-muted">Nothing here yet.</p>
            )}
          </ul>
        </main>
      </div>
    </div>
  );
}
