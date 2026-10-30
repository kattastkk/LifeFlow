// All color themes live here. To add your own, copy one of the entries in
// THEMES, give it a new `id` and `name`, and change the colors. It shows up
// in the sidebar's theme picker automatically. The first theme is the default.

export type ThemeColors = {
  background: string; // page background
  card: string; // cards and panels
  sidebar: string; // sidebar background
  input: string; // inputs and hover backgrounds
  border: string;
  foreground: string; // main text
  muted: string; // secondary text
  primary: string; // buttons, active items, highlights
  primaryHover: string;
  primaryStrong: string; // darker primary for text on soft backgrounds
  primarySoft: string; // very light tint of primary
  primaryLight: string; // light primary for borders and gradients
  onPrimary: string; // text on top of primary
  accent: string; // second color, used in gradients
  accentSoft: string;
  highlight: string; // third color (Want To Do, "Achieved")
  sidebarActive: string; // active sidebar item
};

export type Theme = { id: string; name: string; colors: ThemeColors };

export const THEMES: Theme[] = [
  {
    id: "pink",
    name: "Pink Bloom",
    colors: {
      background: "#FFE0EE",
      card: "#ffffff",
      sidebar: "#ffffff",
      input: "#FFC7E0",
      border: "#e5e7eb",
      foreground: "#171717",
      muted: "#6b7280",
      primary: "#db2777",
      primaryHover: "#7c3aed",
      primaryStrong: "#be185d",
      primarySoft: "#fdf2f8",
      primaryLight: "#f9a8d4",
      onPrimary: "#ffffff",
      accent: "#a855f7",
      accentSoft: "#f3e8ff",
      highlight: "#fb923c",
      sidebarActive: "#db2777",
    },
  },
  {
    id: "moss",
    name: "Moss Garden",
    colors: {
      background: "#F3EBC8",
      card: "#FBF7E4",
      sidebar: "#FBF7E4",
      input: "#E8E4C2",
      border: "#DCD5AE",
      foreground: "#2F3114",
      muted: "#6B6D45",
      primary: "#41431B",
      primaryHover: "#5C5F2A",
      primaryStrong: "#41431B",
      primarySoft: "#ECE9CC",
      primaryLight: "#AEB784",
      onPrimary: "#F3EBC8",
      accent: "#AEB784",
      accentSoft: "#E4E7CF",
      highlight: "#C9A35F",
      sidebarActive: "#41431B",
    },
  },
  {
    id: "rose",
    name: "Rose & Sage",
    colors: {
      background: "#FFEAD5",
      card: "#FFF8F0",
      sidebar: "#FFF8F0",
      input: "#FCDCCB",
      border: "#F2D6C0",
      foreground: "#3B2A2C",
      muted: "#8B7470",
      primary: "#E78895",
      primaryHover: "#89B9AD",
      primaryStrong: "#B9566A",
      primarySoft: "#FDE4E0",
      primaryLight: "#F3B8BF",
      onPrimary: "#ffffff",
      accent: "#89B9AD",
      accentSoft: "#DDEDE8",
      highlight: "#F2A57E",
      sidebarActive: "#E78895",
    },
  },
];

export const DEFAULT_THEME = THEMES[0].id;
export const THEME_STORAGE_KEY = "lifeflow-theme";

// Turns THEMES into CSS: each theme sets the --background, --primary, ...
// variables under [data-theme="id"], and the picker swatch for the active
// theme gets a ring.
export function themeCss(): string {
  return THEMES.map((t) => {
    const vars = Object.entries(t.colors)
      .map(([key, value]) => `--${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${value};`)
      .join("");
    const selector = t.id === DEFAULT_THEME ? `:root,[data-theme="${t.id}"]` : `[data-theme="${t.id}"]`;
    return (
      `${selector}{${vars}}` +
      `[data-theme="${t.id}"] [data-theme-option="${t.id}"]{box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--foreground);}`
    );
  }).join("\n");
}
