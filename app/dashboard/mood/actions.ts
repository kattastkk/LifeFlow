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

  // Any past day can be logged; allow one day ahead for timezones east of UTC.
  const date = formData.get("date") as string;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date > tomorrow) return;

  await supabase
    .from("moods")
    .upsert({ user_id: user.id, date, value, note }, { onConflict: "user_id,date" });
  revalidatePath("/dashboard", "layout");
}

export async function deleteMood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const date = formData.get("date") as string;
  await supabase.from("moods").delete().eq("user_id", user.id).eq("date", date);
  revalidatePath("/dashboard", "layout");
}
