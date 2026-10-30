import { expect, test } from "@playwright/test";

for (const width of [320, 393, 800, 801, 1440]) {
  test(`mobile companions pause without losing preferences at ${width}px`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("ntc.mascot.v1", "on:chef"));
    await page.goto("/login");
    const images: string[] = [];
    page.on("request", request => { if (request.url().includes("/mascots/ntc-v6/")) images.push(request.url()); });
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const mobile = width <= 800;
    if (mobile) await expect(page.locator(".note-mascot")).toHaveCount(0);
    else await expect(page.locator(".note-mascot")).toBeVisible();
    const gaps = await page.evaluate(() => {
      const toolbar = document.querySelector(".workspace-toolbar")!.getBoundingClientRect();
      const heading = document.querySelector(".section-heading")!.getBoundingClientRect();
      return { top: heading.top - toolbar.bottom, padding: getComputedStyle(document.querySelector(".workspace-main")!).paddingTop };
    });
    if (mobile) {
      expect(gaps.top).toBeGreaterThanOrEqual(18);
      expect(gaps.top).toBeLessThanOrEqual(22);
      expect(gaps.padding).toBe("16px");
    } else expect(gaps.top).toBeLessThanOrEqual(22);
    await page.screenshot({ path: info.outputPath("notes.png") });
    await page.locator(".note-card").first().getByRole("button", { name: /^Open / }).click();
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(viewer).toBeVisible();
    await expect(viewer.locator(".note-mascot")).toHaveCount(mobile ? 0 : 1);
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto("/settings/appearance");
    await expect(page.getByRole("switch", { name: "Dark mode", exact: true })).toBeVisible();
    await expect(page.locator(".mascot-settings")).toHaveCount(mobile ? 0 : 1);
    if (mobile) expect(images).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("ntc.mascot.v1"))).toBe("on:chef");
    if (width === 393) {
      await page.screenshot({ path: info.outputPath("appearance.png") });
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(page.getByRole("switch", { name: "Show mascot", exact: true })).toBeVisible();
      await expect(page.getByLabel("Chef", { exact: true })).toBeChecked();
      await page.setViewportSize({ width: 393, height: 900 });
      await expect(page.locator(".mascot-settings")).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("ntc.mascot.v1"))).toBe("on:chef");
    }
  });
}
