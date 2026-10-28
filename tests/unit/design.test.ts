import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { colourTokens, contrastPairs } from "@/lib/tokens";
import { contrastRatio } from "@/lib/contrast";

const css = readFileSync(join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8");

function cssValue(theme: "light" | "dark", token: string): string | undefined {
  const block = theme === "light" ? css.slice(css.indexOf(':root,\n[data-theme="light"]'), css.indexOf('[data-theme="dark"] {')) : css.slice(css.indexOf('[data-theme="dark"] {'));
  const m = block.match(new RegExp(`--ls-${token}:\\s*(#[0-9A-Fa-f]{6})`));
  return m?.[1];
}

describe("design tokens", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`${theme}: globals.css and lib/tokens.ts hold the same colours`, () => {
      for (const [token, hex] of Object.entries(colourTokens[theme])) {
        expect(cssValue(theme, token)?.toUpperCase(), `--ls-${token}`).toBe(hex.toUpperCase());
      }
    });

    it(`${theme}: every text/control pair passes WCAG AA`, () => {
      const failures = contrastPairs
        .map((p) => ({ ...p, ratio: contrastRatio(colourTokens[theme][p.fg], colourTokens[theme][p.bg]) }))
        .filter((p) => p.ratio < p.min)
        .map((p) => `${p.fg} on ${p.bg} = ${p.ratio} (needs ${p.min}, ${p.use})`);
      expect(failures).toEqual([]);
    });
  }

  it("removes Tailwind's default scales so off-scale values cannot be used", () => {
    for (const reset of ["--color-*: initial", "--spacing: initial", "--spacing-*: initial", "--radius-*: initial", "--text-*: initial", "--shadow-*: initial", "--breakpoint-*: initial"]) {
      expect(css).toContain(reset);
    }
  });

  it("keeps the DESIGN.md spacing scale exactly", () => {
    const scale = [...css.matchAll(/--spacing-(\d+):\s*(\d+)px/g)].map((m) => Number(m[2]));
    expect(scale).toEqual([0, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
  });
});

describe("contrast maths", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#1C2B4A", "#C6933A")).toBeCloseTo(5.11, 1);
  });
});
