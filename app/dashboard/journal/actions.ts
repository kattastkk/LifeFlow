"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JOURNAL_TOPICS } from "@/lib/journal";

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Any past day can be written; allow one day ahead for timezones east of UTC.
function validDate(value: FormDataEntryValue | null) {
  const date = typeof value === "string" ? value : "";
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date <= tomorrow ? date : null;
}

// One entry per day: saving upserts that day's row, and saving it empty removes it.
export async function saveJournalDay(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const date = validDate(formData.get("date"));
  if (!date) return;

  const topics = Object.fromEntries(
    JOURNAL_TOPICS.map((t) => [t.key, (formData.get(t.key) as string | null)?.trim() || null]),
  );
  const content = (formData.get("content") as string | null)?.trim() ?? "";

  if (!content && Object.values(topics).every((v) => !v)) {
    await supabase.from("journal_entries").delete().eq("user_id", userId).eq("date", date);
  } else {
    await supabase
      .from("journal_entries")
      .upsert({ user_id: userId, date, content, ...topics }, { onConflict: "user_id,date" });
  }
  revalidatePath("/dashboard", "layout");
}

export async function deleteJournalDay(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const date = validDate(formData.get("date"));
  if (!date) return;

  await supabase.from("journal_entries").delete().eq("user_id", userId).eq("date", date);
  revalidatePath("/dashboard", "layout");
}
