"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localToday, parseIcal } from "@/lib/ical";
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

// Moodle titles look like "Lab 3 is due" / "Quiz 1 closes"; keep just the activity name.
function cleanTitle(summary: string) {
  return summary.replace(/\s+(is due|should be completed|closes|ปิด|ครบกำหนด.*)$/i, "").trim();
}

export async function syncHomework() {
  const icalUrl = process.env.MOODLE_ICAL_URL;
  if (!icalUrl) redirect("/dashboard/homework?sync=missing");

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  let text: string;
  try {
    const res = await fetch(icalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    redirect("/dashboard/homework?sync=failed");
  }

  const origin = new URL(icalUrl).origin;
  const today = localToday();
  const rows = parseIcal(text)
    .filter((e) => e.date >= today && !/\sopens$/i.test(e.summary))
    .map((e) => ({
      user_id: userId,
      source: "moodle" as const,
      external_id: e.uid,
      title: cleanTitle(e.summary) || e.summary,
      course: e.categories || null,
      due_date: e.date,
      due_time: e.time,
      url: e.url ?? `${origin}/calendar/view.php?view=day&time=${e.timestamp}`,
    }));

  if (rows.length > 0) {
    // `completed` is omitted so a re-sync never un-ticks finished homework.
    const { error } = await supabase.from("homework").upsert(rows, { onConflict: "user_id,external_id" });
    if (error) redirect("/dashboard/homework?sync=failed");
  }

  revalidate();
  redirect(`/dashboard/homework?sync=ok&count=${rows.length}`);
}
