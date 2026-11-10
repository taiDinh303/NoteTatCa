import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(email.startsWith("admin") ? /\/admin\/overview$/ : /\/notes$/);
}
for (const width of [1440, 320]) {
  test(`announcement draft publish lost ACK read and revoke at ${width}`, async ({ page, request, browser }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await login(page, "admin@example.test");
    await expect(page.getByRole("heading", { name: "System overview", exact: true })).toBeVisible();
    if (width <= 800) await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await page.getByRole("link", { name: "System announcements", exact: true }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "New announcement", exact: true }).click();
    const title = `Maintenance notice ${width}`;
    await page.getByLabel("Announcement title", { exact: true }).fill(title);
    await page.getByLabel("Announcement message", { exact: true }).fill('<img src=x onerror="window.badAnnouncement=true">\nScheduled maintenance.');
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview and send", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "Send announcement?", exact: true });
    await expect(preview).toContainText("Recipients: 2");
    await expect(preview.locator("img")).toHaveCount(0);
    await preview.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Preview and send", exact: true }).click();
    let sends = 0; const ids: string[] = [];
    await page.route("**/api/v1/admin/announcements/*/publish", async route => {
      ids.push(route.request().postDataJSON().requestId);
      const response = await route.fetch(); sends++;
      if (sends === 1) await route.fulfill({ status: 503, json: { message: "Synthetic lost acknowledgement" } });
      else await route.fulfill({ response });
    });
    await preview.getByRole("button", { name: "Send announcement", exact: true }).click();
    await expect(preview.getByText("Synthetic lost acknowledgement", { exact: true })).toBeVisible();
    await preview.getByRole("button", { name: "Send announcement", exact: true }).click();
    await expect(preview).toBeHidden();
    expect(sends).toBe(2); expect(ids[0]).toBe(ids[1]);
    await expect(page.getByLabel("Announcement title", { exact: true })).toBeDisabled();
    const user = await browser.newContext({ baseURL: "http://127.0.0.1:5173", viewport: { width, height: 900 } });
    try {
      const customer = await user.newPage(); await login(customer, "a@example.test");
      await expect(customer.locator(".note-card").first()).toBeVisible();
      await customer.goto("/notifications");
      const message = customer.locator(".inbox-announcement");
      await expect(message).toHaveCount(1); await expect(message).toContainText(title);
      await expect(message.locator("img")).toHaveCount(0);
      await expect(message.getByText('Scheduled maintenance.', { exact: false })).toBeVisible();
      await expect(customer.getByText("· Open your note", { exact: false })).toHaveCount(0);
      expect(await customer.evaluate(() => (window as Window & { badAnnouncement?: boolean }).badAnnouncement)).toBeUndefined();
      await message.getByRole("button", { name: "Mark announcement as read", exact: true }).click();
      await expect(message.getByText("Read", { exact: true })).toBeVisible();
      await customer.getByRole("button", { name: "Unread", exact: true }).click();
      await expect(customer.locator(".inbox-announcement")).toHaveCount(0);
      await page.getByRole("button", { name: "Revoke announcement", exact: true }).click();
      const revoke = page.getByRole("dialog", { name: "Revoke announcement?", exact: true });
      await revoke.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "Revoke announcement", exact: true }).click();
      await revoke.getByRole("button", { name: "Revoke announcement", exact: true }).click();
      await expect(revoke).toBeHidden();
      await customer.reload();
      await expect(customer.getByText("You’re all caught up", { exact: true })).toBeVisible();
      await expect(customer.locator(".inbox-announcement")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      await page.screenshot({ path: `../artifacts/announcements-admin-${width}.png`, fullPage: true });
    } finally { await user.close(); }
  });
}

test("selected recipients exclude admin and unsaved draft survives navigation cancellation", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await login(page, "admin@example.test");
  await expect(page.getByRole("heading", { name: "System overview", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "System announcements", exact: true }).click();
  await page.getByRole("button", { name: "New announcement", exact: true }).click();
  await page.getByLabel("Announcement title", { exact: true }).fill("Selected audience");
  await page.getByLabel("Announcement message", { exact: true }).fill("Private administration notice");
  await page.getByLabel("Recipients", { exact: true }).selectOption("selected");
  await expect(page.getByRole("checkbox", { name: "admin@example.test", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "a@example.test", exact: true }).check();
  await page.getByRole("link", { name: "Audit trail", exact: true }).click();
  const guard = page.getByRole("dialog", { name: "Keep your changes?", exact: true });
  await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Announcement title", { exact: true })).toHaveValue("Selected audience");
  await page.route("**/api/v1/admin/announcements", async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: 500, json: { message: "Synthetic draft failure" } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Synthetic draft failure", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Announcement title", { exact: true })).toHaveValue("Selected audience");
  await expect(page.getByRole("checkbox", { name: "a@example.test", exact: true })).toBeChecked();
  await page.unroute("**/api/v1/admin/announcements");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview and send", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Send announcement?", exact: true })).toContainText("Recipients: 1");
});
