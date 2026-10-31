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
