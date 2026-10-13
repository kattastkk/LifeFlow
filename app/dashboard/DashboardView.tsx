"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import { catColor } from "@/lib/wantCategories";
import type { Task, TodayItem, CalendarEvent, Habit, HabitCompletion, Mood, JournalEntry, TodoItem, WantItem } from "@/types/database";
import { setTaskStatus } from "./tasks/actions";
import { toggleTodayItem } from "./today/actions";
import { toggleHabitDay } from "./habits/actions";
import { toggleTodo } from "./todo/actions";
import { toggleWantItem } from "./wantodo/actions";

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

const STATUS_COLORS: Record<string, [string, string]> = {
  "To Do": ["#f1f5f9", "#64748b"],
  "In Progress": ["#fef3c7", "#d97706"],
  Completed: ["#d1fae5", "#059669"],
};

type Data = {
  tasks: Task[];
  todayItems: TodayItem[];
  completions: HabitCompletion[];
  todoItems: TodoItem[];
  wantItems: WantItem[];
};

type Change =
  | { type: "taskStatus"; id: string; status: Task["status"] }
  | { type: "toggleToday"; id: string }
  | { type: "toggleHabit"; habitId: string; date: string }
  | { type: "toggleTodo"; id: string }
  | { type: "toggleWant"; id: string };

function reduce(d: Data, c: Change): Data {
  switch (c.type) {
    case "taskStatus":
      return { ...d, tasks: d.tasks.map((t) => (t.id === c.id ? { ...t, status: c.status } : t)) };
    case "toggleToday":
      return { ...d, todayItems: d.todayItems.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i)) };
    case "toggleHabit": {
      const has = d.completions.some((x) => x.habit_id === c.habitId && x.date === c.date);
      return {
        ...d,
        completions: has
          ? d.completions.filter((x) => !(x.habit_id === c.habitId && x.date === c.date))
          : [...d.completions, { habit_id: c.habitId, date: c.date }],
      };
    }
    case "toggleTodo":
      return { ...d, todoItems: d.todoItems.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i)) };
    case "toggleWant":
      return { ...d, wantItems: d.wantItems.map((i) => (i.id === c.id ? { ...i, completed: !i.completed } : i)) };
  }
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function habitStreak(habitId: string, completions: Set<string>) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    if (!completions.has(`${habitId}|${isoDate(d)}`)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function SectionHeader({ title, icon, action, href }: { title: string; icon: string; action: string; href: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
      <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>
        <span style={{ marginRight: 6 }}>{icon}</span>
        {title}
      </div>
      <Link href={href} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12, whiteSpace: "nowrap" }}>
        {action} →
      </Link>
    </div>
  );
}

function EmptyState({ msg, icon }: { msg: string; icon: string }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      {msg}
    </div>
  );
}

function Check({ checked, color, round, onClick, label }: { checked: boolean; color: string; round?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={checked}
      style={{
        width: 20,
        height: 20,
        borderRadius: round ? "50%" : 6,
        border: `2px solid ${checked ? color : "#d1d5db"}`,
        background: checked ? color : "transparent",
        color: "#fff",
        fontSize: 11,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

// Shows the first `limit` rows with a toggle to reveal the rest.
function Expandable<T>({ items, limit, noun, render }: { items: T[]; limit: number; noun: string; render: (item: T) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const hidden = items.length - limit;
  return (
    <>
      {(open ? items : items.slice(0, limit)).map(render)}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ display: "block", width: "100%", marginTop: 8, padding: "6px 0", fontSize: 12, fontWeight: 500, color: "#db2777", background: "transparent", border: "none", cursor: "pointer" }}
        >
          {open ? "Show less ▲" : `+${hidden} more ${noun} ▼`}
        </button>
      )}
    </>
  );
}

const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" } as const;
const doneText = (done: boolean) => ({ flex: 1, minWidth: 0, fontSize: 13, color: "var(--foreground)", textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }) as const;
// Cards flow into as many columns as fit, and pack tightly when one grows.
const tile = { breakInside: "avoid", marginBottom: 20 } as const;

export default function DashboardView({
  today,
  dateLabel,
  tasks,
  todayItems,
  events,
  habits,
  completions,
  todayMood,
  latestJournal,
  todoItems,
  wantItems,
}: Data & {
  today: string;
  dateLabel: string;
  events: CalendarEvent[];
  habits: Habit[];
  todayMood: Mood | null;
  latestJournal: JournalEntry | null;
}) {
  const [d, apply] = useOptimistic({ tasks, todayItems, completions, todoItems, wantItems }, reduce);
  const [, startTransition] = useTransition();

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const tickTask = (t: Task) => {
    const status = t.status === "Completed" ? "To Do" : "Completed";
    run({ type: "taskStatus", id: t.id, status }, () => setTaskStatus(fd({ id: t.id, status })));
  };
  const tickToday = (i: TodayItem) =>
    run({ type: "toggleToday", id: i.id }, () => toggleTodayItem(fd({ id: i.id, completed: String(i.completed) })));
  const tickHabit = (habitId: string, done: boolean) =>
    run({ type: "toggleHabit", habitId, date: today }, () => toggleHabitDay(fd({ habit_id: habitId, date: today, was_completed: String(done) })));
  const tickTodo = (i: TodoItem) =>
    run({ type: "toggleTodo", id: i.id }, () => toggleTodo(fd({ id: i.id, completed: String(i.completed) })));
  const tickWant = (i: WantItem) =>
    run({ type: "toggleWant", id: i.id }, () => toggleWantItem(fd({ id: i.id, completed: String(i.completed) })));

  const completionSet = new Set(d.completions.map((c) => `${c.habit_id}|${c.date}`));
  const todayTasks = d.tasks.filter((t) => t.due_date === today);
  const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
  const completedTotal = d.tasks.filter((t) => t.status === "Completed").length;
  const habitsDoneToday = habits.filter((h) => completionSet.has(`${h.id}|${today}`)).length;
  const maxStreak = habits.reduce((max, h) => Math.max(max, habitStreak(h.id, completionSet)), 0);
  const overallProgress = d.tasks.length ? Math.round((completedTotal / d.tasks.length) * 100) : 0;
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const todayDone = d.todayItems.filter((i) => i.completed).length;
  const todayPct = d.todayItems.length ? Math.round((todayDone / d.todayItems.length) * 100) : 0;
  const todaySorted = [...d.todayItems].sort((a, b) => Number(a.completed) - Number(b.completed) || b.created_at.localeCompare(a.created_at));

  const todoDone = d.todoItems.filter((i) => i.completed).length;
  const todoPct = d.todoItems.length ? Math.round((todoDone / d.todoItems.length) * 100) : 0;
  const todoPending = d.todoItems.filter((i) => !i.completed).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const wantDone = d.wantItems.filter((i) => i.completed).length;
  const wantActive = d.wantItems.filter((i) => !i.completed).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const wantRecent = [...d.wantItems].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: "var(--foreground)" }}>Good {timeOfDay()} ✨</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{dateLabel}</p>
        </div>
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 14, padding: "14px 18px", maxWidth: 340 }}>
          <p style={{ fontSize: 14, fontStyle: "italic", color: "#6d28d9", lineHeight: 1.5 }}>&quot;{quote.text}&quot;</p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>— {quote.author}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {[
          { label: "Tasks today", value: `${completedToday}/${todayTasks.length}`, icon: "✅", color: "#db2777" },
          { label: "Habits done", value: `${habitsDoneToday}/${habits.length}`, icon: "🔥", color: "#f59e0b" },
          { label: "Best streak", value: `${maxStreak}d`, icon: "⚡", color: "#ef4444" },
          { label: "Overall progress", value: `${overallProgress}%`, icon: "📈", color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="lf-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ columnWidth: 300, columnGap: 20 }}>
        <div className="lf-card" style={tile}>
          <SectionHeader title="To Do Today" icon="☀️" action="Open" href="/dashboard/today" />
          {d.todayItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {todayDone} of {d.todayItems.length} done
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ec4899" }}>{todayPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${todayPct}%`, background: "linear-gradient(90deg, #ec4899, #a855f7)" }} />
              </div>
            </div>
          )}
          {todaySorted.length === 0 && <EmptyState msg="Nothing planned yet" icon="☀️" />}
          <Expandable
            items={todaySorted}
            limit={5}
            noun="items"
            render={(item) => (
              <div key={item.id} style={rowStyle}>
                <Check checked={item.completed} color="#ec4899" round onClick={() => tickToday(item)} label={item.text} />
                <span style={doneText(item.completed)}>{item.text}</span>
              </div>
            )}
          />
        </div>

        <div className="lf-card" style={tile}>
          <SectionHeader title="Today's Tasks" icon="✅" action="View all" href="/dashboard/tasks" />
          {todayTasks.length === 0 && <EmptyState msg="No tasks due today" icon="😊" />}
          <Expandable
            items={todayTasks}
            limit={4}
            noun="tasks"
            render={(t) => {
              const [bg, col] = STATUS_COLORS[t.status] ?? STATUS_COLORS["To Do"];
              return (
                <div key={t.id} style={rowStyle}>
                  <Check checked={t.status === "Completed"} color="#10b981" onClick={() => tickTask(t)} label={t.title} />
                  <span style={doneText(t.status === "Completed")}>{t.title}</span>
                  <span className="tag" style={{ background: bg, color: col }}>
                    {t.status}
                  </span>
                </div>
              );
            }}
          />
        </div>

        <div className="lf-card" style={tile}>
          <SectionHeader title="Today's Habits" icon="🔥" action="View all" href="/dashboard/habits" />
          {habits.length === 0 && <EmptyState msg="No habits yet" icon="🌱" />}
          <Expandable
            items={habits}
            limit={5}
            noun="habits"
            render={(h) => {
              const done = completionSet.has(`${h.id}|${today}`);
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <span style={{ fontSize: 20 }}>{h.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--foreground)" }}>{h.name}</span>
                  <button
                    type="button"
                    onClick={() => tickHabit(h.id, done)}
                    aria-label={h.name}
                    aria-pressed={done}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: done ? h.color : "transparent",
                      border: `2px solid ${h.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#fff",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {done ? "✓" : ""}
                  </button>
                </div>
              );
            }}
          />
        </div>

        <div className="lf-card" style={tile}>
          <SectionHeader title="Upcoming Events" icon="📅" action="View all" href="/dashboard/calendar" />
          {events.length === 0 && <EmptyState msg="No events today" icon="📭" />}
          <Expandable
            items={events}
            limit={4}
            noun="events"
            render={(e) => (
              <div key={e.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ background: "#f5f3ff", color: "#db2777", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, height: "fit-content", flexShrink: 0 }}>
                  {e.event_time?.slice(0, 5) ?? "—"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>{e.title}</div>
                  {e.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.description}</div>}
                </div>
              </div>
            )}
          />
        </div>

        <div className="lf-card" style={{ ...tile, border: "1px solid #e0f2fe" }}>
          <SectionHeader title="To Do List" icon="📝" action="Open" href="/dashboard/todo" />
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {[
              { l: "Total", v: d.todoItems.length, c: "#3b82f6" },
              { l: "Done", v: todoDone, c: "#10b981" },
              { l: "Left", v: d.todoItems.length - todoDone, c: "#6366f1" },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, textAlign: "center", background: "#f0f9ff", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {d.todoItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Progress</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>{todoPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${todoPct}%`, background: "linear-gradient(90deg,#60a5fa,#818cf8)" }} />
              </div>
            </div>
          )}
          {todoPending.length === 0 && (
            <EmptyState msg={d.todoItems.length === 0 ? "Nothing added yet" : "All done! 🎉"} icon={d.todoItems.length === 0 ? "📋" : "✨"} />
          )}
          <Expandable
            items={todoPending}
            limit={3}
            noun="to-dos"
            render={(item) => (
              <div key={item.id} style={rowStyle}>
                <Check checked={item.completed} color="#3b82f6" onClick={() => tickTodo(item)} label={item.text} />
                <span style={doneText(item.completed)}>{item.text}</span>
              </div>
            )}
          />
        </div>

        <div className="lf-card" style={{ ...tile, border: "1px solid #fce7f3" }}>
          <SectionHeader title="Want To Do" icon="🌟" action="Open" href="/dashboard/wantodo" />
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {[
              { l: "Goals", v: d.wantItems.length, c: "#f472b6" },
              { l: "Achieved", v: wantDone, c: "#fb923c" },
              { l: "Dreaming", v: d.wantItems.length - wantDone, c: "#c084fc" },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, textAlign: "center", background: "#fdf2f8", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {wantRecent.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Recently added</div>
              {wantRecent.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: catColor(i.category) + "20",
                      color: catColor(i.category),
                      fontWeight: 600,
                    }}
                  >
                    {i.category}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
                </div>
              ))}
            </div>
          )}
          {wantActive.length === 0 && (
            <EmptyState msg={d.wantItems.length === 0 ? "Add your first dream" : "All goals achieved! 🌟"} icon={d.wantItems.length === 0 ? "💭" : "🎊"} />
          )}
          <Expandable
            items={wantActive}
            limit={3}
            noun="dreams"
            render={(item) => (
              <div key={item.id} style={rowStyle}>
                <Check checked={item.completed} color={catColor(item.category)} round onClick={() => tickWant(item)} label={item.title} />
                <span style={{ ...doneText(item.completed), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{item.category}</span>
              </div>
            )}
          />
        </div>

        <div className="lf-card" style={tile}>
          <SectionHeader title="Today's mood" icon="💫" action="Log mood" href="/dashboard/mood" />
          {todayMood ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 36 }}>{["😢", "😕", "😐", "🙂", "😄"][todayMood.value - 1]}</span>
              {todayMood.note && <div style={{ fontSize: 12, color: "var(--muted)" }}>{todayMood.note}</div>}
            </div>
          ) : (
            <EmptyState msg="No mood logged yet" icon="💭" />
          )}
        </div>

        <div className="lf-card" style={tile}>
          <SectionHeader title="Journal" icon="📝" action="Write" href="/dashboard/journal" />
          {latestJournal ? (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, marginBottom: 4 }}>{latestJournal.date}</div>
              <div style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{latestJournal.content}</div>
            </div>
          ) : (
            <EmptyState msg="No journal entries yet" icon="✍️" />
          )}
        </div>
      </div>
    </div>
  );
}
