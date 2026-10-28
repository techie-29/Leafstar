import { expect, test } from "@playwright/test";
import { expectToast, hasStack, logIn, recoveryTokenHash, resetRateLimits, signOut, sql, stack, totp } from "./helpers";

/*
  Step 2 end to end, against the REAL Supabase Auth server and database API (scripts/local-supabase.mjs):
  login, protection, sign out, password reset, Settings saves (with the "changed elsewhere" guard),
  brands, FAQ, AI limits, password change and two-step login. One browser, in order, because each
  test builds on the account state the last one left.
*/

test.describe.configure({ mode: "serial" });
test.skip(!hasStack, "needs the local Supabase stack (run through scripts/e2e.mjs with DATABASE_URL)");

let password = stack.password;

test.describe("login and protection", () => {
  test("a signed-out visitor is sent to the login page and back after signing in", async ({ page }) => {
    await page.goto("admin/settings");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fsettings/);
    await expect(page.getByRole("heading", { level: 1, name: "Owner login" })).toBeVisible();

    await logIn(page, "not-the-password-123", "/admin/settings");
    await expect(page.getByRole("alert").filter({ hasText: "That email and password don't match" }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });

  test("too many wrong passwords are blocked for a while, even with the right one", async ({ page }) => {
    const attempts = async () =>
      Number((await sql(`select coalesce(max(hits), 0) as n from rate_limits where key like 'login:email:%'`))[0].n);
    await logIn(page, "wrong-password-0");
    await expect.poll(attempts).toBe(1);
    const signInButton = page.getByRole("button", { name: "Sign in" });
    for (let i = 1; i < 10; i++) {
      // The button is busy until the previous attempt has finished.
      await expect(signInButton).toBeEnabled();
      await page.getByRole("textbox", { name: "Password", exact: true }).fill(`wrong-password-${i}`);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect.poll(attempts).toBe(i + 1);
    }
    await expect(page.getByRole("alert").filter({ hasText: "don't match" }).first()).toBeVisible();
    await expect(signInButton).toBeEnabled();
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Too many attempts" }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
    await resetRateLimits();
  });

  test("never redirects to another website after login", async ({ page }) => {
    await logIn(page, password, "https://evil.example/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    await logIn(page);
    await expect(page).toHaveURL(/\/admin$/);
    await signOut(page);
    await expect(page.getByText("You have signed out.")).toBeVisible();
    await page.goto("admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the login page is not reachable for someone already signed in", async ({ page }) => {
    await logIn(page);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("admin/login");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("forgotten password", () => {
  test("asking for a link never reveals whether an account exists", async ({ page }) => {
    for (const email of [stack.email, "nobody@example.com"]) {
      await page.goto("admin/forgot-password");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByRole("status").filter({ hasText: "If that email belongs to a Leaf Star account" }).first()).toBeVisible();
    }
  });

  test("the link from the email lets the owner set a new password", async ({ page }) => {
    const hash = await recoveryTokenHash(stack.email);
    await page.goto(`auth/confirm?token_hash=${hash}&type=recovery&next=/admin/update-password`);
    await expect(page).toHaveURL(/\/admin\/update-password/);

    await page.getByLabel("New password").fill("short");
    await page.getByLabel("Type it again").fill("short");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Use at least 12 characters")).toBeVisible();

    await page.getByLabel("New password").fill("A-much-better-pass-456");
    await page.getByLabel("Type it again").fill("A-different-pass-456");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("The two passwords don't match")).toBeVisible();

    await page.getByLabel("New password").fill("A-much-better-pass-456");
    await page.getByLabel("Type it again").fill("A-much-better-pass-456");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Your password has been changed.")).toBeVisible();
    password = "A-much-better-pass-456";

    await page.getByRole("link", { name: "Go to the admin" }).click();
    await signOut(page);
    await logIn(page, password);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("a used or broken link explains itself", async ({ page }) => {
    await page.goto("auth/confirm?token_hash=not-a-real-token&type=recovery");
    await expect(page).toHaveURL(/\/admin\/forgot-password\?link=expired/);
    await expect(page.getByRole("alert").filter({ hasText: "That reset link has expired" }).first()).toBeVisible();
  });
});

test.describe("settings", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page, password, "/admin/settings");
    await expect(page).toHaveURL(/\/admin\/settings$/);
  });

  test("business details: checked, saved, and readable by the public website", async ({ page }) => {
    const section = page.locator("#business");
    await section.getByLabel("Phone").fill("12345");
    await section.getByLabel("GSTIN").fill("not a gstin");
    await section.getByRole("button", { name: "Save business details" }).click();
    await expect(section.getByText("Enter a phone number with 10 digits")).toBeVisible();
    await expect(section.getByText("That doesn't look like a GSTIN")).toBeVisible();

    await section.getByLabel("Phone").fill("98765 43210");
    await section.getByLabel("WhatsApp number").fill("+91 98765 43210");
    await section.getByLabel("Email").fill("Sales@LeafStar.example");
    await section.getByLabel("Instagram").fill("https://instagram.com/leafstar.official");
    await section.getByLabel("City").fill("Mumbai");
    await section.getByLabel("GSTIN").fill("27aapfu0939f1zv");
    await section.getByRole("button", { name: "Save business details" }).click();
    await expectToast(page, "Business details saved.");

    await page.reload();
    await expect(section.getByLabel("Phone")).toHaveValue("+91 98765 43210");
    await expect(section.getByLabel("GSTIN")).toHaveValue("27AAPFU0939F1ZV");
    await expect(section.getByLabel("Instagram")).toHaveValue("leafstar.official");

    const row = (await sql(`select phone, whatsapp, email, city from public_settings`))[0];
    expect(row).toEqual({ phone: "919876543210", whatsapp: "919876543210", email: "sales@leafstar.example", city: "Mumbai" });
  });

  test("a save never overwrites a change made elsewhere in the meantime", async ({ page }) => {
    await sql(`update business_settings set city = 'Surat'`);
    const section = page.locator("#business");
    await section.getByLabel("City").fill("Pune");
    await section.getByRole("button", { name: "Save business details" }).click();
    await expect(section.getByRole("alert").filter({ hasText: "This was changed somewhere else" }).first()).toBeVisible();
    expect((await sql(`select city from business_settings`))[0].city).toBe("Surat");

    // A different section of the same record still saves: only the fields a form shows are compared.
    await page.locator("#alerts").getByLabel("Send new-enquiry alerts to").fill("owner@leafstar.example");
    await page.locator("#alerts").getByRole("button", { name: "Save alert email" }).click();
    await expectToast(page, "Alert email saved.");
    expect((await sql(`select alert_email, city from business_settings`))[0]).toEqual({ alert_email: "owner@leafstar.example", city: "Surat" });
  });

  test("brands: add, keep names unique, hide, rename, delete", async ({ page }) => {
    const section = page.locator("#brands");
    await section.getByLabel("New brand").fill("Leaf Star");
    await section.getByLabel("Show on website").check();
    await section.getByRole("button", { name: "Add brand" }).click();
    await expectToast(page, "Leaf Star added.");
    await expect(section.getByLabel("New brand")).toHaveValue("");

    await section.getByLabel("New brand").fill("Private Label");
    await section.getByRole("button", { name: "Add brand" }).click();
    await expectToast(page, "Private Label added.");
    await expect(section.getByLabel("New brand")).toHaveValue("");

    await section.getByLabel("New brand").fill("leaf star");
    await section.getByRole("button", { name: "Add brand" }).click();
    await expect(section.getByText("A brand with this name already exists")).toBeVisible();
    await expect(section.getByLabel("New brand")).toHaveValue("leaf star");

    await section.getByLabel("New brand").fill("Old Label");
    await section.getByRole("button", { name: "Add brand" }).click();
    await expectToast(page, "Old Label added.");

    const privateRow = section.getByRole("listitem").filter({ hasText: "Private Label" });
    await expect(privateRow.getByText("Hidden")).toBeVisible();
    expect((await sql(`select is_public from brands where name = 'Private Label'`))[0].is_public).toBe(false);

    await privateRow.getByRole("switch", { name: "Show on website" }).click();
    await expectToast(page, "Shown on the website");
    expect((await sql(`select is_public from brands where name = 'Private Label'`))[0].is_public).toBe(true);
    await privateRow.getByRole("switch", { name: "Show on website" }).click();
    await expectToast(page, "Hidden from the website");

    await privateRow.getByRole("button", { name: "Rename" }).click();
    const dialog = page.getByRole("dialog", { name: "Rename brand" });
    await dialog.getByLabel("Brand name").fill("Private Label Two");
    await dialog.getByRole("button", { name: "Save name" }).click();
    await expectToast(page, "Brand renamed.");

    await section.getByRole("listitem").filter({ hasText: "Old Label" }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete brand" }).click();
    await expectToast(page, "Brand deleted.");
    expect((await sql(`select name from brands order by name`)).map((r) => r.name)).toEqual(["Leaf Star", "Private Label Two"]);
  });

  test("a brand that has articles cannot be deleted", async ({ page }) => {
    await sql(`insert into articles (code, name, category, garment, brand_id) select 'LS-SH-9001', 'Test', 'upperwear', 'Shirt', id from brands where name = 'Leaf Star'`);
    try {
      const row = page.locator("#brands").getByRole("listitem").filter({ hasText: /^Leaf Star/ });
      await row.getByRole("button", { name: "Delete" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Delete brand" }).click();
      await expect(dialog.getByRole("alert").filter({ hasText: "This brand has articles" }).first()).toBeVisible();
    } finally {
      await sql(`delete from articles where code = 'LS-SH-9001'`);
    }
  });

  test("FAQ: add, pause, edit, delete", async ({ page }) => {
    const section = page.locator("#faq");
    await expect(section.getByText("No answers yet")).toBeVisible();
    await section.getByRole("button", { name: "Add an answer" }).click();
    let dialog = page.getByRole("dialog", { name: "Add an answer" });
    await dialog.getByRole("button", { name: "Add answer" }).click();
    await expect(dialog.getByText("Write the question as a buyer would ask it")).toBeVisible();
    await dialog.getByLabel("Topic").selectOption("Minimum order");
    await dialog.getByLabel("Question").fill("What is your minimum order?");
    await dialog.getByLabel("Answer").fill("50 pieces per article.");
    await dialog.getByRole("button", { name: "Add answer" }).click();
    await expectToast(page, "Answer added.");

    const row = section.getByRole("listitem").filter({ hasText: "What is your minimum order?" });
    await row.getByRole("switch", { name: "Chatbot uses this" }).click();
    await expectToast(page, "no longer use this answer");
    expect((await sql(`select is_active from faq_entries`))[0].is_active).toBe(false);

    await row.getByRole("button", { name: "Edit" }).click();
    dialog = page.getByRole("dialog", { name: "Edit answer" });
    await dialog.getByLabel("Answer").fill("100 pieces per article, any sizes.");
    await dialog.getByRole("button", { name: "Save answer" }).click();
    await expectToast(page, "Answer updated.");
    expect((await sql(`select answer from faq_entries`))[0].answer).toBe("100 pieces per article, any sizes.");

    await section.getByRole("listitem").filter({ hasText: "What is your minimum order?" }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete answer" }).click();
    await expectToast(page, "Answer deleted.");
    expect(await sql(`select id from faq_entries`)).toEqual([]);
  });

  test("AI: daily limit and pause switch", async ({ page }) => {
    const section = page.locator("#ai");
    await expect(section.getByText("No AI used yet today")).toBeVisible();
    await expect(section.getByLabel("Daily limit (tokens)")).toHaveValue("20,00,000");
    await section.getByLabel("Daily limit (tokens)").fill("1,50,000");
    await section.getByRole("button", { name: "Save daily limit" }).click();
    await expectToast(page, "Daily AI limit saved.");
    expect(Number((await sql(`select ai_daily_token_budget from business_settings`))[0].ai_daily_token_budget)).toBe(150000);

    await section.getByRole("switch", { name: "Pause AI" }).click();
    await expectToast(page, "AI is paused.");
    expect((await sql(`select ai_paused from business_settings`))[0].ai_paused).toBe(true);
    expect((await sql(`select ai_allowed() as ok`))[0].ok).toBe(false);
    await section.getByRole("switch", { name: "Pause AI" }).click();
    await expectToast(page, "AI is running again.");
  });

  test("change password from Settings", async ({ page }) => {
    const section = page.locator("#account");
    await section.getByLabel("New password").fill("Settings-pass-789-abc");
    await section.getByLabel("Type it again").fill("Settings-pass-789-abd");
    await section.getByRole("button", { name: "Change password" }).click();
    await expect(section.getByText("The two passwords don't match")).toBeVisible();
    await section.getByLabel("New password").fill("Settings-pass-789-abc");
    await section.getByLabel("Type it again").fill("Settings-pass-789-abc");
    await section.getByRole("button", { name: "Change password" }).click();
    await expect(section.getByText("Your password has been changed.")).toBeVisible();
    password = "Settings-pass-789-abc";
    await signOut(page);
    await logIn(page, password);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("two-step login: turn on, then a password alone is not enough", async ({ page }) => {
    const section = page.locator("#account");
    await section.getByRole("button", { name: "Turn on two-step login" }).click();
    const secret = (await section.locator("code").innerText()).trim();
    await section.getByLabel("6-digit code from the app").fill("000000");
    await section.getByRole("button", { name: "Turn on two-step login" }).click();
    await expect(section.getByText("That code didn't work")).toBeVisible();
    await section.getByLabel("6-digit code from the app").fill(totp(secret));
    await section.getByRole("button", { name: "Turn on two-step login" }).click();
    await expectToast(page, "Two-step login is on.");
    await expect(section.getByText("On", { exact: true })).toBeVisible();

    await signOut(page);
    await logIn(page, password, "/admin/settings");
    await expect(page).toHaveURL(/\/admin\/login\/verify/);
    // With only the password, admin pages send you back to the code screen.
    await page.goto("admin/settings");
    await expect(page).toHaveURL(/\/admin\/login\/verify/);

    await page.getByLabel("6-digit code").fill("123456");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("That code didn't work")).toBeVisible();
    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);

    // Leave the account as it was for the screenshot tests.
    await page.locator("#account").getByRole("button", { name: "Turn off" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Turn off" }).click();
    await expectToast(page, "Two-step login is off.");
    expect(await sql(`select id from auth.mfa_factors`)).toEqual([]);

    // Restore the original password so other tests can log in.
    const section2 = page.locator("#account");
    await section2.getByLabel("New password").fill(stack.password);
    await section2.getByLabel("Type it again").fill(stack.password);
    await section2.getByRole("button", { name: "Change password" }).click();
    await expect(section2.getByText("Your password has been changed.")).toBeVisible();
  });
});
