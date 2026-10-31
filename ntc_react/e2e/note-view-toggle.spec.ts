import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const fixture = "http://127.0.0.1:5199";

async function openEditor(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
  await page.getByRole("dialog", { name: "View note", exact: true })
    .getByRole("button", { name: "Edit", exact: true }).click();
  return page.getByRole("dialog", { name: "Edit note", exact: true });
}

test.beforeEach(async ({ request }) => {
  await request.post(fixture + "/__fixture/reset");
});

for (const width of [393, 1280]) {
  test(`View keeps a locally saved draft after PATCH 503 and syncs it later ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    let reject = true;
    await page.route("**/api/v1/notes/*", async (route) => {
      if (route.request().method() === "PATCH" && reject) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Synthetic save failure" }) });
      } else await route.continue();
    });
    let editor = await openEditor(page);
    await editor.getByRole("textbox", { name: "Note content" }).fill("Draft survives failed View");
    await editor.getByRole("button", { name: "View", exact: true }).click();
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Draft survives failed View");
    await expect(viewer.locator(".note-view-toolbar-space")).toHaveCount(0);
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor.getByText("Saved on this device; waiting to sync", { exact: true })).toBeVisible();
    await expect(editor.getByRole("textbox", { name: "Note content" })).toContainText("Draft survives failed View");
    await editor.getByRole("button", { name: "View", exact: true }).click();
    await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Draft survives failed View");
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
    await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Draft survives failed View");
    await viewer.getByRole("button", { name: "Close", exact: true }).click();

    reject = false;
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sync now", exact: true }).click();
    await expect(page.getByText("Notes synced", { exact: true })).toBeAttached({ timeout: 30_000 });
    await page.reload();
    await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
    await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Draft survives failed View");
  });
}

test("View opens from a committed device save while server acknowledgement is in flight", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let held = false;
  await page.route("**/api/v1/notes/*", async (route) => {
    if (route.request().method() === "PATCH" && !held) {
      held = true;
      await gate;
    }
    await route.continue();
  });
  const editor = await openEditor(page);
  await editor.getByRole("textbox", { name: "Note content" }).fill("Wait for server acknowledgement");
  await editor.getByRole("button", { name: "View", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Wait for server acknowledgement");
  await expect(editor).toHaveCount(0);
  release();
  await page.unrouteAll({ behavior: "wait" });
  await viewer.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
  await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Wait for server acknowledgement");
});

test("View stays in Edit when both server and device storage fail", async ({ page }) => {
  await page.route("**/api/v1/notes/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Synthetic save failure" }) });
    } else await route.continue();
  });
  const editor = await openEditor(page);
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = () => {
      throw new DOMException("Device storage is full", "QuotaExceededError");
    };
  });
  await editor.getByRole("textbox", { name: "Note content" }).fill("Unstored draft must remain editable");
  await editor.getByRole("button", { name: "View", exact: true }).click();
  await expect(editor.getByText("Could not save", { exact: true })).toBeVisible();
  await expect(editor.getByRole("textbox", { name: "Note content" })).toContainText("Unstored draft must remain editable");
  await expect(page.getByRole("dialog", { name: "View note", exact: true })).toHaveCount(0);
});

test("a new note can move between View and Edit without losing its draft", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("dialog", { name: "Edit note", exact: true })
    .getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title").fill("New note preview");
  await editor.getByRole("textbox", { name: "Note content" }).fill("New note can return to View");
  await editor.getByRole("button", { name: "View", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("New note can return to View");
  await viewer.getByRole("button", { name: "Edit", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await expect(editor.getByLabel("Note title")).toHaveValue("New note preview");
  await expect(editor.getByRole("textbox", { name: "Note content" })).toContainText("New note can return to View");
});

test("a locally created note opens View immediately and resolves its server ID before reminders", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("dialog", { name: "Edit note", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let sent = false;
  await page.route("**/api/v1/notes", async route => {
    if (route.request().method() === "POST") { sent = true; await gate; }
    await route.continue();
  });
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title").fill("Local new note");
  await editor.getByRole("textbox", { name: "Note content" }).fill("Durable before server ACK");
  await editor.getByRole("button", { name: "View", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("Durable before server ACK");
  await expect.poll(() => sent).toBe(true);
  await viewer.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog", { name: "Edit note", exact: true }).getByRole("button", { name: "Note reminders", exact: true }).click();
  release();
  const reminders = page.getByRole("dialog", { name: "Reminders", exact: true });
  await expect(reminders.getByRole("button", { name: "Add reminder", exact: true })).toBeVisible();
  await reminders.getByRole("button", { name: "Add reminder", exact: true }).click();
  const saving = page.waitForRequest(request => request.url().includes("/api/v1/notes/") && request.url().endsWith("/reminders") && request.method() === "POST");
  await reminders.getByRole("button", { name: "Set reminder", exact: true }).click();
  expect((await saving).url()).not.toContain("local-");
  await expect(reminders.getByText(/Does not repeat · Active/)).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});
