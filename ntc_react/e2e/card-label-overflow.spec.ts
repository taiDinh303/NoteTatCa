import { test, expect } from "@playwright/test";

for (const width of [320, 393, 1440]) {
  test(`card labels share action row without overlap ${width}`, async ({ page, request }) => {
    const base = "http://127.0.0.1:5199";
    await request.post(base + "/__fixture/reset");
    const credentials = { email: "a@example.test", password: "Synthetic-password-123!" };
    const login = await request.post(base + "/api/v1/auth/login", { data: credentials });
    const { token } = (await login.json()).data;
    const headers = { Authorization: `Bearer ${token}` };
    const names = ["Short", "English", "Project planning and research", "Design", "Work", "Ideas", "W".repeat(50)];
    const ids: string[] = [];
    for (const name of names) {
      const response = await request.post(base + "/api/v1/tags", { headers, data: { name, color: "#326348" } });
      expect(response.ok()).toBeTruthy();
      ids.push((await response.json()).data.id);
    }
    for (const [title, tagIds] of [["Many labels", ids], ["Long label", ids.slice(-1)], ["No labels", []]] as const) {
      const response = await request.post(base + "/api/v1/notes", {
        headers, data: { title, content: "Content above a compact footer", tagIds },
      });
      expect(response.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(credentials.email);
    await page.getByLabel("Password", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const card = page.getByRole("article").filter({ has: page.getByRole("button", { name: "Open Many labels", exact: true }) });
    await expect(card).toBeVisible();
    let gridCount = 0;
    for (const view of ["grid", "list", "grid"]) {
      await page.getByRole("button", { name: `${view} view`, exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const labels = card.locator(".card-labels");
      await expect.poll(async () => labels.locator(":scope > .label-chip").count()).toBeGreaterThan(0);
      const visible = labels.locator(":scope > .label-chip:not(.label-overflow)");
      const counter = labels.locator(":scope > .label-overflow > [aria-hidden]");
      await expect.poll(async () => (await visible.count()) + (await counter.count() ? Number((await counter.textContent())!.slice(1)) : 0)).toBe(names.length);
      const count = await visible.count();
      if (view === "grid") {
        if (gridCount) expect(count).toBe(gridCount);
        gridCount = count;
      } else if (width === 1440) expect(count).toBeGreaterThan(gridCount);
      const chips = await labels.locator(":scope > .label-chip").all();
      const menu = card.getByRole("button", { name: "Actions for Many labels", exact: true });
      const actionBox = (await menu.boundingBox())!;
      for (const chip of chips) {
        const box = (await chip.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(actionBox.x - 7);
        expect(Math.abs(box.y + box.height / 2 - actionBox.y - actionBox.height / 2)).toBeLessThan(2);
      }
      const long = page.getByRole("article").filter({ has: page.getByRole("button", { name: "Open Long label", exact: true }) });
      if (width < 800) await expect(long.locator(".label-overflow > [aria-hidden]")).toHaveText("+1");
      const empty = page.getByRole("article").filter({ has: page.getByRole("button", { name: "Open No labels", exact: true }) });
      await expect(empty.locator(".card-labels")).toHaveCount(0);
      await expect(empty.getByRole("button", { name: "Actions for No labels", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await card.screenshot({ path: `test-results/card-labels-${width}-${view}.png` });
      await menu.click();
      await expect(page.getByRole("menuitem", { name: "Add label", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
}
