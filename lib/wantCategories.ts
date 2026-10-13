export const WANT_CATS = ["Learning", "Travel", "Hobby", "Career", "Personal Growth", "Fun", "Other"];

const FIXED: Record<string, [string, string]> = {
  Learning: ["#f59e0b", "#fffbeb"],
  Travel: ["#06b6d4", "#ecfeff"],
  Hobby: ["#a78bfa", "#f5f3ff"],
  Career: ["#3b82f6", "#eff6ff"],
  "Personal Growth": ["#10b981", "#f0fdf4"],
  Fun: ["#f97316", "#fff7ed"],
  Other: ["#94a3b8", "#f8fafc"],
};

// Custom categories get a stable color picked from their name.
const PALETTE: [string, string][] = [
  ["#ec4899", "#fdf2f8"],
  ["#8b5cf6", "#f5f3ff"],
  ["#14b8a6", "#f0fdfa"],
  ["#ef4444", "#fef2f2"],
  ["#84cc16", "#f7fee7"],
  ["#0ea5e9", "#f0f9ff"],
  ["#d946ef", "#fdf4ff"],
  ["#eab308", "#fefce8"],
  ["#6366f1", "#eef2ff"],
  ["#f43f5e", "#fff1f2"],
];

function pair(category: string): [string, string] {
  if (FIXED[category]) return FIXED[category];
  let h = 0;
  for (const ch of category.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const catColor = (category: string) => pair(category)[0];
export const catBg = (category: string) => pair(category)[1];
