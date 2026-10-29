import { createClient } from "@/lib/supabase/server";
import type { Project, TodoItem } from "@/types/database";
import TodoBoard from "./TodoBoard";

export default async function TodoListPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: todoItems }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: true }),
    supabase.from("todo_items").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("todo_order").maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#93c5fd,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📝</div>
        <div>
          <h1 className="font-display text-3xl text-foreground">To Do List</h1>
          <p className="text-sm text-muted">Every project, side by side.</p>
        </div>
      </div>

      <TodoBoard
        projects={(projects ?? []) as Project[]}
        items={(todoItems ?? []) as TodoItem[]}
        order={(profile?.todo_order as string[] | null) ?? []}
      />
    </div>
  );
}
