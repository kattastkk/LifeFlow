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

export async function addHabit(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const emoji = (formData.get("emoji") as string)?.trim() || "🌟";
  const color = (formData.get("color") as string) || "#db2777";

  await supabase.from("habits").insert({ user_id: userId, name, emoji, color });
  revalidatePath("/dashboard/habits");
}

export async function updateHabit(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const emoji = (formData.get("emoji") as string)?.trim() || "🌟";
  const color = (formData.get("color") as string) || "#db2777";

  await supabase.from("habits").update({ name, emoji, color }).eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/habits");
}

export async function deleteHabit(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("habits").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/habits");
}

export async function toggleHabitDay(formData: FormData) {
  const supabase = await createClient();
  await requireUserId(supabase);
  const habitId = formData.get("habit_id") as string;
  const date = formData.get("date") as string;
  const wasCompleted = formData.get("was_completed") === "true";

  if (wasCompleted) {
    await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("date", date);
  } else {
    await supabase.from("habit_completions").insert({ habit_id: habitId, date });
  }
  revalidatePath("/dashboard/habits");
}
