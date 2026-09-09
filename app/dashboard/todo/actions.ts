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

export async function addProject(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await supabase.from("projects").insert({ user_id: userId, name });
  revalidatePath("/dashboard/todo");
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/todo");
}

export async function addTodo(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const text = (formData.get("text") as string)?.trim();
  const projectIdRaw = formData.get("project_id") as string;
  const projectId = projectIdRaw && projectIdRaw !== "inbox" ? projectIdRaw : null;
  if (!text) return;

  await supabase
    .from("todo_items")
    .insert({ user_id: userId, text, project_id: projectId });
  revalidatePath("/dashboard/todo");
}

export async function toggleTodo(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const completed = formData.get("completed") === "true";

  await supabase
    .from("todo_items")
    .update({ completed: !completed })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard/todo");
}

export async function deleteTodo(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("todo_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/todo");
}
