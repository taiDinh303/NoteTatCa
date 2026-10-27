import { expect, test } from "@playwright/test";

for (const width of [1024, 1366, 1440, 1920]) {
  test(`desktop sidebar keeps its width across workspace pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();

    const geometry = () => page.locator(".customer-shell").evaluate((shell) => {
      const sidebar = shell.querySelector(".sidebar")!;
      const main = shell.querySelector(".main-column")!;
      return {
        sidebar: sidebar.getBoundingClientRect().width,
        main: main.getBoundingClientRect().left,
      };
    });
    const baseline = await geometry();
    for (const [label, path] of [
      ["Reminders", "/reminders"],
      ["Inbox", "/notifications"],
      ["Trash", "/trash"],
      ["All notes", "/notes"],
    ]) {
      await page.locator("#workspace-navigation").getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      const current = await geometry();
      expect(Math.abs(current.sidebar - baseline.sidebar)).toBeLessThan(1);
      expect(Math.abs(current.main - baseline.main)).toBeLessThan(1);
    }
  });
}
