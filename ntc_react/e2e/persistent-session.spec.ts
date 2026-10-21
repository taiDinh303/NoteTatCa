import { test, expect } from "@playwright/test";
test("keeps sign-in after closing tabs and serializes shared token rotation", async ({
  browser,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  const context = await browser.newContext();
  const first = await context.newPage();
  await first.goto("http://127.0.0.1:5173/login");
  await first
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await first
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await first.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(first).toHaveURL(/\/notes/);
  const saved = await first.evaluate(() =>
    JSON.parse(localStorage.getItem("ntc.session.v1")!),
  );
  expect(saved.refreshToken).toBeTruthy();
  expect(saved.token).toBeUndefined();
  const state = await context.storageState();
  await context.close();
  const restored = await browser.newContext({ storageState: state });
  const a = await restored.newPage();
  const b = await restored.newPage();
  await Promise.all([
    a.goto("http://127.0.0.1:5173/notes"),
    b.goto("http://127.0.0.1:5173/notes"),
  ]);
  for (const page of [a, b])
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
  await Promise.all([a.reload(), b.reload()]);
  for (const page of [a, b])
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
  await a.getByRole("button", { name: "Account menu", exact: true }).click();
  await a.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(a).toHaveURL(/\/login/);
  await expect(b).toHaveURL(/\/login/);
  expect(
    await b.evaluate(() => localStorage.getItem("ntc.session.v1")),
  ).toBeNull();
  await restored.close();
});
