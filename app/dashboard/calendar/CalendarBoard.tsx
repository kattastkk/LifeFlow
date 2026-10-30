"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import { classChangeCourse, classChangeKind } from "@/lib/classChanges";
import type { ExternalEvent } from "@/lib/googleCalendar";
import type { CalendarEvent, Homework } from "@/types/database";
import { addEvent, updateEvent, deleteEvent } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUSES = ["Confirmed", "Tentative", "Cancelled"];

// Chip colors per kind of item.
const KIND = {
  event: { bg: "var(--primary-soft)", fg: "var(--primary)", icon: "" },
  homework: { bg: "#ffedd5", fg: "#c2410c", icon: "📚" },
  cancel: { bg: "#fee2e2", fg: "#dc2626", icon: "❌" },
  makeup: { bg: "#dcfce7", fg: "#15803d", icon: "🔁" },
  google: { bg: "#dbeafe", fg: "#1d4ed8", icon: "📅" },
} as const;

type Change =
  | { type: "add"; event: CalendarEvent }
  | { type: "update"; event: CalendarEvent }
  | { type: "delete"; id: string };

function reduce(events: CalendarEvent[], c: Change): CalendarEvent[] {
  switch (c.type) {
    case "add":
      return [...events, c.event];
    case "update":
      return events.map((e) => (e.id === c.event.id ? c.event : e));
    case "delete":
      return events.filter((e) => e.id !== c.id);
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");
const byTime = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "");

type Item = { key: string; kind: keyof typeof KIND; title: string; time: string | null; sub?: string; done?: boolean; event?: CalendarEvent };

type Form = { id: string | null; title: string; description: string; date: string; time: string; status: string };
const blankForm = (date: string): Form => ({ id: null, title: "", description: "", date, time: "09:00", status: "Confirmed" });

export default function CalendarBoard({
  year,
  month,
  today,
  events: serverEvents,
  homework,
  google,
  googleConfigured,
  googleFailed,
}: {
  year: number;
  month: number; // 0-based
  today: string;
  events: CalendarEvent[];
  homework: Homework[];
  google: ExternalEvent[];
  googleConfigured: boolean;
  googleFailed: number;
}) {
  const [events, apply] = useOptimistic(serverEvents, reduce);
  const [, startTransition] = useTransition();
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const [selected, setSelected] = useState(today.startsWith(monthPrefix) ? today : `${monthPrefix}-01`);
  const [form, setForm] = useState<Form>(() => blankForm(selected));

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const itemsOn = (date: string): Item[] => {
    const items: Item[] = [
      ...events
        .filter((e) => e.event_date === date)
        .map((e) => ({ key: e.id, kind: "event" as const, title: e.title, time: e.event_time, sub: e.status !== "Confirmed" ? e.status : undefined, event: e })),
      ...homework
        .filter((h) => h.due_date === date)
        .map((h) => {
          const change = classChangeKind(h.title);
          return change
            ? { key: h.id, kind: change, title: `${change === "cancel" ? "Class cancelled" : "Make-up class"} · ${classChangeCourse(h.title)}`, time: h.due_time }
            : { key: h.id, kind: "homework" as const, title: h.title, time: h.due_time, sub: h.course ?? undefined, done: h.completed };
        }),
      ...google
        .filter((g) => g.date <= date && g.endDate >= date)
        .map((g) => ({ key: g.id, kind: "google" as const, title: g.title, time: g.date === date ? g.time : null, sub: [g.calendar, g.location].filter(Boolean).join(" · ") })),
    ];
    return items.sort((a, b) => byTime(a.time, b.time));
  };

  const pick = (date: string) => {
    setSelected(date);
    if (!form.id && !form.title.trim()) setForm(blankForm(date));
    else if (!form.id) setForm((f) => ({ ...f, date }));
  };

  const startEdit = (e: CalendarEvent) => {
    setSelected(e.event_date);
    setForm({ id: e.id, title: e.title, description: e.description ?? "", date: e.event_date, time: hhmm(e.event_time), status: e.status });
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const title = form.title.trim();
    if (!title || !form.date) return;
    const fields = { title, description: form.description.trim(), event_date: form.date, event_time: form.time, status: form.status };
    const id = form.id ?? crypto.randomUUID();
    const event: CalendarEvent = {
      id,
      user_id: "",
      title,
      description: fields.description || null,
      event_date: form.date,
      event_time: form.time || null,
      status: form.status,
      created_at: new Date().toISOString(),
    };
    if (form.id) run({ type: "update", event }, () => updateEvent(fd({ id, ...fields })));
    else run({ type: "add", event }, () => addEvent(fd({ id, ...fields })));
    setForm(blankForm(selected));
  };

  const remove = (id: string) => {
    if (form.id === id) setForm(blankForm(selected));
    run({ type: "delete", id }, () => deleteEvent(fd({ id })));
  };

  // Month grid.
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthPrefix}-${pad(i + 1)}`),
  ];
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const prevMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const nextMonth = `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;

  const dayItems = itemsOn(selected);
  const selectedLabel = new Date(`${selected}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const monthEvents = events
    .filter((e) => e.event_date.startsWith(monthPrefix))
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || byTime(a.event_time, b.event_time));

  const chip = (it: Item) => {
    const k = KIND[it.kind];
    return (
      <div
        key={it.key}
        title={`${it.time ? hhmm(it.time) + " · " : ""}${it.title}${it.sub ? " · " + it.sub : ""}`}
        style={{
          fontSize: 10,
          padding: "1px 5px",
          background: k.bg,
          color: k.fg,
          borderRadius: 4,
          marginBottom: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          textDecoration: it.done || it.sub === "Cancelled" ? "line-through" : "none",
          opacity: it.done ? 0.6 : 1,
        }}
      >
        {k.icon && <span style={{ marginRight: 2 }}>{k.icon}</span>}
        {it.title}
      </div>
    );
  };

  const legend: { kind: keyof typeof KIND; label: string }[] = [
    { kind: "event", label: "My events" },
    { kind: "homework", label: "Homework" },
    { kind: "cancel", label: "Class cancelled" },
    { kind: "makeup", label: "Make-up class" },
    ...(googleConfigured ? [{ kind: "google" as const, label: "Google Calendar" }] : []),
  ];

  return (
    <>
      {googleFailed > 0 && (
        <div style={{ background: "#fef3c7", color: "#b45309", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
          Couldn&apos;t load {googleFailed} Google calendar{googleFailed > 1 ? "s" : ""}. Check the links in GOOGLE_ICAL_URL.
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="lf-card" style={{ padding: 0, overflow: "hidden", flex: "2 1 520px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <Link href={`/dashboard/calendar?month=${prevMonth}`} className="lf-btn lf-btn-ghost" style={{ padding: "6px 12px" }}>
              ←
            </Link>
            <span style={{ fontWeight: 600, fontSize: 16, color: "var(--foreground)" }}>
              {MONTHS[month]} {year}
            </span>
            <Link href={`/dashboard/calendar?month=${nextMonth}`} className="lf-btn lf-btn-ghost" style={{ padding: "6px 12px" }}>
              →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", padding: "8px 8px 0" }}>
            {DAYS_SHORT.map((d) => (
              <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", padding: "0 8px 8px", gap: 2 }}>
            {cells.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const items = itemsOn(date);
              const isSel = date === selected;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => pick(date)}
                  style={{
                    minHeight: 76,
                    padding: "4px 2px",
                    borderRadius: 8,
                    textAlign: "left",
                    background: isSel ? "var(--primary-soft)" : "transparent",
                    border: `1.5px solid ${isSel ? "var(--primary-light)" : "transparent"}`,
                    cursor: "pointer",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div className={`cal-day${date === today ? " today" : ""}`} style={{ width: 28, height: 28, marginBottom: 2 }}>
                    {Number(date.slice(-2))}
                  </div>
                  {items.slice(0, 3).map(chip)}
                  {items.length > 3 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 4 }}>+{items.length - 3} more</div>}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "4px 16px 14px" }}>
            {legend.map((l) => (
              <span key={l.kind} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: KIND[l.kind].bg, border: `1px solid ${KIND[l.kind].fg}` }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="lf-card">
            <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15, marginBottom: 10 }}>{selectedLabel}</h3>
            {dayItems.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>Nothing on this day.</p>}
            {dayItems.map((it) => {
              const k = KIND[it.kind];
              return (
                <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ background: k.bg, color: k.fg, borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600, minWidth: 48, textAlign: "center", flexShrink: 0 }}>
                    {it.time ? hhmm(it.time) : "All day"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", textDecoration: it.done || it.sub === "Cancelled" ? "line-through" : "none" }}>
                      {k.icon && <span style={{ marginRight: 4 }}>{k.icon}</span>}
                      {it.kind === "homework" ? <Link href="/dashboard/homework" className="hover:underline">{it.title}</Link> : it.title}
                    </div>
                    {it.sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{it.sub}</div>}
                  </div>
                  {it.event && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => startEdit(it.event!)} title="Edit" style={{ fontSize: 12, padding: "2px 6px", background: "transparent", border: "none", cursor: "pointer" }}>
                        ✏️
                      </button>
                      <button type="button" onClick={() => remove(it.event!.id)} title="Delete" style={{ fontSize: 12, padding: "2px 6px", color: "#ef4444", background: "transparent", border: "none", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={submit} className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>{form.id ? "Edit event" : "New event"}</h3>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" required className="lf-input" />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
              className="lf-input"
              style={{ resize: "vertical" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="lf-input" />
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="lf-input" />
            </div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="lf-input">
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {form.id && (
                <button type="button" onClick={() => setForm(blankForm(selected))} className="lf-btn lf-btn-ghost">
                  Cancel
                </button>
              )}
              <button type="submit" className="lf-btn lf-btn-primary">
                {form.id ? "Save" : "+ Add event"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="lf-card">
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15, marginBottom: 12 }}>📋 My events in {MONTHS[month]}</h3>
        {monthEvents.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No events yet — click a day to add one
          </div>
        )}
        {monthEvents.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => pick(e.event_date)}
                style={{ background: "var(--primary-soft)", color: "var(--primary)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 60, textAlign: "center", border: "none", cursor: "pointer" }}
              >
                <div>{e.event_date}</div>
                <div>{hhmm(e.event_time)}</div>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: "var(--foreground)", textDecoration: e.status === "Cancelled" ? "line-through" : "none" }}>{e.title}</div>
                {e.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => startEdit(e)} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#ef4444", borderRadius: 8, border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
