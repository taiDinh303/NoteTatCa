import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 2.75 });

for (const width of [320, 393, 430, 800]) {
  test(`mobile document stays vertical while scrolling in View and Edit ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/guest");
    await page.getByRole("button", { name: "Take a note", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await dialog.getByLabel("Note title", { exact: true }).fill("Mobile vertical scroll");
    const text = Array.from({ length: 65 }, (_, index) =>
      `Line ${index + 1}: Vietnamese Tiếng Việt 日本語 😀 https://example.test/${"long-link".repeat(12)}`,
    ).join("\n");
    await dialog.getByRole("textbox", { name: "Note content", exact: true }).fill(text);
    await expect(dialog.getByText("Saved on this device", { exact: true })).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    for (const mode of ["View", "Edit", "View"]) {
      await dialog.getByRole("button", { name: mode, exact: true }).click();
      dialog = page.getByRole("dialog", { name: `${mode} note`, exact: true });
      const viewport = dialog.locator("[data-content-zoom]");
      await expect(dialog.getByRole("button", { name: "Content zoom", exact: true })).toHaveCount(0);
      // A vertical-only mobile document must not expose a horizontal rail even
      // when native overlay scrollbars become visible during a touch gesture.
      await expect(viewport).toHaveCSS("overflow-x", "hidden");
      await viewport.evaluate(el => { el.scrollTop = 200; el.scrollLeft = 40; });
      const before = await viewport.evaluate(el => el.scrollTop);
      const bounds = (await viewport.boundingBox())!;
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height - 40;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      for (let offset = 20; offset <= 160; offset += 20) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: x - offset / 4, y: y - offset, id: 1 }],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 50);
      const geometry = await viewport.evaluate(el => {
        const rich = el.querySelector<HTMLElement>(".rich-editor")!;
        return { left: el.scrollLeft, overflow: el.scrollWidth - el.clientWidth,
          textOverflow: rich.scrollWidth - rich.clientWidth, vertical: el.scrollHeight - el.clientHeight };
      });
      expect(geometry.left).toBe(0);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.textOverflow).toBeLessThanOrEqual(1);
      expect(geometry.vertical).toBeGreaterThan(1000);
      await page.screenshot({ path: info.outputPath(`scroll-${mode}-${width}.png`) });
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Open Mobile vertical scroll", exact: true }).click();
    await expect(page.getByRole("region", { name: "Note content", exact: true })).toHaveText(text, { useInnerText: true });
  });
}
