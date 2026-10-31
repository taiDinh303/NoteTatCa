import { test, expect } from "@playwright/test";

const fixture = "http://127.0.0.1:5199";
test("restores a note revision and imports a downloaded archive as copies", async ({ page, request }) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  const session = await request.post(fixture + "/api/v1/auth/login", {
    data: { email: "a@example.test", password: "Synthetic-password-123!" },
  });
  const token = (await session.json()).data.token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const createdResponse = await request.post(fixture + "/api/v1/notes", { headers, data: { title: "History example", content: "Before" } });
  const created = (await createdResponse.json()).data;
  const editedResponse = await request.patch(fixture + `/api/v1/notes/${created.id}`, {
    headers, data: { title: "History example", content: "After", version: created.version },
  });
  expect(editedResponse.ok()).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.goto(`/notes?note=${created.id}`);
  const viewer = page.getByRole("dialog", { name: "View note" });
  await expect(viewer.getByText("After")).toBeVisible();
  await viewer.getByRole("button", { name: "Note information" }).click();
  await page.getByRole("button", { name: "Version history" }).click();
  const history = page.getByRole("dialog", { name: "Version history" });
  await expect(history.getByText("Before", { exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Restore this version" }).click();
  await expect(viewer.getByText("Before")).toBeVisible();

  await page.goto("/settings/privacy");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workspace backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const before = await request.get(fixture + "/api/v1/notes?pageSize=100", { headers });
  const beforeCount = (await before.json()).data.totalItems as number;
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles(path!);
  await expect(page.getByText(/Imported .* notes and .* labels/)).toBeVisible();
  const after = await request.get(fixture + "/api/v1/notes?pageSize=100", { headers });
  expect((await after.json()).data.totalItems).toBe(beforeCount * 2);
});

test("workspace backup waits for unsynced edits instead of silently exporting older content", async ({ page, request }) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Edit", exact: true }).click();
  let reject = true;
  await page.route("**/api/v1/notes/*", route => route.request().method() === "PATCH" && reject
    ? route.fulfill({ status: 503, json: { message: "Synthetic unavailable" } }) : route.continue());
  const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await editor.getByLabel("Note title", { exact: true }).fill("Pending backup content");
  await expect(editor.getByText("Saved on this device; waiting to sync", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/settings/privacy");
  await expect(page.getByText("Sync pending edits before downloading a workspace backup.", { exact: true })).toBeVisible();
  let exports = 0;
  page.on("request", r => { if (r.method() === "GET" && r.url().endsWith("/workspace/archive")) exports++; });
  await page.getByRole("button", { name: "Download workspace backup", exact: true }).click();
  expect(exports).toBe(0);
  reject = false;
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sync now", exact: true }).click();
  await expect(page.getByText("Notes synced", { exact: true })).toBeAttached();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workspace backup", exact: true }).click();
  const path = await (await downloaded).path();
  const { readFile } = await import("node:fs/promises");
  expect(await readFile(path!, "utf8")).toContain("Pending backup content");
  expect(exports).toBe(1);
});
