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
      const during = [
        card.offsetWidth,
        card.offsetHeight,
        card.offsetTop,
        card.offsetLeft,
      ];
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        samples,
        longest,
        layout,
        during,
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
    expect(result.during).toEqual(result.layout);
    expect(
      Math.abs(result.width - result.after[0] * result.scale),
    ).toBeLessThan(result.scale);
    expect(
      await list.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
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

for (const width of [393, 1920]) {
  test(`grid fills the available width and List stays fitted at every zoom ${width}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    for (let i = 0; i < 8; i++) {
      await page
        .getByRole("button", { name: "Take a note", exact: true })
        .click();
      const editor = page.getByRole("dialog", {
        name: "New note",
        exact: true,
      });
      await editor
        .getByLabel("Note title", { exact: true })
        .fill(`Fit example ${i}`);
      await editor
        .getByRole("textbox", { name: "Note content" })
        .fill("A short synthetic note to check the layout.");
      await expect(
        editor.getByText("Saved on this device", { exact: true }),
      ).toBeVisible();
      await editor.getByRole("button", { name: "Close", exact: true }).click();
    }
    const order = await page
      .locator(".note-card")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-testid")),
      );
    const columns: number[] = [];
    for (const mode of ["grid", "list"]) {
      for (const percent of [50, 100, 150]) {
        await page.evaluate(
          ({ percent, mode }) => {
            localStorage.setItem("ntc.interface.zoom.v1", String(percent));
            localStorage.setItem("ntc.view.v1", mode);
          },
          { percent, mode },
        );
        await page.reload();
        const list = page.locator("[data-notes-zoom]");
        await expect(page.locator(".note-card")).toHaveCount(order.length);
        await expect
          .poll(() =>
            list.evaluate(
              (el) =>
                new DOMMatrix(
                  getComputedStyle(el.querySelector(".notes-zoom-layer")!)
                    .transform,
                ).a,
            ),
          )
          .toBe(percent / 100);
        const layout = await list.evaluate((el) => {
          const groups = Array.from(el.querySelectorAll(".note-grid"));
          const cards = groups.at(-1)!.querySelectorAll(".note-card");
          const rects = Array.from(cards).map((node) =>
            node.getBoundingClientRect(),
          );
          const grid = groups.at(-1)!.getBoundingClientRect();
          const firstRow = rects.filter(
            (rect) => Math.abs(rect.top - rects[0].top) < 1,
          );
          return {
            overflow: el.scrollWidth - el.clientWidth,
            columns: firstRow.length,
            rightGap: grid.right - firstRow.at(-1)!.right,
            widths: Array.from(el.querySelectorAll(".note-card")).map(
              (node) => node.getBoundingClientRect().width,
            ),
            gridWidth: grid.width,
            available: el.clientWidth,
          };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.gridWidth).toBeCloseTo(layout.available, 0);
        expect(layout.rightGap).toBeLessThan(1);
        expect(
          Math.max(...layout.widths) - Math.min(...layout.widths),
        ).toBeLessThan(1);
        if (mode === "list") {
          expect(layout.columns).toBe(1);
          expect(layout.widths[0]).toBeCloseTo(layout.available, 0);
        } else columns.push(layout.columns);
        expect(
          await page
            .locator(".note-card")
            .evaluateAll((nodes) =>
              nodes.map((node) => node.getAttribute("data-testid")),
            ),
        ).toEqual(order);
        await page.screenshot({
          path: `test-results/notes-fit-${width}-${mode}-${percent}.png`,
        });
      }
    }
    console.log(`Grid ${width}, 50/100/150%: ${columns.join("/")} columns`);
    if (width === 1920) {
      expect(columns[0]).toBeGreaterThanOrEqual(8);
      expect(columns[1]).toBe(4);
      expect(columns[2]).toBe(3);
    } else expect(columns).toEqual([2, 1, 1]);
    // Changing view mode at a saved 150% also fits immediately without a reload.
    await page.getByRole("button", { name: "grid view", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator("[data-notes-zoom]")
          .evaluate((el) => el.scrollWidth - el.clientWidth),
      )
      .toBeLessThanOrEqual(1);
  });
}
