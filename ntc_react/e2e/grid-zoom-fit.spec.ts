import { test, expect } from "@playwright/test";

for (const width of [1920, 1910]) {
  test(`grid fixes card width and gap through zoom and sidebar changes ${width}`, async ({ page, request }, info) => {
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
      return {
        columns: row.length,
        card: layer.style.getPropertyValue("--notes-card-width"),
        logicalWidth: (grid.querySelector(".note-card") as HTMLElement).offsetWidth,
        logicalHeight: (grid.querySelector(".note-card") as HTMLElement).offsetHeight,
        sidebar: layer.closest(".customer-shell")!.querySelector(".sidebar")!.getBoundingClientRect().width,
        overflow: right - (view.getBoundingClientRect().right - 12),
        remaining: view.getBoundingClientRect().right - 12 - right,
        pitch: boxes[0].width + 20 * scale,
        leftAnchor: boxes[0].left - document.querySelector('[aria-label="Take a note"]')!.getBoundingClientRect().left,
        gaps: row.slice(1).map((box, index) => (box.left - row[index].right) / scale),
      };
    });
    const baseline = await geometry();
    for (const percent of [50, 100, 150, 100]) {
      await page.getByRole("button", { name: "Account menu", exact: true }).click();
      const zoom = page.getByRole("spinbutton", { name: "Zoom percentage", exact: true });
      await zoom.fill(String(percent));
      await zoom.press("Enter");
      await page.keyboard.press("Escape");
      const expected = percent === 50 ? 10 : percent === 150 ? 3 : 5;
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
      await expect.poll(async () => (await geometry()).overflow).toBeLessThanOrEqual(1);
      await expect.poll(() => page.locator(".notes-zoom-layer").evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.id === "notes-reflow").length)).toBe(0);
      const current = await geometry();
      expect(Math.abs(current.leftAnchor)).toBeLessThan(1);
      for (const gap of current.gaps) expect(gap).toBeCloseTo(20, 1);
      expect(current.remaining).toBeLessThan(current.pitch);
      const normalRemainder = current.remaining - 38;
      expect(Math.abs(normalRemainder)).toBeLessThan(percent === 150 ? 170 : 25);
      console.log(`${width}px ${percent}% sidebar open: right remainder ${normalRemainder.toFixed(1)}px`);
      expect(current.card).toBe(baseline.card);
      expect(current.logicalWidth).toBe(baseline.logicalWidth);
      expect(current.logicalHeight).toBe(baseline.logicalHeight);
      expect(current.sidebar).toBe(baseline.sidebar);
      if (width === 1920 && [50, 100, 150].includes(percent))
        await page.screenshot({ path: info.outputPath(`grid-${percent}-open.png`) });
      await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(percent === 50 ? 12 : percent === 150 ? 4 : 6);
      await expect.poll(() => page.locator(".notes-zoom-layer").evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.id === "notes-reflow").length)).toBe(0);
      const hidden = await geometry();
      expect(Math.abs(hidden.remaining - 38)).toBeLessThan(25);
      expect(Math.abs(hidden.leftAnchor)).toBeLessThan(1);
      for (const gap of hidden.gaps) expect(gap).toBeCloseTo(20, 1);
      expect((await geometry()).logicalWidth).toBe(baseline.logicalWidth);
      expect((await geometry()).logicalHeight).toBe(baseline.logicalHeight);
      if (width === 1920 && [50, 100, 150].includes(percent))
        await page.screenshot({ path: info.outputPath(`grid-${percent}-closed.png`) });
      await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      await expect.poll(async () => (await geometry()).columns).toBe(expected);
    }
  });
}
