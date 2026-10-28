import { defineConfig, devices } from "@playwright/test";

/*
  End-to-end and screenshot tests.
  - PW_CHROMIUM_PATH: use an already-installed Chromium (Claude's sandbox); CI installs its own.
  - PW_BASE_URL: test a running site instead of starting one (e.g. the GitHub Pages preview).
*/
const port = Number(process.env.PW_PORT ?? 3100);
const rawBase = process.env.PW_BASE_URL ?? `http://127.0.0.1:${port}`;
const baseURL = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: executablePath ? { executablePath } : undefined } }],
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${port} -H 127.0.0.1`,
        url: rawBase,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
