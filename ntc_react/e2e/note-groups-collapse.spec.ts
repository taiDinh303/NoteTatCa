import { expect, test } from "@playwright/test";

for (const width of [393, 1440]) {
  test(`note groups collapse independently and keep visible sorting at ${width}px`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const pinned = page.locator('[data-note-group="pinned"]');
    const normal = page.locator('[data-note-group="normal"]');
    await expect(pinned.locator(".note-card")).toHaveCount(2);
    await expect(normal.locator(".note-card")).toHaveCount(4);
    const pinToggle = pinned.getByRole("button", { name: "Collapse Pinned", exact: true });
    const normalToggle = normal.locator(".note-group-toggle");
    let writes = 0;
    const record = (request: import("@playwright/test").Request) => {
      if (request.url().includes("/api/v1/notes") && request.method() !== "GET") writes++;
    };
    page.on("request", record);
    await pinToggle.click();
    await expect(pinned.locator(".note-group-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(pinned.locator("h2")).toContainText("2");
    await expect(pinned.locator(".note-card")).toHaveCount(0);
    await expect(normal.locator(".note-card")).toHaveCount(4);
    await normalToggle.focus();
    await page.keyboard.press("Enter");
    await expect(normalToggle).toHaveAttribute("aria-expanded", "false");
    await expect(normal.locator("h2")).toContainText("4");
    await expect(page.locator(".note-card")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("both-collapsed.png") });
    await page.reload();
    await expect(page.locator(".note-card")).toHaveCount(0);
    await expect(normalToggle).toHaveAttribute("aria-expanded", "false");
    await normalToggle.click();
    await expect(normal.locator(".note-card")).toHaveCount(4);
    await expect(pinned.locator(".note-card")).toHaveCount(0);
    expect(writes).toBe(0);
    page.off("request", record);

    // Hidden pinned items must not offset indices in the visible sortable group.
    const first = await normal.locator("h3").first().innerText();
    await normal.locator(".drag-handle").first().focus();
    await page.keyboard.press("Space");
    await expect(normal.locator(".note-card.dragging")).toHaveCount(1);
    // Let sortable measure the freshly mounted group before arrow navigation.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.keyboard.press(width < 800 ? "ArrowDown" : "ArrowRight");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    await page.keyboard.press("Space");
    await expect(normal.locator(".note-card.dragging")).toHaveCount(0);
    await expect.poll(() => normal.locator("h3").first().innerText()).not.toBe(first);
    await expect(pinned.locator(".note-card")).toHaveCount(0);
    await pinned.locator(".note-group-toggle").click();
    await expect(pinned.locator(".note-card")).toHaveCount(2);
    await expect(normal.locator(".note-card")).toHaveCount(4);
    await page.screenshot({ path: info.outputPath("expanded.png") });
  });
}

test("a collapsed normal group remains reopenable when no notes are pinned", async ({ page }) => {
  await page.goto("/Home");
  await page.getByRole("main").getByRole("link", { name: "Try guest mode", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(3);
  const pinned = page.locator('[data-note-group="pinned"]');
  const normal = page.locator('[data-note-group="normal"]');
  while (await pinned.count()) await pinned.getByRole("button", { name: /^Unpin / }).first().click();
  await expect(pinned).toHaveCount(0);
  const toggle = normal.getByRole("button", { name: "Collapse All notes", exact: true });
  await toggle.click();
  await expect(normal.locator(".note-card")).toHaveCount(0);
  await expect(normal.locator("h2")).toContainText("3");
  await normal.locator(".note-group-toggle").click();
  await expect(normal.locator(".note-card")).toHaveCount(3);
});
