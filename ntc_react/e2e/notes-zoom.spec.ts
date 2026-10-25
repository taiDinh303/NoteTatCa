import { test, expect } from "@playwright/test";

for (const width of [393, 1440]) {
  test(`list zoom is continuous and leaves chrome fixed ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await dialog
      .getByLabel("Note title", { exact: true })
      .fill("List zoom regression");
    await dialog
      .getByRole("textbox", { name: "Note content" })
      .fill("Original content remains unchanged.\n".repeat(30));
    await expect(
      dialog.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const list = page.locator("[data-notes-zoom]");
    await expect(list).toBeVisible();
    const chrome = () =>
      page.locator("header, aside, .workspace-toolbar").evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        }),
      );
    const before = await chrome();
    let requests = 0;
    page.on("request", () => requests++);
    const result = await list.evaluate(async (el) => {
      const layer = el.querySelector<HTMLElement>(".notes-zoom-layer")!;
      const card = el.querySelector<HTMLElement>("article")!;
      const layout = [
        card.offsetWidth,
        card.offsetHeight,
        card.offsetTop,
        card.offsetLeft,
      ];
      const samples: number[] = [];
      const start = performance.now();
      let previous = start;
      let longest = 0;
      function sample(time: number) {
        longest = Math.max(longest, time - previous);
        previous = time;
        samples.push(new DOMMatrix(getComputedStyle(layer).transform).a);
        if (time - start < 900) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      for (let i = 0; i < 12; i++) {
        el.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            deltaY: -12,
            clientX: 150,
            clientY: 350,
          }),
        );
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        samples,
        longest,
        layout,
        after: [
          card.offsetWidth,
          card.offsetHeight,
          card.offsetTop,
          card.offsetLeft,
        ],
        width: card.getBoundingClientRect().width,
        scale: new DOMMatrix(getComputedStyle(layer).transform).a,
      };
    });
    expect(result.scale).toBeCloseTo(Math.exp(144 * 0.0012), 3);
    expect(
      new Set(result.samples.map((n) => n.toFixed(4))).size,
    ).toBeGreaterThan(15);
    for (let i = 1; i < result.samples.length; i++) {
      expect(result.samples[i] - result.samples[i - 1]).toBeGreaterThanOrEqual(
        -0.00001,
      );
      expect(result.samples[i] - result.samples[i - 1]).toBeLessThan(0.04);
    }
    expect(result.after).toEqual(result.layout);
    expect(result.width).toBeCloseTo(result.layout[0] * result.scale, 0);
    expect(await chrome()).toEqual(before);
    expect(requests).toBe(0);
    console.log(
      `Zoom ${width}: ${new Set(result.samples).size} intermediate frames; longest sampled interval ${result.longest.toFixed(1)}ms`,
    );
    await page.screenshot({
      path: `test-results/notes-zoom-${width}.png`,
      fullPage: true,
    });
    // Reverse direction; a coarse wheel event must still animate instead of jumping.
    await list.evaluate((el) =>
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 10000,
        }),
      ),
    );
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
      )
      .toBe("108");
    expect(await chrome()).toEqual(before);
    await page
      .getByRole("button", { name: "Open List zoom regression", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "View note", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Note content", exact: true }),
    ).toContainText("Original content remains unchanged.");
  });
}
