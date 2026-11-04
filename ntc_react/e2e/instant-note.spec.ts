import { test, expect } from "@playwright/test";

for (const width of [1440, 393]) {
  test(`prepared note frame opens cached content without waiting for requests or editor downloads ${width}`, async ({ page, request }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await request.post("http://127.0.0.1:5199/__fixture/seed-notes?count=60");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const card = page.getByRole("button", { name: "Open An idea worth exploring", exact: true });
    await expect(card).toBeVisible();
    const shell = page.locator(".note-surface-ready");
    await expect(shell).toHaveCount(1);
    await expect(shell).toBeHidden();
    await shell.evaluate(el => { (window as unknown as { preparedFrame: Element }).preparedFrame = el; });
    await page.route("**/api/v1/notes/*", route => route.abort());
    const timings: number[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.evaluate(() => {
        const state = window as unknown as { firstNotePaint: number; noteStart: number };
        document.addEventListener("click", () => {
          state.noteStart = performance.now();
          const sample = () => {
            const frame = document.querySelector<HTMLElement>(".note-surface-ready");
            if (frame && !frame.hidden && frame.textContent?.includes("An idea worth exploring"))
              state.firstNotePaint = performance.now() - state.noteStart;
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, { once: true, capture: true });
        state.firstNotePaint = -1;
      });
      await card.click();
      const dialog = page.getByRole("dialog", { name: "View note", exact: true });
      await expect(dialog).toContainText("An idea worth exploring");
      await expect.poll(() => page.evaluate(() => (window as unknown as { firstNotePaint: number }).firstNotePaint)).toBeGreaterThanOrEqual(0);
      const timing = await shell.evaluate(el => {
        const state = window as unknown as { preparedFrame: Element; firstNotePaint: number; noteStart: number };
        return { same: el === state.preparedFrame, time: state.firstNotePaint,
          animation: getComputedStyle(el).animationName,
          downloads: performance.getEntriesByType("resource").filter(entry => entry.startTime >= state.noteStart && /\/(NoteEditor|RichEditor|NoteSurfaceHost|NoteTools|ReminderDialog)[^/]*\.(js|css)(\?|$)/.test(entry.name)).map(entry => entry.name) };
      });
      expect(timing.same).toBe(true);
      expect(timing.animation).toBe("none");
      expect(timing.downloads).toEqual([]);
      expect(timing.time).toBeLessThan(150);
      timings.push(timing.time);
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Escape");
      await expect(shell).toBeHidden();
      await expect(card).toBeFocused();
      expect(await page.locator(".note-surface-slot").textContent()).toBe("");
    }
    console.log(`Cached note ${width}px first/reopen paint: ${timings.map(value => value.toFixed(1)).join("/")}ms`);
    await info.attach("note-paint-ms", { body: JSON.stringify(timings), contentType: "application/json" });
  });
}
