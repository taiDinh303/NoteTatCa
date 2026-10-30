import { test, expect } from "@playwright/test";
for (const width of [393, 1440])
  test(`sidebar counts ${width}`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/notifications/unread-count", (r) =>
      r.fulfill({ json: { data: 7 } }),
    );
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    if (width < 800)
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
    const bottom = page.locator(".sidebar-bottom").filter({ visible: true });
    await expect(bottom.getByRole("link")).toHaveText([
      "Settings",
      "Notifications7",
      "Help & feedback",
    ]);
    const surface =
      width < 800
        ? page.getByRole("dialog")
        : page.locator("#workspace-navigation");
    await expect(surface.locator('a[href="/notifications"]')).toHaveCount(1);
    const nav = page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .filter({ visible: true });
    await expect(
      page
        .locator(".sidebar-bottom")
        .filter({ visible: true })
        .getByRole("link", { name: "Notifications", exact: true })
        .locator(".nav-count"),
    ).toHaveText("7");
    await expect(
      nav
        .getByRole("link", { name: "Reminders", exact: true })
        .locator(".nav-count"),
    ).toHaveText(/^\d+$/);
  });
