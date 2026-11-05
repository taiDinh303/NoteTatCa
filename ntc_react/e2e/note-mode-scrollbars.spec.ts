import { test, expect } from "@playwright/test";
type ScrollSample = { horizontal: boolean; vertical: boolean; width: number; scrollWidth: number; scrollHeight: number; clientHeight: number; layerWidth?: number; layerHeight?: number };

for (const width of [1440, 393]) {
  test(`short note has no transient document scrollbars during View Edit ${width}`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /ResizeObserver/.test(message.text())) errors.push(message.text()); });
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
    const samples: ScrollSample[] = [];
    for (const mode of ["Edit", "View", "Edit", "View"]) {
      await page.evaluate(() => {
        const state = window as unknown as { modeSamples: ScrollSample[]; modeDone: boolean };
        state.modeSamples = []; state.modeDone = false;
        document.addEventListener("click", () => {
          const start = performance.now();
          const sample = () => {
            const viewport = document.querySelector<HTMLElement>(".note-surface-ready:not([hidden]) [data-content-zoom]");
            if (viewport) state.modeSamples.push({ horizontal: viewport.scrollWidth > viewport.clientWidth + 1,
              vertical: viewport.scrollHeight > viewport.clientHeight + 1, width: viewport.clientWidth,
              scrollWidth: viewport.scrollWidth, scrollHeight: viewport.scrollHeight, clientHeight: viewport.clientHeight,
              layerWidth: viewport.querySelector<HTMLElement>(".content-zoom-layer")?.offsetWidth,
              layerHeight: viewport.querySelector<HTMLElement>(".content-zoom-layer")?.offsetHeight });
            if (performance.now() - start < 250) requestAnimationFrame(sample);
            else state.modeDone = true;
          };
          requestAnimationFrame(sample);
        }, { once: true, capture: true });
      });
      await page.getByRole("dialog", { name: mode === "Edit" ? "View note" : "Edit note", exact: true }).getByRole("button", { name: mode, exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { modeDone: boolean }).modeDone)).toBe(true);
      samples.push(...await page.evaluate(() => (window as unknown as { modeSamples: typeof samples }).modeSamples));
      if (mode === "Edit") {
        const toolbar = page.locator(".note-surface-ready .editor-toolbar");
        await expect(toolbar).toHaveCSS("scrollbar-width", "none");
        if (width < 800) {
          expect(await toolbar.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
          await toolbar.evaluate(el => { el.scrollLeft = el.scrollWidth; });
          expect(await toolbar.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        }
      }
    }
    expect(samples.length).toBeGreaterThan(8);
    expect(samples.filter(value => value.horizontal || value.vertical)).toEqual([]);
    expect(Math.max(...samples.map(value => value.width)) - Math.min(...samples.map(value => value.width))).toBeLessThan(1);
    expect(errors).toEqual([]);
  });
}
