import { test, expect } from "@playwright/test";
for (const width of [393, 1440]) {
  test(`cached notes remain usable during session restore and active use ${width}`, async ({
    page,
    request,
  }) => {
    await request.post(
      (process.env.NTC_CONNECTION_FIXTURE_URL ?? "http://127.0.0.1:5199") +
        "/__fixture/reset",
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
    let attempts = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/health/live", async (route) => {
      attempts++;
      if (attempts === 1)
        await route.fulfill({ status: 503, json: { status: "starting" } });
      else {
        await gate;
        await route.continue();
      }
    });
    try {
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Take a note", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Note synchronization" }),
      ).toBeVisible();
      await expect(
        page.getByText("Offline notes on this device", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("complementary", { name: "Connection status" }),
      ).toHaveCount(0);
      await expect(page.locator(".startup-screen")).toHaveCount(0);
      await page.screenshot({
        path: `../artifacts/frontend/connection-single-${width}.png`,
        animations: "disabled",
      });
    } finally {
      release();
    }
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
    await page.unroute("**/health/live");
    await expect(page.getByText("Notes synced", { exact: true })).toBeAttached({ timeout: 30_000 });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event("offline"));
    });
    const notice = page.getByRole("region", {
      name: "Note synchronization",
    });
    await expect(notice).toBeVisible();
    await expect(
      notice.getByText("Working offline", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".startup-screen")).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => true,
      });
    });
    await notice.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect(
      page.getByText("Notes synced", { exact: true }),
    ).toBeAttached();
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
  });
}
