"use client";

import { THEMES, THEME_STORAGE_KEY } from "@/app/themes";

// The ring on the active swatch comes from the CSS in themeCss(), so this
// component needs no state and matches the theme set by the inline script.
export default function ThemePicker() {
  function choose(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
  }

  return (
    <div className="px-2">
      <div className="mb-2 text-xs font-medium text-muted">Theme</div>
      <div className="flex gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            data-theme-option={t.id}
            onClick={() => choose(t.id)}
            title={t.name}
            aria-label={`${t.name} theme`}
            className="h-7 w-7 cursor-pointer rounded-full border border-border transition-transform hover:scale-110"
            style={{
              background: `conic-gradient(${t.colors.primary} 0 50%, ${t.colors.accent} 50% 75%, ${t.colors.background} 75% 100%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
