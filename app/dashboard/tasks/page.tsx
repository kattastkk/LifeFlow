import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/types/database";
import TaskList from "./TaskList";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--foreground)" }}>Tasks</h2>
      </div>
      <TaskList tasks={(data ?? []) as Task[]} />
    </div>
  );
}
