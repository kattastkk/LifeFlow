"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, localToday } from "@/lib/ical";
import { syncMoodle, type MoodleSyncResult } from "@/lib/moodleSync";
import { GOOGLE_CALENDAR_TAG, googleConfigured, googleEvents } from "@/lib/googleCalendar";

export type SyncResult = {
  moodle: MoodleSyncResult;
  google: { status: "missing" } | { status: "ok"; events: number; failed: number };
};

/** Refreshes MyCourses homework and the Google Calendar feeds, for the Sync buttons. */
export async function syncAll(): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const moodle = await syncMoodle(supabase, user.id);

  let google: SyncResult["google"] = { status: "missing" };
  if (googleConfigured()) {
    // Drop the cached feeds so this check and the next page load see Google's latest data.
    updateTag(GOOGLE_CALENDAR_TAG);
    const today = localToday();
    const { events, failed } = await googleEvents(addDays(today, -31), addDays(today, 62));
    google = { status: "ok", events: events.length, failed };
  }

  revalidatePath("/dashboard", "layout");
  return { moodle, google };
}
