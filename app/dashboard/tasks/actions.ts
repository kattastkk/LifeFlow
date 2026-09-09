"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

const NEXT_STATUS: Record<string, string> = {
  "To Do": "In Progress",
  "In Progress": "Completed",
  Completed: "To Do",
};

export async function addTask(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const description = (formData.get("description") as string)?.trim() || null;
  const dueDate = (formData.get("due_date") as string) || null;
  const priority = (formData.get("priority") as string) || "Medium";
  const category = (formData.get("category") as string)?.trim() || "Personal";

  await supabase.from("tasks").insert({
    user_id: userId,
    title,
    description,
    due_date: dueDate,
    priority,
    category,
  });
  revalidatePath("/dashboard/tasks");
}

export async function advanceTaskStatus(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const next = NEXT_STATUS[status] ?? "To Do";

  await supabase.from("tasks").update({ status: next }).eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/tasks");
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const description = (formData.get("description") as string)?.trim() || null;
  const dueDate = (formData.get("due_date") as string) || null;
  const priority = (formData.get("priority") as string) || "Medium";
  const category = (formData.get("category") as string)?.trim() || "Personal";
  const status = (formData.get("status") as string) || "To Do";

  await supabase
    .from("tasks")
    .update({ title, description, due_date: dueDate, priority, category, status })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard/tasks");
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/tasks");
}
