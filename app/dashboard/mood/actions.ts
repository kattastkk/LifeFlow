"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setMood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const value = Number(formData.get("value"));
  const note = (formData.get("note") as string)?.trim() || null;
  if (!value || value < 1 || value > 5) return;

  const date = new Date().toISOString().slice(0, 10);

  await supabase
    .from("moods")
    .upsert({ user_id: user.id, date, value, note }, { onConflict: "user_id,date" });
  revalidatePath("/dashboard/mood");
}

export async function deleteMood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const date = formData.get("date") as string;
  await supabase.from("moods").delete().eq("user_id", user.id).eq("date", date);
  revalidatePath("/dashboard/mood");
}
