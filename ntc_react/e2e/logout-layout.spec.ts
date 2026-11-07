import { test, expect } from "@playwright/test";

for (const width of [320, 1440]) {
  test(`sign out stays centered and completes ${width}`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/notes/);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/auth/logout", async (route) => {
      await gate;
      await route.fulfill({ status: 204 });
    });
    try {
      await page.goto("/logout");
      await expect(page.getByRole("status")).toHaveText("Signing out…");
      const card = page.locator(".logout-card");
      await expect(card).toBeVisible();
      const bounds = (await card.boundingBox())!;
      expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThan(2);
      expect(Math.abs(bounds.y + bounds.height / 2 - 450)).toBeLessThan(2);
      expect(bounds.x).toBeGreaterThanOrEqual(16);
      await page.screenshot({ path: `artifacts/logout/sign-out-${width}.png` });
    } finally {
      release();
    }
    await expect(page).toHaveURL(/\/login$/);
  });
}
