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

export async function addEvent(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const title = (formData.get("title") as string)?.trim();
  const eventDate = formData.get("event_date") as string;
  if (!title || !eventDate) return;

  const eventTime = (formData.get("event_time") as string) || null;
  const status = (formData.get("status") as string) || "Confirmed";
  const description = (formData.get("description") as string)?.trim() || null;

  await supabase.from("events").insert({
    user_id: userId,
    title,
    event_date: eventDate,
    event_time: eventTime,
    status,
    description,
  });
  revalidatePath("/dashboard/calendar");
}

export async function updateEvent(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim();
  const eventDate = formData.get("event_date") as string;
  if (!title || !eventDate) return;

  const eventTime = (formData.get("event_time") as string) || null;
  const status = (formData.get("status") as string) || "Confirmed";
  const description = (formData.get("description") as string)?.trim() || null;

  await supabase
    .from("events")
    .update({ title, event_date: eventDate, event_time: eventTime, status, description })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/dashboard/calendar");
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const id = formData.get("id") as string;

  await supabase.from("events").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/dashboard/calendar");
}
