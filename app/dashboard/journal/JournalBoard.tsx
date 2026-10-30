"use client";

import { useOptimistic, useState, useTransition } from "react";
import { fd } from "@/lib/fd";
import { JOURNAL_TOPICS, type JournalTopicKey } from "@/lib/journal";
import type { JournalEntry } from "@/types/database";
import { saveJournalDay, deleteJournalDay } from "./actions";

type Draft = Record<JournalTopicKey, string> & { content: string };

type Change = { type: "save"; entry: JournalEntry } | { type: "delete"; date: string };

function reduce(entries: JournalEntry[], c: Change): JournalEntry[] {
  const rest = entries.filter((e) => e.date !== (c.type === "save" ? c.entry.date : c.date));
  return c.type === "save" ? [...rest, c.entry] : rest;
}

// Shift a YYYY-MM-DD string by whole days without local-timezone drift.
function shiftDay(day: string, delta: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const longDate = (day: string) =>
  new Date(day + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function draftOf(e: JournalEntry | undefined): Draft {
  return {
    grateful: e?.grateful ?? "",
    felt_most: e?.felt_most ?? "",
    achievements: e?.achievements ?? "",
    learned: e?.learned ?? "",
    worries: e?.worries ?? "",
    tomorrow: e?.tomorrow ?? "",
    content: e?.content ?? "",
  };
}

const clean = (d: Draft) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()])) as Draft;
const isEmpty = (d: Draft) => Object.values(clean(d)).every((v) => !v);
const sameDraft = (a: Draft, b: Draft) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));

// "3 things I am grateful for" is stored as one text value, one thing per line.
function gratefulLines(text: string) {
  const lines = text.split("\n");
  return [lines[0] ?? "", lines[1] ?? "", lines.slice(2).join(" ")];
}

export default function JournalBoard({ entries: serverEntries, today }: { entries: JournalEntry[]; today: string }) {
  const [entries, apply] = useOptimistic(serverEntries, reduce);
  const [, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<Draft>(() => draftOf(serverEntries.find((e) => e.date === today)));
  const [search, setSearch] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const run = (change: Change, save: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      await save();
    });

  const byDate = new Map(entries.map((e) => [e.date, e]));
  const saved = byDate.get(date);
  const dirty = !sameDraft(draft, draftOf(saved));
  const yesterday = shiftDay(today, -1);

  const pickDate = (d: string) => {
    if (!d || d > today || d === date) return;
    if (dirty && !confirm("You have unsaved changes for this day. Discard them?")) return;
    setDate(d);
    setDraft(draftOf(byDate.get(d)));
    setJustSaved(false);
  };

  const set = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setJustSaved(false);
  };

  const save = () => {
    const d = clean(draft);
    const fields = { date, ...d };
    if (isEmpty(d)) {
      run({ type: "delete", date }, () => saveJournalDay(fd(fields)));
    } else {
      const entry: JournalEntry = {
        id: saved?.id ?? date,
        user_id: "",
        title: saved?.title ?? null,
        prompt: saved?.prompt ?? null,
        created_at: saved?.created_at ?? new Date().toISOString(),
        date,
        ...d,
        grateful: d.grateful || null,
        felt_most: d.felt_most || null,
        achievements: d.achievements || null,
        learned: d.learned || null,
        worries: d.worries || null,
        tomorrow: d.tomorrow || null,
      };
      run({ type: "save", entry }, () => saveJournalDay(fd(fields)));
    }
    setDraft(d);
    setJustSaved(true);
  };

  const remove = () => {
    if (!saved || !confirm(`Delete the journal entry for ${longDate(date)}?`)) return;
    run({ type: "delete", date }, () => deleteJournalDay(fd({ date })));
    setDraft(draftOf(undefined));
  };

  const filledCount = (e: JournalEntry) => JOURNAL_TOPICS.filter((t) => e[t.key]?.trim()).length;
  const preview = (e: JournalEntry) => JOURNAL_TOPICS.map((t) => e[t.key]?.trim()).find(Boolean) ?? e.content;

  const past = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) =>
      [e.date, e.content, ...JOURNAL_TOPICS.map((t) => e[t.key] ?? "")].join(" ").toLowerCase().includes(search.toLowerCase()),
    );

  const chip = (active: boolean) => ({
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "var(--primary)" : "transparent",
    color: active ? "var(--on-primary)" : "var(--muted)",
    cursor: "pointer",
  });

  const g = gratefulLines(draft.grateful);
  const setGrateful = (i: number, v: string) => {
    const next = [...g];
    next[i] = v.replace(/\n/g, " ");
    set("grateful", next.join("\n").replace(/\n+$/, ""));
  };

  return (
    <>
      <div className="lf-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 16 }}>{longDate(date)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {saved ? `${filledCount(saved)} of 6 topics written` : "No entry yet — every topic is optional"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => pickDate(today)} style={chip(date === today)}>
              Today
            </button>
            <button type="button" onClick={() => pickDate(yesterday)} style={chip(date === yesterday)}>
              Yesterday
            </button>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => pickDate(e.target.value)}
              aria-label="Pick a date"
              className="lf-input"
              style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {JOURNAL_TOPICS.map((t) => (
            <div key={t.key} className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor={`j-${t.key}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                <span style={{ marginRight: 6 }}>{t.icon}</span>
                {t.label}
              </label>
              {t.key === "grateful" ? (
                [0, 1, 2].map((i) => (
                  <input
                    key={i}
                    id={i === 0 ? "j-grateful" : undefined}
                    value={g[i]}
                    onChange={(e) => setGrateful(i, e.target.value)}
                    placeholder={`${i + 1}.`}
                    className="lf-input"
                    style={{ padding: "6px 10px", fontSize: 13 }}
                  />
                ))
              ) : (
                <textarea
                  id={`j-${t.key}`}
                  value={draft[t.key]}
                  onChange={(e) => set(t.key, e.target.value)}
                  rows={3}
                  placeholder="Optional"
                  className="lf-input"
                  style={{ resize: "vertical", fontSize: 13, lineHeight: 1.6 }}
                />
              )}
            </div>
          ))}
        </div>

        {draft.content && (
          <div className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="j-content" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
              <span style={{ marginRight: 6 }}>📓</span>Earlier notes
            </label>
            <textarea
              id="j-content"
              value={draft.content}
              onChange={(e) => set("content", e.target.value)}
              rows={3}
              className="lf-input"
              style={{ resize: "vertical", fontSize: 13, lineHeight: 1.6 }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {justSaved && !dirty && <span style={{ fontSize: 12, color: "#059669" }}>✓ Saved</span>}
          {saved && (
            <button type="button" onClick={remove} style={{ fontSize: 12, padding: "8px 14px", borderRadius: 10, background: "#fee2e2", color: "#ef4444", border: "none", cursor: "pointer" }}>
              Delete entry
            </button>
          )}
          <button type="submit" disabled={!dirty} className="lf-btn lf-btn-primary" style={{ opacity: dirty ? 1 : 0.5 }}>
            Save entry
          </button>
        </div>
      </form>

      <div className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 15 }}>Past entries</h3>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search entries..." className="lf-input" />
        {past.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
            {search ? "No entries found" : "Start writing your first entry"}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {past.map((e) => (
            <button
              key={e.date}
              type="button"
              onClick={() => pickDate(e.date)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1.5px solid ${e.date === date ? "var(--primary)" : "var(--border)"}`,
                background: e.date === date ? "var(--primary-soft)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>📅 {e.date}</span>
                <span style={{ color: "var(--muted)" }}>{filledCount(e)}/6</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
                {preview(e)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
