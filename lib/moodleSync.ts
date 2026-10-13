import type { SupabaseClient } from "@supabase/supabase-js";
import { localToday, parseIcal } from "@/lib/ical";
import { classChangeKind } from "@/lib/classChanges";

export type MoodleSyncResult =
  | { status: "missing" }
  | { status: "failed" }
  | { status: "ok"; homework: number; classChanges: number; removed: number };

// Moodle titles look like "Lab 3 is due" / "Quiz 1 closes"; keep just the activity name.
function cleanTitle(summary: string) {
  return summary.replace(/\s+(is due|should be completed|closes|ปิด|ครบกำหนด.*)$/i, "").trim();
}

/**
 * Pulls the MyCourses (Moodle) iCal feed into `homework`: upcoming items are upserted, and
 * upcoming MyCourses rows that are no longer in the feed (deleted or rescheduled away in
 * MyCourses) are removed. Manually added homework is never touched.
 */
export async function syncMoodle(supabase: SupabaseClient, userId: string): Promise<MoodleSyncResult> {
  const icalUrl = process.env.MOODLE_ICAL_URL;
  if (!icalUrl) return { status: "missing" };

  let text: string;
  try {
    const res = await fetch(icalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    return { status: "failed" };
  }
  // A real export always starts like this; anything else (a login page, an error) must not
  // be treated as "the feed is now empty", or every upcoming item would be removed.
  if (!text.includes("BEGIN:VCALENDAR")) return { status: "failed" };

  const origin = new URL(icalUrl).origin;
  const today = localToday();
  const feed = parseIcal(text).filter((e) => !/\sopens$/i.test(e.summary));
  const rows = feed
    .filter((e) => e.date >= today)
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
    if (error) return { status: "failed" };
  }

  const inFeed = new Set(rows.map((r) => r.external_id));
  const { data: existing } = await supabase
    .from("homework")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", "moodle")
    .gte("due_date", today);
  const stale = (existing ?? []).filter((h) => !h.external_id || !inFeed.has(h.external_id)).map((h) => h.id);
  if (stale.length > 0) await supabase.from("homework").delete().in("id", stale).eq("user_id", userId);

  const classChanges = rows.filter((r) => classChangeKind(r.title)).length;
  return { status: "ok", homework: rows.length - classChanges, classChanges, removed: stale.length };
}
