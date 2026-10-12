// Minimal iCalendar (.ics) parser for Moodle calendar exports.

export const TIME_ZONE = "Asia/Bangkok";

export interface IcalEvent {
  uid: string;
  summary: string;
  description: string;
  categories: string;
  url: string | null;
  // Local (Asia/Bangkok) date and time of DTSTART.
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM, null for all-day events
  timestamp: number; // unix seconds
}

function unescapeText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/** Formats a Date as local YYYY-MM-DD and HH:MM in the app time zone. */
export function toLocalParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function localToday() {
  return toLocalParts(new Date()).date;
}

function parseDate(value: string, params: string) {
  // All-day: 20260930
  if (/^\d{8}$/.test(value) || params.includes("VALUE=DATE")) {
    const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return { date, time: null, timestamp: Date.parse(`${date}T00:00:00+07:00`) / 1000 };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  // Floating/TZID times from Moodle are in the site's zone (Bangkok); Z is UTC.
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : "+07:00"}`;
  const dt = new Date(iso);
  return { ...toLocalParts(dt), timestamp: Math.floor(dt.getTime() / 1000) };
}

export function parseIcal(text: string): IcalEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1).
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: IcalEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur?.UID && cur.DTSTART) {
        const when = parseDate(cur.DTSTART.value, cur.DTSTART.params);
        if (when) {
          events.push({
            uid: cur.UID.value,
            summary: unescapeText(cur.SUMMARY?.value ?? ""),
            description: unescapeText(cur.DESCRIPTION?.value ?? ""),
            categories: unescapeText(cur.CATEGORIES?.value ?? ""),
            url: cur.URL?.value ?? null,
            ...when,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const [name, ...params] = line.slice(0, colon).split(";");
    cur[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";").toUpperCase() };
  }
  return events;
}
