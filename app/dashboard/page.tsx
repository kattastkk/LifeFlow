import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Task,
  TodayItem,
  CalendarEvent,
  Habit,
  HabitCompletion,
  Mood,
  JournalEntry,
  TodoItem,
  WantItem,
  DailyHistory,
} from "@/types/database";

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

const WANT_CAT_COLORS: Record<string, string> = {
  Learning: "#f59e0b",
  Travel: "#06b6d4",
  Hobby: "#a78bfa",
  Career: "#3b82f6",
  "Personal Growth": "#10b981",
  Fun: "#f97316",
  Other: "#94a3b8",
};

const STATUS_COLORS: Record<string, [string, string]> = {
  "To Do": ["#f1f5f9", "#64748b"],
  "In Progress": ["#fef3c7", "#d97706"],
  Completed: ["#d1fae5", "#059669"],
};

function SectionHeader({ title, icon, action, href }: { title: string; icon: string; action?: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>
        <span style={{ marginRight: 6 }}>{icon}</span>
        {title}
      </div>
      {action && href && (
        <Link href={href} className="lf-btn lf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
          {action} →
        </Link>
      )}
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

function StatusBadge({ status }: { status: string }) {
  const [bg, col] = STATUS_COLORS[status] ?? STATUS_COLORS["To Do"];
  return <span className="tag" style={{ background: bg, color: col }}>{status}</span>;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function habitStreak(habitId: string, completions: Set<string>) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = isoDate(d);
    if (!completions.has(`${habitId}|${k}`)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = isoDate(new Date());
  const yesterday = daysAgo(1);
  const weekStart = daysAgo(6);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [
    { data: tasksData },
    { data: todayItemsData },
    { data: eventsData },
    { data: habitsData },
    { data: completionsData },
    { data: moodData },
    { data: journalData },
    { data: todoItemsData },
    { data: wantItemsData },
    { data: historyData },
  ] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("today_items").select("*").eq("date", today),
    supabase.from("events").select("*").eq("event_date", today),
    supabase.from("habits").select("*").order("created_at", { ascending: true }),
    supabase.from("habit_completions").select("*").gte("date", daysAgo(365)),
    supabase.from("moods").select("*").eq("date", today).maybeSingle(),
    supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(1),
    supabase.from("todo_items").select("*"),
    supabase.from("want_items").select("*"),
    supabase.from("daily_history").select("*").order("date", { ascending: false }).limit(30),
  ]);

  const tasks = (tasksData ?? []) as Task[];
  const todayItems = (todayItemsData ?? []) as TodayItem[];
  const events = (eventsData ?? []) as CalendarEvent[];
  const habits = (habitsData ?? []) as Habit[];
  const completions = (completionsData ?? []) as HabitCompletion[];
  const todayMood = moodData as Mood | null;
  const latestJournal = ((journalData ?? []) as JournalEntry[])[0] ?? null;
  const todoItems = (todoItemsData ?? []) as TodoItem[];
  const wantItems = (wantItemsData ?? []) as WantItem[];
  const history = (historyData ?? []) as DailyHistory[];

  const completionSet = new Set(completions.map((c) => `${c.habit_id}|${c.date}`));

  const todayTasks = tasks.filter((t) => t.due_date === today);
  const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
  const completedTotal = tasks.filter((t) => t.status === "Completed").length;
  const habitsDoneToday = habits.filter((h) => completionSet.has(`${h.id}|${today}`)).length;
  const maxStreak = habits.reduce((max, h) => Math.max(max, habitStreak(h.id, completionSet)), 0);
  const overallProgress = tasks.length ? Math.round((completedTotal / tasks.length) * 100) : 0;

  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const todoDone = todoItems.filter((i) => i.completed).length;
  const todoPending = todoItems.filter((i) => !i.completed).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const wantDone = wantItems.filter((i) => i.completed).length;
  const wantActive = wantItems.filter((i) => !i.completed).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const wantRecent = [...wantItems].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 2);

  const todayDone = todayItems.filter((i) => i.completed).length;
  const todayPct = todayItems.length ? Math.round((todayDone / todayItems.length) * 100) : 0;
  const todaySorted = [...todayItems].sort((a, b) => Number(a.completed) - Number(b.completed));

  const yesterdayRecord = history.find((h) => h.date === yesterday) ?? null;

  const daysArchived = history.length;
  const avgRate = history.length ? Math.round(history.reduce((s, h) => s + h.completion_rate, 0) / history.length) : 0;
  const doneThisWeek = history.filter((h) => h.date >= weekStart).reduce((s, h) => s + h.completed_count, 0);
  const doneThisMonth = history.filter((h) => h.date >= monthStart).reduce((s, h) => s + h.completed_count, 0);
  let prodStreak = 0;
  {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const k = isoDate(d);
      if (!history.find((h) => h.date === k)) break;
      prodStreak++;
      d.setDate(d.getDate() - 1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: "var(--foreground)" }}>
            Good {timeOfDay()} ✨
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 14, padding: "14px 18px", maxWidth: 340 }}>
          <p style={{ fontSize: 14, fontStyle: "italic", color: "#6d28d9", lineHeight: 1.5 }}>&quot;{quote.text}&quot;</p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>— {quote.author}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        {[
          { label: "Tasks today", value: `${completedToday}/${todayTasks.length}`, icon: "✅", color: "#8b5cf6" },
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Today's Tasks */}
        <div className="lf-card">
          <SectionHeader title="Today's Tasks" icon="✅" action="View all" href="/dashboard/tasks" />
          {todayTasks.length === 0 && <EmptyState msg="No tasks due today" icon="😊" />}
          {todayTasks.slice(0, 4).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: t.priority === "High" ? "#ef4444" : t.priority === "Medium" ? "#f59e0b" : "#10b981",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: "var(--foreground)",
                  textDecoration: t.status === "Completed" ? "line-through" : "none",
                  opacity: t.status === "Completed" ? 0.5 : 1,
                }}
              >
                {t.title}
              </span>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>

        {/* To Do Today */}
        <div className="lf-card" style={{ background: "#fff", border: "1px solid #f3e8ff" }}>
          <SectionHeader title="To Do Today" icon="☀️" action="Open" href="/dashboard/today" />
          {todayItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{todayDone} of {todayItems.length} done</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ec4899" }}>{todayPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${todayPct}%`, background: "linear-gradient(90deg, #ec4899, #a855f7)" }} />
              </div>
            </div>
          )}
          {todaySorted.length === 0 && <EmptyState msg="Nothing planned yet" icon="☀️" />}
          {todaySorted.slice(0, 5).map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${item.completed ? "#ec4899" : "#d1d5db"}`,
                  background: item.completed ? "#ec4899" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.completed && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "var(--foreground)",
                  textDecoration: item.completed ? "line-through" : "none",
                  opacity: item.completed ? 0.5 : 1,
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
          {todayItems.length > 5 && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>
              +{todayItems.length - 5} more items
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="lf-card">
          <SectionHeader title="Upcoming Events" icon="📅" action="View all" href="/dashboard/calendar" />
          {events.length === 0 && <EmptyState msg="No events today" icon="📭" />}
          {events.slice(0, 4).map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ background: "#f5f3ff", color: "#8b5cf6", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, height: "fit-content", flexShrink: 0 }}>
                {e.event_time ?? "—"}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>{e.title}</div>
                {e.description && <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.description}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Today's Habits */}
        <div className="lf-card">
          <SectionHeader title="Today's Habits" icon="🔥" action="View all" href="/dashboard/habits" />
          {habits.length === 0 && <EmptyState msg="No habits yet" icon="🌱" />}
          {habits.slice(0, 5).map((h) => {
            const done = completionSet.has(`${h.id}|${today}`);
            return (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <span style={{ fontSize: 20 }}>{h.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, color: "var(--foreground)" }}>{h.name}</span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: done ? h.color : "transparent",
                    border: `2px solid ${h.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#fff",
                  }}
                >
                  {done ? "✓" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mood + Journal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="lf-card">
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
          <div className="lf-card">
            <SectionHeader title="Journal" icon="📝" action="Write" href="/dashboard/journal" />
            {latestJournal ? (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
                <div style={{ fontSize: 11, marginBottom: 4 }}>{latestJournal.date}</div>
                <div style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                  {latestJournal.content}
                </div>
              </div>
            ) : (
              <EmptyState msg="No journal entries yet" icon="✍️" />
            )}
          </div>
        </div>

        {/* To Do List widget */}
        <div className="lf-card" style={{ border: "1px solid #e0f2fe" }}>
          <SectionHeader title="To Do List" icon="📝" action="Open" href="/dashboard/todo" />
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {[
              { l: "Total", v: todoItems.length, c: "#3b82f6" },
              { l: "Done", v: todoDone, c: "#10b981" },
              { l: "Left", v: todoItems.length - todoDone, c: "#6366f1" },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, textAlign: "center", background: "#f0f9ff", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {todoItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Progress</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>
                  {todoItems.length ? Math.round((todoDone / todoItems.length) * 100) : 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${todoItems.length ? Math.round((todoDone / todoItems.length) * 100) : 0}%`,
                    background: "linear-gradient(90deg,#60a5fa,#818cf8)",
                  }}
                />
              </div>
            </div>
          )}
          {todoPending.length === 0 && (
            <EmptyState msg={todoItems.length === 0 ? "Nothing added yet" : "All done! 🎉"} icon={todoItems.length === 0 ? "📋" : "✨"} />
          )}
          {todoPending.slice(0, 3).map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--foreground)", flex: 1 }}>{item.text}</span>
            </div>
          ))}
          {todoPending.length > 3 && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>+{todoPending.length - 3} more</div>
          )}
        </div>

        {/* Want To Do widget */}
        <div className="lf-card" style={{ border: "1px solid #fce7f3" }}>
          <SectionHeader title="Want To Do" icon="🌟" action="Open" href="/dashboard/wantodo" />
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {[
              { l: "Goals", v: wantItems.length, c: "#f472b6" },
              { l: "Achieved", v: wantDone, c: "#fb923c" },
              { l: "Dreaming", v: wantItems.length - wantDone, c: "#c084fc" },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, textAlign: "center", background: "#fdf2f8", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {wantRecent.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                Recently added
              </div>
              {wantRecent.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: (WANT_CAT_COLORS[i.category] ?? "#94a3b8") + "20",
                      color: WANT_CAT_COLORS[i.category] ?? "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {i.category}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {i.title}
                  </span>
                </div>
              ))}
            </div>
          )}
          {wantActive.length === 0 && (
            <EmptyState msg={wantItems.length === 0 ? "Add your first dream" : "All goals achieved! 🌟"} icon={wantItems.length === 0 ? "💭" : "🎊"} />
          )}
          {wantActive.slice(0, 3).map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: WANT_CAT_COLORS[item.category] ?? "#f472b6", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{item.category}</span>
            </div>
          ))}
          {wantActive.length > 3 && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center" }}>+{wantActive.length - 3} more dreams</div>
          )}
        </div>

        {/* Yesterday's Reflection */}
        <div className="lf-card" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
          <SectionHeader title="Yesterday's Reflection" icon="📖" action="View Calendar" href="/dashboard/calendar" />
          {!yesterdayRecord ? (
            <EmptyState msg="No history yet — end your day on the Today page to start tracking." icon="🌙" />
          ) : (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, textAlign: "center", background: "#ede9fe", borderRadius: 10, padding: "10px 6px" }}>
                  <div style={{ fontWeight: 700, fontSize: 22, color: "#7c3aed" }}>{yesterdayRecord.completion_rate}%</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Completion</div>
                </div>
                <div style={{ flex: 1, textAlign: "center", background: "#d1fae5", borderRadius: 10, padding: "10px 6px" }}>
                  <div style={{ fontWeight: 700, fontSize: 22, color: "#059669" }}>{yesterdayRecord.completed_count}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Done</div>
                </div>
                <div style={{ flex: 1, textAlign: "center", background: "#fef3c7", borderRadius: 10, padding: "10px 6px" }}>
                  <div style={{ fontWeight: 700, fontSize: 22, color: "#d97706" }}>{yesterdayRecord.total_count}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Total</div>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Completed items
              </div>
              {yesterdayRecord.items.filter((i) => i.completed).slice(0, 3).map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "#ec4899", fontSize: 13, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: "var(--foreground)", opacity: 0.8 }}>{i.text}</span>
                </div>
              ))}
              {yesterdayRecord.items.filter((i) => i.completed).length === 0 && (
                <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>Nothing completed that day</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity Insights */}
      {history.length > 0 && (
        <div className="lf-card" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
          <SectionHeader title="Daily Activity Insights" icon="📊" action="View Calendar" href="/dashboard/calendar" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            {[
              { label: "Days archived", val: daysArchived, icon: "📅", color: "#8b5cf6" },
              { label: "Avg completion", val: `${avgRate}%`, icon: "📈", color: "#ec4899" },
              { label: "Prod. streak", val: `${prodStreak}d`, icon: "🔥", color: "#f59e0b" },
              { label: "Done this week", val: doneThisWeek, icon: "⚡", color: "#10b981" },
              { label: "Done this month", val: doneThisMonth, icon: "🗓", color: "#3b82f6" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", background: "#fff", borderRadius: 12, padding: "14px 8px", border: "1px solid #f3e8ff" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
