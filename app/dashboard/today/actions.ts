"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientId } from "@/lib/ids";

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function addTodayItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const text = (formData.get("text") as string)?.trim();
  if (!text) return;

  await supabase.from("today_items").insert({ id: clientId(formData), user_id: userId, text, date: today() });
  revalidatePath("/dashboard/today");
}

export async function toggleTodayItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const completed = formData.get("completed") === "true";

  await supabase
    .from("today_items")
    .update({ completed: !completed })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard/today");
}

export async function deleteTodayItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("today_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/today");
}

export async function updateTodayItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const text = (formData.get("text") as string)?.trim();
  if (!text) return;

  await supabase.from("today_items").update({ text }).eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/today");
}

export async function clearCompletedToday() {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  await supabase.from("today_items").delete().eq("user_id", userId).eq("completed", true);
  revalidatePath("/dashboard/today");
}
