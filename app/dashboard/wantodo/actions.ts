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

export async function addWantItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;
  const category = (formData.get("category") as string)?.trim().slice(0, 40) || "Other";
  const note = (formData.get("note") as string)?.trim() || null;

  await supabase.from("want_items").insert({ id: clientId(formData), user_id: userId, title, category, note });
  revalidatePath("/dashboard", "layout");
}

export async function updateWantItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;
  const category = (formData.get("category") as string)?.trim().slice(0, 40) || "Other";
  const note = (formData.get("note") as string)?.trim() || null;

  await supabase.from("want_items").update({ title, category, note }).eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard", "layout");
}

export async function toggleWantItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const completed = formData.get("completed") === "true";

  await supabase
    .from("want_items")
    .update({ completed: !completed })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard", "layout");
}

export async function deleteWantItem(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("want_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard", "layout");
}
