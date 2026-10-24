import { test, expect } from "@playwright/test";
test.skip(
  !process.env.NTC_TEST_OFFLINE_SHELL,
  "Requires a production build and playwright.offline.config.ts",
);
test("production shell opens with no network and preserves offline notes through reload", async ({
  page,
  context,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
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
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title", { exact: true }).click();
  await editor
    .getByLabel("Note title", { exact: true })
    .fill("No network note");
  await editor
    .getByRole("textbox", { name: "Note content" })
    .fill("Offline shell and lazy editor work");
  await expect(
    editor.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open No network note", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open No network note", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.getByRole("dialog");
  await edit
    .getByRole("textbox", { name: "Note content" })
    .fill("Edited again offline");
  await expect(
    edit.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await context.setOffline(false);
  await expect(page.getByText("Notes synced", { exact: true })).toBeAttached({
    timeout: 30_000,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open No network note", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open No network note", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Edited again offline");
});
