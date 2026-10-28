import { expect, test } from "@playwright/test";

/* Modal (bottom sheet on phones), drawer, and the 15-second undo toast — screenshots plus behaviour. */

for (const theme of ["light", "dark"] as const) {
  for (const vp of [
    { name: "375", width: 375, height: 812 },
    { name: "1440", width: 1440, height: 900 },
  ]) {
    test(`overlays · ${theme} · ${vp.name}px`, async ({ page }) => {
      await page.context().addCookies([{ name: "ls-theme", value: theme, url: String(test.info().project.use.baseURL) }]);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("dev/styleguide", { waitUntil: "networkidle" });
      const panel = page.locator(`[data-theme="${theme}"]`).last();

      // Modal: opens, traps the page, Esc closes it and focus returns to the opener.
      const opener = panel.getByRole("button", { name: "Open modal" });
      await opener.click();
      const dialog = page.getByRole("dialog", { name: "Request price" });
      await expect(dialog).toBeVisible();
      if (vp.width < 768) {
        // Bottom sheet: full width and, once its 200 ms slide-up ends, touching the bottom of the screen.
        await expect
          .poll(async () => {
            const box = await dialog.boundingBox();
            return box ? [Math.round(box.width), Math.round(box.y + box.height)] : null;
          })
          .toEqual([vp.width, vp.height]);
      }
      await page.screenshot({ path: `screenshots/modal-${theme}-${vp.name}.png`, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();

      // Drawer
      await panel.getByRole("button", { name: "Open drawer" }).click();
      const drawer = page.getByRole("dialog", { name: "Ramesh Traders" });
      await expect(drawer).toBeVisible();
      await page.screenshot({ path: `screenshots/drawer-${theme}-${vp.name}.png`, animations: "disabled" });
      await drawer.getByRole("button", { name: "Close" }).click();
      await expect(drawer).toBeHidden();

      // Undo toast: shows Undo; pressing it runs the undo and confirms.
      await panel.getByRole("button", { name: "Undo toast (15 s)" }).click();
      const undo = page.getByRole("button", { name: "Undo", exact: true });
      await expect(undo).toBeVisible();
      await page.screenshot({ path: `screenshots/toast-${theme}-${vp.name}.png`, animations: "disabled" });
      await undo.click();
      await expect(page.getByText("Stock is back to where it was.")).toBeVisible();
    });
  }
}

test("undo toast closes by itself after its countdown", async ({ page }) => {
  await page.clock.install();
  await page.goto("dev/styleguide", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Undo toast (15 s)" }).first().click();
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeVisible();
  await page.clock.runFor(14_000);
  await expect(undo).toBeVisible();
  await page.clock.runFor(1_500);
  await expect(undo).toBeHidden();
});
