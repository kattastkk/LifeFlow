import { createClient } from "@/lib/supabase/server";
import { localToday } from "@/lib/ical";
import { googleConfigured, googleEvents } from "@/lib/googleCalendar";
import SyncButton from "../sync/SyncButton";
import type { CalendarEvent, Homework } from "@/types/database";
import CalendarBoard from "./CalendarBoard";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarPage(props: PageProps<"/dashboard/calendar">) {
  const { month: monthParam } = await props.searchParams;
  const today = localToday();
  const monthStr = typeof monthParam === "string" && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const [year, month1] = monthStr.split("-").map(Number);
  const month = month1 - 1;
  const firstOfMonth = `${monthStr}-01`;
  const lastOfMonth = `${monthStr}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const supabase = await createClient();
  const [{ data: eventsData }, { data: homeworkData }, google] = await Promise.all([
    supabase.from("events").select("*").gte("event_date", firstOfMonth).lte("event_date", lastOfMonth),
    supabase.from("homework").select("*").gte("due_date", firstOfMonth).lte("due_date", lastOfMonth),
    googleEvents(firstOfMonth, lastOfMonth),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--foreground)" }}>Calendar</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>Click a day to see everything on it or add an event.</p>
        </div>
        <SyncButton />
      </div>
      <CalendarBoard
        key={monthStr}
        year={year}
        month={month}
        today={today}
        events={(eventsData ?? []) as CalendarEvent[]}
        homework={(homeworkData ?? []) as Homework[]}
        google={google.events}
        googleConfigured={googleConfigured()}
        googleFailed={google.failed}
      />
    </div>
  );
}
