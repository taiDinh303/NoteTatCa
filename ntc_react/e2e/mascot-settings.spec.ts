import { expect, test } from "@playwright/test";

test("appearance changes, hides and remembers a mascot, including a custom image", async ({
  page,
}) => {
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
  const toggle = page.getByRole("switch", { name: "Show mascot" });
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(53);
  await page.getByRole("radio", { name: "Fox", exact: true }).check();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Fox", exact: true }),
  ).toBeChecked();
  await page.goto("/notes");
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /fox-directions.webp/,
  );
  await page.goto("/settings/appearance");
  await toggle.click();
  await page.goto("/notes");
  await expect(page.locator(".note-card").first()).toBeVisible();
  await expect(page.locator(".note-mascot")).toHaveCount(0);
  await page.goto("/settings/appearance");
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(
    page.getByRole("radio", { name: "Fox", exact: true }),
  ).toBeChecked();
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/mascots/bunny-directions.webp");
  await expect(page.getByRole("radio", { name: "Your image" })).toBeChecked();
  await page.goto("/notes");
  await expect(page.getByRole("img", { name: "Custom mascot" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Custom mascot" })).toBeVisible();
  await page.goto("/settings/appearance");
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Bunny", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Your image" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/mascot-appearance-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.getByRole("radio", { name: "Bunny", exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: "test-results/mascot-appearance-mobile.png", fullPage: true });
});
