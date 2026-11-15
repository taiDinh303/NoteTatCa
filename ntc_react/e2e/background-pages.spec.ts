import { test, expect } from "@playwright/test";

test("notes win priority; secondary pages deduplicate and hidden cache stays behind lock", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  let releaseStatus!: () => void;
  const statusGate = new Promise<void>(r => { releaseStatus = r; });
  let statusCalls = 0, sessionsCalls = 0, holdList = false;
  let releaseList!: () => void;
  const listGate = new Promise<void>(r => { releaseList = r; });
  page.on("request", r => { if (r.url().includes("/me/sessions")) sessionsCalls++; });
  await page.route("**/api/v1/hidden-notes/status", async route => { statusCalls++; await statusGate; await route.continue(); });
  await page.route("**/api/v1/hidden-notes?**", async route => { if (holdList) await listGate; await route.continue(); });
  try {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await expect.poll(() => statusCalls).toBe(1);
    await expect.poll(() => sessionsCalls).toBe(1);
    await page.getByRole("button", {name:"Account menu",exact:true}).click();
    await page.getByRole("menuitem", {name:"Hidden notes",exact:true}).click();
    await expect(page.locator(".vault-lock-form")).toHaveCount(0);
    expect(statusCalls).toBe(1);
    releaseStatus();
    await page.getByLabel("Six-digit PIN", {exact:true}).fill("123456");
    await page.getByRole("button", {name:"Continue",exact:true}).click();
    await page.getByLabel("Six-digit PIN", {exact:true}).fill("123456");
    await page.getByRole("button", {name:"Confirm lock",exact:true}).click();
    await page.getByRole("button", {name:"New hidden note",exact:true}).click();
    await page.getByRole("button", {name:"Close",exact:true}).click();
    await expect(page.locator(".vault-page .note-card")).toHaveCount(1);
    await page.getByRole("link", {name:"All notes",exact:true}).click();
    holdList = true;
    await page.getByRole("button", {name:"Account menu",exact:true}).click();
    await page.getByRole("menuitem", {name:"Hidden notes",exact:true}).click();
    await expect(page.locator(".vault-page .note-card")).toHaveCount(1);
    expect(statusCalls).toBe(1);
    releaseList();
    await page.getByRole("button", {name:"Lock now",exact:true}).click();
    await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
    await expect(page.getByLabel("Six-digit PIN", {exact:true})).toBeVisible();
  } finally { releaseStatus(); releaseList(); }
});
