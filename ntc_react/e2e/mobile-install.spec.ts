import { test, expect } from "@playwright/test";

for (const width of [320, 393, 430, 1440]) {
  test(`pin filter stays inside viewport and filters notes ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/guest");
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(3);
    const trigger = page.getByRole("button", { name: "Filter pinned notes", exact: true });
    for (const [name, count] of [["Pinned only", 1], ["Unpinned only", 2], ["All notes", 3]] as const) {
      await trigger.click();
      const menu = page.getByRole("listbox", { name: "Filter pinned notes" });
      await expect(menu).toBeVisible();
      for (const item of [menu, ...await menu.getByRole("option").all()]) {
        const bounds = await item.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      if (name === "Pinned only") await page.screenshot({ path: info.outputPath(`filter-${width}.png`) });
      await menu.getByRole("option", { name, exact: true }).click();
      await expect(menu).toBeHidden();
      await expect(cards).toHaveCount(count);
      await expect(trigger).toBeFocused();
    }
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await trigger.click();
    await page.mouse.click(2, 2);
    await expect(page.getByRole("listbox")).toBeHidden();
  });
}

test("install metadata and icon assets are available from nested routes", async ({ page, request }) => {
  await page.goto("/login");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const response = await request.get(href!);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("manifest+json");
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", start_url: "/notes", scope: "/", display: "standalone" });
  for (const icon of [...manifest.icons, { src: "/icons/apple-touch-icon.png", sizes: "180x180" }]) {
    const response = await request.get(icon.src);
    expect(response.headers()["content-type"]).toContain("image/png");
    const bytes = await response.body();
    const [width, height] = icon.sizes.split("x").map(Number);
    expect(bytes.readUInt32BE(16)).toBe(width);
    expect(bytes.readUInt32BE(20)).toBe(height);
  }
});
