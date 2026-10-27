import { expect, test } from "@playwright/test";

test("bunny moves to the opened card after 500ms and keeps its body still", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/Home");
  await page.getByRole("main").getByRole("link", { name: "Try guest mode", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await expect(page.locator(".note-mascot")).toHaveAttribute("data-mascot-anchor", "corner");
  const cards = page.locator(".note-card");
  const targetId = await cards.filter({ hasNot: page.locator(".note-mascot") }).first().getAttribute("data-testid");
  const target = page.locator(`[data-testid="${targetId}"]`);
  await target.locator(".note-open").click();
  await expect(target.locator(".note-mascot")).toHaveCount(0);
  await expect(target.locator(".note-mascot"), { timeout: 2_000 }).toBeVisible();
  await expect(target.locator(".note-mascot")).toHaveAttribute("data-mascot-anchor", "corner");
  const body = target.locator(".mascot-fixed-body");
  const head = target.locator(".mascot-moving-head").first();
  await expect(body).toHaveCSS("background-position", "50% 50%");
  const before = await head.evaluate((el) => getComputedStyle(el).backgroundPosition);
  await page.mouse.move(0, 0);
  await expect.poll(() => head.evaluate((el) => getComputedStyle(el).backgroundPosition)).not.toBe(before);
  await expect(body).toHaveCSS("background-position", "50% 50%");
});
