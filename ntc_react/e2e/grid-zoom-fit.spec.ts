import { test, expect } from "@playwright/test";

for (const width of [1920, 1910]) {
  test(`grid keeps five columns near 100 and ten at 50 to 53 with sidebar ${width}`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await request.post("http://127.0.0.1:5199/__fixture/seed-notes?count=24");
    await page.addInitScript(() => {
      localStorage.setItem("ntc.sidebar.hidden.v1", "false");
      localStorage.setItem("ntc.interface.zoom.v1", "100");
      localStorage.setItem("ntc.mascot.v1", "off:bunny");
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    const geometry = () => page.locator(".notes-zoom-layer").evaluate(element => {
      const layer = element as HTMLElement;
      const view = layer.closest(".notes-zoom-viewport")!;
      const grid = Array.from(layer.querySelectorAll(".note-grid")).at(-1)!;
      const boxes = Array.from(grid.querySelectorAll(".note-card")).map(card => card.getBoundingClientRect());
      const row = boxes.filter(box => Math.abs(box.top - boxes[0].top) < 2);
      const scale = parseFloat(layer.style.getPropertyValue("--notes-scale"));
      const right = Math.max(...row.map(box => box.right));
      return {
        columns: row.length,
        card: layer.style.getPropertyValue("--notes-card-width"),
        sidebar: layer.closest(".customer-shell")!.querySelector(".sidebar")!.getBoundingClientRect().width,
        overflow: right - (view.getBoundingClientRect().right - 12),
        remaining: view.getBoundingClientRect().right - 12 - right,
        pitch: boxes[0].width + 20 * scale,
      };
    });
    const baseline = await geometry();
    for (const percent of [99, 100, 101, 105, 50, 51, 52, 53, 100]) {
      await page.getByRole("button", { name: "Account menu", exact: true }).click();
      const zoom = page.getByRole("spinbutton", { name: "Zoom percentage", exact: true });
      await zoom.fill(String(percent));
      await zoom.press("Enter");
      await page.keyboard.press("Escape");
      const expected = percent <= 53 ? 10 : 5;
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
      await expect.poll(async () => (await geometry()).overflow).toBeLessThanOrEqual(1);
      const current = await geometry();
      expect(current.remaining).toBeLessThan(current.pitch);
      expect(current.card).toBe(baseline.card);
      expect(current.sidebar).toBe(baseline.sidebar);
      if (width === 1920 && [50, 105].includes(percent))
        await page.screenshot({ path: info.outputPath(`grid-${percent}.png`) });
      await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(percent <= 53 ? 12 : 6);
      await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
    }
  });
}
