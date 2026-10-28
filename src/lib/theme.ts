export type Theme = "light" | "dark";

export const THEME_COOKIE = "ls-theme";
export const THEME_STORAGE_KEY = "ls-theme";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Runs in <head> before the page paints, so the right theme shows with no flash.
 * Order: saved choice (cookie, then localStorage) → the device setting → light.
 * Kept tiny and dependency-free on purpose; it is inlined as a string.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);var t=m?m[1]:null;if(!t){try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t)}catch(e){}})();`;

export function readDocumentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Applies a theme to the page and remembers it (cookie for future server rendering, localStorage as backup). */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the cookie still holds the choice.
  }
}
