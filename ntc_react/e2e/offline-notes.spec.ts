import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const fixture = "http://127.0.0.1:5199";
async function login(page: Page, email = "a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toBeVisible();
}
async function write(page: Page, title: string) {
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title", { exact: true }).click();
  await editor.getByLabel("Note title", { exact: true }).fill(title);
  await editor
    .getByRole("textbox", { name: "Note content" })
    .fill("Private offline text");
  return editor;
}
test.beforeEach(async ({ request }) => {
  await request.post(fixture + "/__fixture/reset");
});

test("downloaded first-page notes remain editable after an offline reload with more pages on the server", async ({ page, request }) => {
  expect((await request.post(fixture + "/__fixture/seed-notes?count=110")).ok()).toBeTruthy();
  await login(page);
  await expect(page.locator(".note-card")).toHaveCount(100);
  await expect(page.getByRole("button", { name: "Load more notes", exact: true })).toBeVisible();
  await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }));
  await page.route("**/health/live", route => route.abort());
  await page.route("**/api/**", route => route.abort());
  await page.reload();
  await expect(page.locator(".note-card")).toHaveCount(100);
  await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await editor.getByLabel("Note title").fill("Offline first-page edit");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Offline first-page edit", exact: true })).toBeVisible();
});
test("two offline tabs keep a stale editor draft instead of overwriting the newer local edit", async ({
  page,
  context,
}) => {
  await login(page);
  const created = await write(page, "Shared tab note");
  await expect(
    created.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await created.getByRole("button", { name: "Close", exact: true }).click();
  const second = await context.newPage();
  await second.goto("/notes");
  await expect(
    second.getByRole("button", { name: "Open Shared tab note", exact: true }),
  ).toBeVisible();
  for (const tab of [page, second]) {
    await tab
      .getByRole("button", { name: "Open Shared tab note", exact: true })
      .click();
    await tab
      .getByRole("dialog")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
  }
  await context.setOffline(true);
  await page
    .getByRole("dialog")
    .getByLabel("Note title", { exact: true })
    .fill("First tab saved");
  await expect(
    page
      .getByRole("dialog")
      .getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await second
    .getByRole("dialog")
    .getByLabel("Note title", { exact: true })
    .fill("Second tab draft");
  await expect(
    second
      .getByRole("dialog")
      .getByText("Changes need your attention", { exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole("dialog").getByLabel("Note title", { exact: true }),
  ).toHaveValue("Second tab draft");
  await expect(
    page.getByRole("dialog").getByLabel("Note title", { exact: true }),
  ).toHaveValue("First tab saved");
});
test("storage failure keeps the editor draft and never reports it saved", async ({
  page,
  context,
}) => {
  await login(page);
  await context.setOffline(true);
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = () => {
      throw new DOMException("Device storage is full", "QuotaExceededError");
    };
  });
  const editor = await write(page, "Storage failure draft");
  await expect(
    editor.getByText("Could not save", { exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("textbox", { name: "Note content" }),
  ).toContainText("Private offline text");
  await expect(
    editor.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toHaveCount(0);
});
for (const width of [320, 393])
  test(`offline controls and logout protection fit mobile ${width}`, async ({
    page,
    context,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await login(page);
    await context.setOffline(true);
    const editor = await write(page, "Mobile offline");
    await expect(
      editor.getByText("Saved on this device; waiting to sync", {
        exact: true,
      }),
    ).toBeVisible();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Unsynced notes", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("offline-logout-mobile.png"),
    });
    await page
      .getByRole("button", { name: "Stay signed in", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open Mobile offline", exact: true }),
    ).toBeVisible();
  });
test("downloads pending changes before clearing local data on sign out", async ({
  page,
  context,
}) => {
  await login(page);
  await context.setOffline(true);
  const editor = await write(page, "Backup before logout");
  await expect(
    editor.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const file = await download;
  const data = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(data.pending[0].draft.title).toBe("Backup before logout");
  expect(JSON.stringify(data)).not.toContain("refreshToken");
  await page
    .getByRole("button", { name: "Backup saved; sign out", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("ntc.offline.v1");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      return await new Promise<number>((resolve) => {
        const r = db.transaction("accounts").objectStore("accounts").count();
        r.onsuccess = () => {
          db.close();
          resolve(r.result);
        };
      });
    }),
  ).toBe(0);
});
test("external edits create a reviewable conflict and an offline copy never overwrites them", async ({
  page,
  context,
  request,
}) => {
  await login(page);
  const created = await write(page, "Online base");
  await expect(
    created.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await created.getByRole("button", { name: "Close", exact: true }).click();
  const loginResponse = await request.post(fixture + "/api/v1/auth/login", {
    data: { email: "a@example.test", password: "Synthetic-password-123!" },
  });
  const headers = {
    Authorization: "Bearer " + (await loginResponse.json()).data.token,
  };
  const original = (
    await (await request.get(fixture + "/api/v1/notes", { headers })).json()
  ).data.items.find((note: { title: string }) => note.title === "Online base");
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Open Online base", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor
    .getByLabel("Note title", { exact: true })
    .fill("Local conflicting edit");
  await expect(
    editor.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  expect(
    (
      await request.patch(fixture + "/api/v1/notes/" + original.id, {
        headers,
        data: { title: "External change", version: original.version },
      })
    ).ok(),
  ).toBeTruthy();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Review sync", exact: true }).click();
  const review = page.getByRole("dialog", {
    name: "Note synchronization",
    exact: true,
  });
  await expect(review).toContainText("Local conflicting edit");
  await review
    .getByRole("button", { name: "Save as a new copy", exact: true })
    .click();
  await review.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("Notes synced", { exact: true })).toBeAttached();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open External change", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Local conflicting edit (offline copy)",
      exact: true,
    }),
  ).toBeVisible();
});
test("notes open before a blocked secondary profile request", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/me", async (route) => {
    await waiting;
    await route.fulfill({
      status: 503,
      json: { message: "Profile unavailable" },
    });
  });
  await login(page);
  await expect(page.locator(".offline-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sync now", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sync now", exact: true }).click();
  await expect(page.getByText("Notes synced", { exact: true })).toBeAttached();
  release();
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toBeVisible();
});
test("offline creation, reload, editing, reconnect, logout protection and account isolation", async ({
  page,
  context,
}) => {
  await login(page);
  await context.setOffline(true);
  const editor = await write(page, "Offline draft");
  await expect(
    editor.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Offline draft", exact: true }),
  ).toBeVisible();
  // Vite serves the shell online; API stays blocked to exercise offline session hydration.
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "onLine", {
      get: () => false,
      configurable: true,
    }),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "onLine", {
      get: () => false,
      configurable: true,
    }),
  );
  await page.route("**/health/live", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await context.setOffline(false);
  await page.reload();
  // Mark browser offline to skip wake probes on the cached-session path.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "onLine", {
      get: () => false,
      configurable: true,
    }),
  );
  // A true offline navigation is covered separately against the production service worker.
  await expect(
    page.getByRole("button", { name: "Open Offline draft", exact: true }),
  ).toBeVisible({ timeout: 130_000 });
  await page
    .getByRole("button", { name: "Open Offline draft", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Note title", { exact: true }).fill("Offline edited");
  await expect(
    edit.getByText("Saved on this device; waiting to sync", { exact: true }),
  ).toBeVisible();
  await edit.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Unsynced notes" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stay signed in", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Offline edited", exact: true }),
  ).toBeVisible();
  await page.unroute("**/health/live");
  await page.unroute("**/api/**");
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "onLine", {
      get: () => true,
      configurable: true,
    }),
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      get: () => true,
      configurable: true,
    });
    window.dispatchEvent(new Event("online"));
  });
  // Reconnection starts sync automatically; the manual button can be disabled
  // or disappear while that flight completes.
  await expect(page.getByText("Notes synced", { exact: true })).toBeAttached({
    timeout: 30_000,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open Offline edited", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await login(page, "b@example.test");
  await expect(
    page.getByRole("button", { name: "Open Offline edited", exact: true }),
  ).toHaveCount(0);
});
