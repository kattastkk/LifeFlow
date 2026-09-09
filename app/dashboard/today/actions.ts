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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function addTodayItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const text = (formData.get("text") as string)?.trim();
  if (!text) return;

  await supabase.from("today_items").insert({ user_id: userId, text, date: today() });
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

export async function clearCompletedToday(_formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  await supabase.from("today_items").delete().eq("user_id", userId).eq("date", today()).eq("completed", true);
  revalidatePath("/dashboard/today");
}

export async function finishDay(_formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const date = today();

  const { data: items } = await supabase
    .from("today_items")
    .select("id, text, completed")
    .eq("user_id", userId)
    .eq("date", date);

  const list = items ?? [];
  const totalCount = list.length;

  if (totalCount === 0) {
    redirect("/dashboard/today?ended=empty");
  }

  const { data: existing } = await supabase
    .from("daily_history")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  const completedCount = list.filter((i) => i.completed).length;
  const completionRate = Math.round((completedCount / totalCount) * 100);

  await supabase.from("daily_history").upsert(
    {
      user_id: userId,
      date,
      completed_count: completedCount,
      total_count: totalCount,
      completion_rate: completionRate,
      items: list,
    },
    { onConflict: "user_id,date" },
  );

  await supabase.from("today_items").delete().eq("user_id", userId).eq("date", date);
  revalidatePath("/dashboard");
  redirect(`/dashboard/today?ended=${existing ? "updated" : "saved"}`);
}
