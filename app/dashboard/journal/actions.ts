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

export async function addJournalEntry(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  const title = (formData.get("title") as string)?.trim() || null;
  const prompt = (formData.get("prompt") as string)?.trim() || null;

  await supabase.from("journal_entries").insert({
    user_id: userId,
    title,
    content,
    prompt,
    date: new Date().toISOString().slice(0, 10),
  });
  revalidatePath("/dashboard/journal");
}

export async function updateJournalEntry(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  const title = (formData.get("title") as string)?.trim() || null;

  await supabase.from("journal_entries").update({ title, content }).eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/journal");
}

export async function deleteJournalEntry(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/journal");
}
