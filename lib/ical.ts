// Minimal iCalendar (.ics) parser for Moodle and Google Calendar exports.

export const TIME_ZONE = "Asia/Bangkok";

export interface IcalEvent {
  uid: string;
  summary: string;
  description: string;
  categories: string;
  location: string;
  url: string | null;
  status: string; // CONFIRMED / TENTATIVE / CANCELLED ("" when absent)
  // Local (Asia/Bangkok) date and time of DTSTART.
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM, null for all-day events
  timestamp: number; // unix seconds
  // Last local day the event covers (inclusive); equals `date` for single-day events.
  endDate: string;
  durationSeconds: number;
  rrule: string | null;
  exdates: number[]; // unix seconds of skipped occurrences
  recurrenceId: number | null; // set on an edited occurrence of a recurring event
  allDay: boolean;
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

/** Shifts a YYYY-MM-DD string by whole days. */
export function addDays(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// UTC milliseconds for a wall-clock time in `timeZone`.
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
      })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, Number(p.value)]),
    );
    const asZone = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return guess - (asZone - guess);
  } catch {
    // Unknown zone name: treat as the app zone.
    return Date.UTC(y, mo - 1, d, h, mi, s) - 7 * 3600_000;
  }
}

function parseDate(value: string, params: string) {
  // All-day: 20260930
  if (/^\d{8}$/.test(value) || params.includes("VALUE=DATE")) {
    const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return { date, time: null, timestamp: Date.parse(`${date}T00:00:00+07:00`) / 1000, allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  // Z is UTC; TZID names its zone; floating times (Moodle) are in the app zone.
  const tzid = params.match(/TZID=("?)([^;"]+)\1/i)?.[2];
  const ms = m[7] ? Date.UTC(y, mo - 1, d, h, mi, s) : zonedToUtc(y, mo, d, h, mi, s, tzid ?? TIME_ZONE);
  return { ...toLocalParts(new Date(ms)), timestamp: Math.floor(ms / 1000), allDay: false };
}

type Prop = { value: string; params: string };

export function parseIcal(text: string): IcalEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1).
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: IcalEvent[] = [];
  let cur: Record<string, Prop[]> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      const one = (name: string) => cur?.[name]?.[0];
      const start = one("DTSTART");
      const uid = one("UID");
      if (uid && start) {
        const when = parseDate(start.value, start.params);
        if (when) {
          const endProp = one("DTEND");
          const end = endProp ? parseDate(endProp.value, endProp.params) : null;
          const durationSeconds = end ? Math.max(0, end.timestamp - when.timestamp) : 0;
          // DTEND is exclusive: an all-day event ending on the 3rd covers through the 2nd.
          let endDate = when.date;
          if (end) {
            endDate = when.allDay ? addDays(end.date, -1) : end.time === "00:00" && end.date > when.date ? addDays(end.date, -1) : end.date;
            if (endDate < when.date) endDate = when.date;
          }
          const recurrence = one("RECURRENCE-ID");
          events.push({
            uid: uid.value,
            summary: unescapeText(one("SUMMARY")?.value ?? ""),
            description: unescapeText(one("DESCRIPTION")?.value ?? ""),
            categories: unescapeText(one("CATEGORIES")?.value ?? ""),
            location: unescapeText(one("LOCATION")?.value ?? ""),
            url: one("URL")?.value ?? null,
            status: (one("STATUS")?.value ?? "").toUpperCase(),
            ...when,
            endDate,
            durationSeconds,
            rrule: one("RRULE")?.value ?? null,
            exdates: (cur?.EXDATE ?? []).flatMap((p) =>
              p.value.split(",").flatMap((v) => {
                const ex = parseDate(v, p.params);
                return ex ? [ex.timestamp] : [];
              }),
            ),
            recurrenceId: recurrence ? parseDate(recurrence.value, recurrence.params)?.timestamp ?? null : null,
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
    const key = name.toUpperCase();
    (cur[key] ??= []).push({ value: line.slice(colon + 1), params: params.join(";").toUpperCase() });
  }
  return events;
}

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/**
 * Expands recurring events into single occurrences that start within [from, to] (local dates),
 * applying EXDATEs and edited occurrences (RECURRENCE-ID). Supports DAILY/WEEKLY/MONTHLY/YEARLY
 * with INTERVAL, COUNT, UNTIL and weekly BYDAY — enough for typical Google Calendar feeds.
 */
export function expandEvents(events: IcalEvent[], from: string, to: string): IcalEvent[] {
  const overrides = new Set(events.filter((e) => e.recurrenceId !== null).map((e) => `${e.uid}|${e.recurrenceId}`));
  const out: IcalEvent[] = [];
  // Include events that started before `from` but are still running.
  const overlaps = (e: IcalEvent) => e.date <= to && e.endDate >= from;

  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    if (!e.rrule || e.recurrenceId !== null) {
      if (overlaps(e)) out.push(e);
      continue;
    }

    const rule = Object.fromEntries(e.rrule.split(";").map((kv) => kv.split("=") as [string, string]));
    const freq = rule.FREQ;
    const interval = Math.max(1, Number(rule.INTERVAL) || 1);
    const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
    const until = rule.UNTIL ? parseDate(rule.UNTIL, "")?.timestamp ?? Infinity : Infinity;
    const byDay = freq === "WEEKLY" && rule.BYDAY ? rule.BYDAY.split(",").map((d) => WEEKDAYS.indexOf(d.slice(-2))) : null;
    const spanDays = Math.round((Date.parse(`${e.endDate}T00:00:00Z`) - Date.parse(`${e.date}T00:00:00Z`)) / 86400000);
    const exdates = new Set(e.exdates);
    // Work on Bangkok wall-clock time (UTC+7, no DST) so weekdays and month days match the calendar.
    const OFFSET = 7 * 3600_000;
    const startMs = e.timestamp * 1000 + OFFSET;
    const base = new Date(startMs);
    const lastMs = Date.parse(`${addDays(to, 1)}T00:00:00Z`);

    let made = 0;
    const emit = (shifted: number) => {
      made++;
      const ms = shifted - OFFSET;
      const ts = Math.floor(ms / 1000);
      if (ts > until || exdates.has(ts) || overrides.has(`${e.uid}|${ts}`)) return;
      const local = toLocalParts(new Date(ms));
      const occ = { ...e, ...local, time: e.allDay ? null : local.time, timestamp: ts, endDate: addDays(local.date, spanDays), rrule: null };
      if (overlaps(occ)) out.push(occ);
    };

    for (let step = 0; made < count && step < 5000; step++) {
      if (freq === "WEEKLY" && byDay) {
        const weekStart = startMs - base.getUTCDay() * 86400000 + step * interval * 7 * 86400000;
        if (weekStart > lastMs) break;
        for (const wd of [...byDay].sort((a, b) => a - b)) {
          const ms = weekStart + wd * 86400000;
          if (ms < startMs || made >= count) continue;
          if ((ms - OFFSET) / 1000 > until || ms >= lastMs) break;
          emit(ms);
        }
        continue;
      }
      const d = new Date(startMs);
      if (freq === "DAILY") d.setUTCDate(d.getUTCDate() + step * interval);
      else if (freq === "WEEKLY") d.setUTCDate(d.getUTCDate() + step * interval * 7);
      else if (freq === "MONTHLY") d.setUTCMonth(d.getUTCMonth() + step * interval);
      else if (freq === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + step * interval);
      else {
        emit(startMs);
        break;
      }
      // Skip months without that day (e.g. the 31st) instead of rolling over.
      if ((freq === "MONTHLY" || freq === "YEARLY") && d.getUTCDate() !== base.getUTCDate()) continue;
      if ((d.getTime() - OFFSET) / 1000 > until || d.getTime() >= lastMs) break;
      emit(d.getTime());
    }
  }
  return out;
}
