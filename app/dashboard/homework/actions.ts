"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function revalidate() {
  revalidatePath("/dashboard/homework");
  revalidatePath("/dashboard/calendar");
}

function readForm(formData: FormData) {
  return {
    title: (formData.get("title") as string)?.trim(),
    course: (formData.get("course") as string)?.trim() || null,
    due_date: formData.get("due_date") as string,
    due_time: (formData.get("due_time") as string) || null,
    url: (formData.get("url") as string)?.trim() || null,
  };
}

export async function addHomework(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const hw = readForm(formData);
  if (!hw.title || !hw.due_date) return;

  await supabase.from("homework").insert({ user_id: userId, source: "manual", ...hw });
  revalidate();
}

export async function updateHomework(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const hw = readForm(formData);
  if (!hw.title || !hw.due_date) return;

  await supabase.from("homework").update(hw).eq("id", id).eq("user_id", userId);
  revalidate();
  redirect("/dashboard/homework");
}

export async function toggleHomework(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const completed = formData.get("completed") === "true";

  await supabase.from("homework").update({ completed: !completed }).eq("id", id).eq("user_id", userId);
  revalidate();
}

export async function deleteHomework(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("homework").delete().eq("id", id).eq("user_id", userId);
  revalidate();
}
