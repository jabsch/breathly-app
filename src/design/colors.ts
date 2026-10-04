// The palette. The values come from the Tailwind v3 default palette, which the app
// used through NativeWind until the styles moved to StyleSheet. They are inlined here
// so that the app does not depend on `tailwindcss` at runtime.
export const colors = {
  white: "#ffffff",
  "gray-100": "#f3f4f6", // Web settings row background
  "gray-300": "#d1d5db", // Web settings radio button border
  "stone-100": "#f5f5f4", // Light background
  "stone-200": "#e7e5e4", // Borders in settings
  "stone-300": "#d6d3d1", // Disabled controls in settings
  "slate-300": "#cbd5e1", // Web settings section bottom border
  "slate-400": "#94a3b8", // Secondary text in dark mode
  "slate-500": "#64748b", // Settings borders, controls on the light background
  "slate-600": "#475569", // Settings stepper border in dark mode
  "slate-700": "#334155", // Settings bg border in dark mode
  "slate-800": "#1e293b", // Primary text in light mode
  "slate-900": "#0f172a", // Dark background
  "blue-400": "#60a5fa", // Android settings tint
  "blue-500": "#3b82f6", // iOS settings tint
  "red-400": "#f87171", // Delete action
  pastel: {
    orange: "#F2CAAD", // Home screen planet
    gray: "#E1E3DC", // Home screen planet
    green: "#ECE9B7", // Home screen planet
    "orange-light": "#F1E0D9", // Home screen button
    "gray-light": "#E7E9E6", // Home screen button
  },
};

// What each colour is *for*, per scheme. The palette above says what a colour is; this says
// where it belongs. Components read these instead of pairing a light value with a hand-written
// `*Dark` override, which is how several elements ended up with no dark variant at all.
//
// Contrast against the scheme background, by the WCAG 2.x formula:
//   light  text 10.02:1 · textSecondary 6.95:1 · control 4.36:1
//   dark   text 17.85:1 · textSecondary 6.97:1 · control 12.03:1
// Body text needs 4.5:1 and a control outline needs 3:1, so every pair above has room.
export const themeColors = {
  light: {
    background: colors["stone-100"],
    surface: colors.white,
    text: colors["slate-800"],
    textSecondary: colors["slate-600"],
    border: colors["stone-200"],
    control: colors["slate-500"],
  },
  dark: {
    background: colors["slate-900"],
    surface: colors["slate-800"],
    text: colors.white,
    textSecondary: colors["slate-400"],
    border: colors["slate-700"],
    control: colors["slate-300"],
  },
} as const;

export type ThemeColors = (typeof themeColors)["light"];
