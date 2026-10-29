import { expect, test } from "@playwright/test";

test("Bunny selects the corrected left and right frames in Appearance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await page.goto("/settings/appearance");
  const choice = page
    .getByRole("radio", { name: "Bunny", exact: true })
    .locator("..");
  await choice.scrollIntoViewIfNeeded();
  const layer = choice.locator(".mascot-directions");
  await expect(layer).toBeVisible();
  const box = (await choice.locator(".mascot-choice-page").boundingBox())!;
  await page.mouse.move(box.x - 180, box.y + box.height / 2);
  // The source atlas has these two columns reversed; do not mirror its pixels.
  await expect(layer).toHaveCSS("background-position", "100% 50%");
  await choice.screenshot({ path: "test-results/bunny-pointer-left.png" });
  await page.mouse.move(box.x + box.width + 180, box.y + box.height / 2);
  await expect(layer).toHaveCSS("background-position", "0% 50%");
  await choice.screenshot({ path: "test-results/bunny-pointer-right.png" });
});
