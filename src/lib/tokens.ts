/*
  The colour values from DESIGN.md §2, as data, for the styleguide and the automated contrast tests.
  globals.css holds the same values as CSS variables; tests/design.test.ts checks the two never drift apart.
*/
export type ThemeName = "light" | "dark";

export const colourTokens = {
  light: {
    bg: "#F9F5ED",
    surface: "#FFFFFF",
    "surface-2": "#F1EBDD",
    border: "#E8E1D5",
    "border-strong": "#8A8275",
    text: "#0F1924",
    "text-muted": "#5C6370",
    chrome: "#1C2B4A",
    "chrome-text": "#F9F5ED",
    gold: "#C6933A",
    "gold-hover": "#D4A855",
    "on-gold": "#1C2B4A",
    "gold-text": "#7A5C1F",
    "gold-on-chrome": "#D4A855",
    success: "#166534",
    warning: "#A04A06",
    danger: "#C21F1F",
    "on-danger": "#FFFFFF",
    "success-bg": "#DCFCE7",
    "warning-bg": "#FEF3C7",
    "danger-bg": "#FEE2E2",
    ring: "#1C2B4A",
  },
  dark: {
    bg: "#0B0B0D",
    surface: "#161618",
    "surface-2": "#1F1F22",
    border: "#2C2C30",
    "border-strong": "#6B6B72",
    text: "#F5F1E8",
    "text-muted": "#A8A399",
    chrome: "#0B0B0D",
    "chrome-text": "#F5F1E8",
    gold: "#D4AF5A",
    "gold-hover": "#E0BC6C",
    "on-gold": "#0B0B0D",
    "gold-text": "#D4AF5A",
    "gold-on-chrome": "#D4AF5A",
    success: "#4ADE80",
    warning: "#FBBF24",
    danger: "#F87171",
    "on-danger": "#0B0B0D",
    "success-bg": "#16301F",
    "warning-bg": "#33290E",
    "danger-bg": "#3A1A1A",
    ring: "#D4AF5A",
  },
} as const satisfies Record<ThemeName, Record<string, string>>;

export type ColourToken = keyof (typeof colourTokens)["light"];

/** Every text/background (and control/background) pair the interface uses, with the minimum ratio it must meet. */
export const contrastPairs: Array<{ fg: ColourToken; bg: ColourToken; min: number; use: string }> = [
  ...(["bg", "surface", "surface-2"] as const).flatMap((bg) =>
    (["text", "text-muted", "gold-text", "success", "warning", "danger"] as const).map((fg) => ({ fg, bg, min: 4.5, use: "text" })),
  ),
  { fg: "on-gold", bg: "gold", min: 4.5, use: "primary button" },
  { fg: "on-gold", bg: "gold-hover", min: 4.5, use: "primary button hover" },
  { fg: "on-danger", bg: "danger", min: 4.5, use: "danger button" },
  { fg: "chrome-text", bg: "chrome", min: 4.5, use: "navbar, hero, sidebar" },
  { fg: "gold-on-chrome", bg: "chrome", min: 4.5, use: "active nav on chrome" },
  { fg: "success", bg: "success-bg", min: 4.5, use: "status chip" },
  { fg: "warning", bg: "warning-bg", min: 4.5, use: "status chip" },
  { fg: "danger", bg: "danger-bg", min: 4.5, use: "status chip" },
  { fg: "border-strong", bg: "surface", min: 3, use: "input border" },
  { fg: "border-strong", bg: "bg", min: 3, use: "input border" },
  { fg: "ring", bg: "bg", min: 3, use: "focus ring" },
  { fg: "ring", bg: "surface", min: 3, use: "focus ring" },
];
