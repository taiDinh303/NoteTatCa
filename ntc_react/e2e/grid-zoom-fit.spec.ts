import { test, expect } from "@playwright/test";

for (const width of [1920, 1910]) {
  test(`grid balances both edges at 50 100 150 and keeps near-stop columns ${width}`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await request.post("http://127.0.0.1:5199/__fixture/seed-notes?count=24");
    await page.addInitScript(() => {
      localStorage.setItem("ntc.sidebar.hidden.v1", "false");
      localStorage.setItem("ntc.interface.zoom.v1", "100");
      localStorage.setItem("ntc.mascot.v1", "off:bunny");
      localStorage.setItem("ntc.theme.v1", "dark");
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const geometry = () => page.locator(".notes-zoom-layer").evaluate(element => {
      const layer = element as HTMLElement;
      const view = layer.closest(".notes-zoom-viewport")!;
      const grid = Array.from(layer.querySelectorAll(".note-grid")).at(-1)!;
      const boxes = Array.from(grid.querySelectorAll(".note-card")).map(card => card.getBoundingClientRect());
      const row = boxes.filter(box => Math.abs(box.top - boxes[0].top) < 2);
      const scale = parseFloat(layer.style.getPropertyValue("--notes-scale"));
      const right = Math.max(...row.map(box => box.right));
      const main = layer.closest(".main-column")!.getBoundingClientRect();
      return {
        columns: row.length,
        card: layer.style.getPropertyValue("--notes-card-width"),
        logicalWidth: (grid.querySelector(".note-card") as HTMLElement).offsetWidth,
        logicalHeight: (grid.querySelector(".note-card") as HTMLElement).offsetHeight,
        sidebar: layer.closest(".customer-shell")!.querySelector(".sidebar")!.getBoundingClientRect().width,
        overflow: right - (view.getBoundingClientRect().right - 12),
        remaining: view.getBoundingClientRect().right - 12 - right,
        pitch: boxes[0].width + 20 * scale,
        edgeDifference: Math.abs((boxes[0].left - main.left) - (main.right - right)),
      };
    });
    const baseline = await geometry();
    for (const percent of [99, 100, 101, 105, 50, 51, 52, 53, 100, 150]) {
      await page.getByRole("button", { name: "Account menu", exact: true }).click();
      const zoom = page.getByRole("spinbutton", { name: "Zoom percentage", exact: true });
      await zoom.fill(String(percent));
      await zoom.press("Enter");
      await page.keyboard.press("Escape");
      const expected = percent <= 53 ? 10 : percent === 150 ? 3 : 5;
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
      await expect.poll(async () => (await geometry()).overflow).toBeLessThanOrEqual(1);
      await expect.poll(async () => (await geometry()).edgeDifference).toBeLessThan(1.5);
      const current = await geometry();
      expect(current.remaining).toBeLessThan(current.pitch);
      expect(current.card).toBe(baseline.card);
      expect(current.logicalWidth).toBe(baseline.logicalWidth);
      expect(current.logicalHeight).toBe(baseline.logicalHeight);
      expect(current.sidebar).toBe(baseline.sidebar);
      if (width === 1920 && [50, 100, 150].includes(percent))
        await page.screenshot({ path: info.outputPath(`grid-${percent}-open.png`) });
      await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(percent <= 53 ? 12 : percent === 150 ? 4 : 6);
      await expect.poll(async () => (await geometry()).edgeDifference).toBeLessThan(1.5);
      expect((await geometry()).logicalWidth).toBe(baseline.logicalWidth);
      expect((await geometry()).logicalHeight).toBe(baseline.logicalHeight);
      if (width === 1920 && [50, 100, 150].includes(percent))
        await page.screenshot({ path: info.outputPath(`grid-${percent}-closed.png`) });
      await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
    }
  });
}
