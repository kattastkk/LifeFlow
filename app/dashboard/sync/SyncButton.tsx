"use client";

import { useState, useTransition } from "react";
import { syncAll, type SyncResult } from "./actions";

type Line = { text: string; ok: boolean };

function describe(r: SyncResult): Line[] {
  const lines: Line[] = [];
  const m = r.moodle;
  if (m.status === "ok") {
    const parts = [`${m.homework} homework`, `${m.classChanges} class change${m.classChanges === 1 ? "" : "s"}`];
    if (m.removed) parts.push(`${m.removed} removed`);
    lines.push({ text: `MyCourses: ${parts.join(" · ")}`, ok: true });
  } else if (m.status === "failed") {
    lines.push({ text: "MyCourses: couldn't reach the feed — try again later.", ok: false });
  } else {
    lines.push({ text: "MyCourses: MOODLE_ICAL_URL isn't set in Vercel.", ok: false });
  }
  const g = r.google;
  if (g.status === "ok") {
    lines.push(
      g.failed
        ? { text: `Google Calendar: ${g.failed} calendar${g.failed === 1 ? "" : "s"} couldn't load — check GOOGLE_ICAL_URL.`, ok: false }
        : { text: `Google Calendar: up to date (${g.events} events around this month)`, ok: true },
    );
  }
  return lines;
}

export default function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<Line[] | null>(null);

  const sync = () =>
    startTransition(async () => {
      setLines(null);
      try {
        setLines(describe(await syncAll()));
      } catch {
        setLines([{ text: "Sync failed — please try again.", ok: false }]);
      }
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button type="button" onClick={sync} disabled={pending} className="lf-btn lf-btn-primary" style={{ opacity: pending ? 0.7 : 1 }}>
        {pending ? "⏳ Syncing…" : "🔄 Sync"}
      </button>
      {lines && (
        <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          {lines.map((l) => (
            <span key={l.text} style={{ fontSize: 12, color: l.ok ? "#047857" : "#dc2626" }}>
              {l.ok ? "✓ " : "⚠ "}
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
