import { expandEvents, parseIcal } from "@/lib/ical";

export interface ExternalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Asia/Bangkok)
  endDate: string; // last day covered, inclusive
  time: string | null; // HH:MM, null for all-day
  location: string;
  calendar: string;
}

/**
 * Read-only Google Calendar events between two local dates. GOOGLE_ICAL_URL holds one or more
 * "Secret address in iCal format" links, separated by commas or whitespace. Feeds are cached
 * for five minutes; a feed that fails is skipped so the rest of the calendar still renders.
 */
export async function googleEvents(from: string, to: string): Promise<{ events: ExternalEvent[]; failed: number }> {
  const urls = (process.env.GOOGLE_ICAL_URL ?? "").split(/[\s,]+/).filter((u) => u.startsWith("https://"));
  let failed = 0;

  const perFeed = await Promise.all(
    urls.map(async (url, i) => {
      try {
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        const calendar = text.match(/^X-WR-CALNAME:(.*)$/m)?.[1]?.trim() || "Google";
        return expandEvents(parseIcal(text), from, to).map((e) => ({
          id: `g${i}-${e.uid}-${e.timestamp}`,
          title: e.summary || "(No title)",
          date: e.date,
          endDate: e.endDate,
          time: e.time,
          location: e.location,
          calendar,
        }));
      } catch {
        failed++;
        return [];
      }
    }),
  );

  return { events: perFeed.flat(), failed };
}
