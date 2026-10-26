import { test, expect } from "@playwright/test";

// Headless Chromium otherwise hides native scrollbars, including their hit area.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const mode of ["grid", "list"]) {
  test(`sidebar slides quickly through frames without restarting ${mode} cards`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(
      (mode) => localStorage.setItem("ntc.view.v1", mode),
      mode,
    );
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const samples = page.evaluate(
      () =>
        new Promise<
          {
            x: number;
            offset: number;
            width: number;
            gap: number;
            running: number;
            measured: number;
          }[]
        >((resolve) => {
          const frames: {
            x: number;
            offset: number;
            width: number;
            gap: number;
            running: number;
            measured: number;
          }[] = [];
          const start = performance.now();
          const readBox = Element.prototype.getBoundingClientRect;
          let measured = 0;
          Element.prototype.getBoundingClientRect = function () {
            if (this.matches(".note-card")) measured++;
            return readBox.call(this);
          };
          function sample() {
            const main = document
              .querySelector(".main-column")!
              .getBoundingClientRect();
            const card = document.querySelector<HTMLElement>(".note-card")!;
            frames.push({
              measured,
              x: main.x,
              offset: readBox.call(card).x - main.x,
              width: card.offsetWidth,
              gap: parseFloat(
                getComputedStyle(document.querySelector(".note-grid")!)
                  .columnGap,
              ),
              running: card
                .getAnimations()
                .filter((a) => a.id === "notes-reflow").length,
            });
            if (performance.now() - start < 700) requestAnimationFrame(sample);
            else {
              Element.prototype.getBoundingClientRect = readBox;
              resolve(frames);
            }
          }
          requestAnimationFrame(sample);
        }),
    );
    for (const name of [
      "Hide sidebar",
      "Show sidebar",
      "Hide sidebar",
      "Show sidebar",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.waitForTimeout(40);
    }
    const frames = await samples;
    expect(new Set(frames.map((f) => Math.round(f.x))).size).toBeGreaterThan(4);
    expect(
      Math.max(...frames.map((f) => f.offset)) -
        Math.min(...frames.map((f) => f.offset)),
    ).toBeLessThan(1);
    expect(
      frames.every(
        (f) =>
          (mode === "list" || f.width === 320) &&
          f.gap === 20 &&
          f.running === 0 &&
          f.measured === 0,
      ),
    ).toBe(true);
    await expect(page.locator("#workspace-navigation")).toHaveCSS(
      "transition-duration",
      "0.16s",
    );
    await expect
      .poll(() =>
        page
          .locator("#workspace-navigation")
          .evaluate((el) => el.getBoundingClientRect().x),
      )
      .toBe(0);
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`note reflow animates geometry frame by frame ${reducedMotion}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    // With fixed tracks, cards already occupying the first slots need not move.
    // Add enough notes to actually wrap when the grid changes from 4 to 3 columns.
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole("button", { name: "Take a note", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "New note",
        exact: true,
      });
      await dialog
        .getByLabel("Note title", { exact: true })
        .fill(`Reflow slot ${i}`);
      await dialog
        .getByRole("textbox", { name: "Note content" })
        .fill("Keep the fixed card and gap while wrapping.");
      await expect(
        dialog.getByText("Saved on this device", { exact: true }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
    }
    const list = page.locator("[data-notes-zoom]");
    await expect(list).toBeVisible();
    const result = await list.evaluate(async (el) => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".note-card"));
      const frames: { x: number; y: number; width: number }[][] = [];
      const start = performance.now();
      let firstMotion = -1;
      let lastInput = 0;
      let maxTextScaleError = 0;
      let maxLogicalWidthError = 0;
      function sample(time: number) {
        if (
          cards.some((card) =>
            card
              .getAnimations()
              .some((animation) => animation.id === "notes-reflow"),
          )
        ) {
          if (firstMotion < 0) firstMotion = time - start;
          frames.push(
            cards.map((card) => {
              const rect = card.getBoundingClientRect();
              maxLogicalWidthError = Math.max(
                maxLogicalWidthError,
                Math.abs(card.offsetWidth - 320),
              );
              const transform = new DOMMatrix(getComputedStyle(card).transform);
              maxTextScaleError = Math.max(
                maxTextScaleError,
                Math.abs(transform.a - 1),
                Math.abs(transform.d - 1),
              );
              return { x: rect.x, y: rect.y, width: rect.width };
            }),
          );
        }
        if (time - start < 1800) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      for (let i = 0; i < 8; i++) {
        lastInput = performance.now() - start;
        el.dispatchEvent(
          new WheelEvent("wheel", {
            ctrlKey: true,
            cancelable: true,
            bubbles: true,
            deltaY: -80,
          }),
        );
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      await new Promise((resolve) => setTimeout(resolve, 1900));
      const rail = document.querySelector<HTMLElement>(
        ".notes-window-scrollbar",
      )!;
      return {
        frames,
        firstMotion,
        lastInput,
        maxTextScaleError,
        maxLogicalWidthError,
        columns: getComputedStyle(
          el.querySelector(".note-grid")!,
        ).gridTemplateColumns.split(" ").length,
        running: cards
          .flatMap((card) => card.getAnimations())
          .filter((animation) => animation.id === "notes-reflow").length,
        scrollOverflow: el.scrollWidth - el.clientWidth,
        railRange: rail.scrollHeight - rail.clientHeight,
        noteRange: el.scrollHeight - el.clientHeight,
      };
    });
    expect(result.columns).toBe(3);
    expect(result.running).toBe(0);
    expect(result.scrollOverflow).toBeLessThanOrEqual(1);
    expect(Math.abs(result.railRange - result.noteRange)).toBeLessThanOrEqual(
      1,
    );
    if (reducedMotion === "reduce") {
      expect(result.frames).toHaveLength(0);
    } else {
      expect(result.frames.length).toBeGreaterThan(5);
      expect(result.firstMotion).toBeLessThan(result.lastInput);
      expect(result.maxTextScaleError).toBeLessThan(0.001);
      expect(result.maxLogicalWidthError).toBeLessThan(1);
      const widths = result.frames.map((frame) => frame[0].width);
      expect(
        new Set(widths.map((value) => value.toFixed(1))).size,
      ).toBeGreaterThan(5);
      expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(20);
      expect(
        result.frames.some(
          (frame, index) =>
            index > 0 &&
            frame.some(
              (rect, i) =>
                Math.hypot(
                  rect.x - result.frames[0][i].x,
                  rect.y - result.frames[0][i].y,
                ) > 10,
            ),
        ),
      ).toBe(true);
      console.log(
        `Reflow: ${result.frames.length} frames; width ${widths[0].toFixed(1)}→${widths.at(-1)!.toFixed(1)}px`,
      );
    }
  });
}

for (const width of [393, 1920]) {
  test(`notes have a single vertical scroll area ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.addInitScript(() => {
      localStorage.setItem("ntc.interface.zoom.v1", "150");
      localStorage.setItem("ntc.view.v1", "list");
    });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    const list = page.locator("[data-notes-zoom]");
    await expect(list).toBeVisible();
    const rail = page.locator(".notes-window-scrollbar");
    await expect(rail).toBeVisible();
    const railBox = (await rail.boundingBox())!;
    expect(railBox.y).toBe(0);
    expect(railBox.height).toBe(700);
    expect(railBox.x + railBox.width).toBe(width);
    expect(
      await list.evaluate((el) => getComputedStyle(el).scrollbarWidth),
    ).toBe("none");
    const dimensions = () =>
      list.evaluate((el) => ({
        outer:
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
        inner: el.scrollHeight - el.clientHeight,
        height: el.clientHeight,
      }));
    await expect
      .poll(async () => (await dimensions()).outer)
      .toBeLessThanOrEqual(1);
    expect(
      (await list.boundingBox())!.x + (await list.boundingBox())!.width,
    ).toBeCloseTo(width, 0);
    expect(
      await list.evaluate((el) => {
        const canvas = el
          .querySelector(".notes-zoom-layer")!
          .getBoundingClientRect();
        return el.getBoundingClientRect().right - canvas.right;
      }),
    ).toBeGreaterThan(15);
    expect((await dimensions()).inner).toBeGreaterThan(100);
    const box = (await list.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        Math.abs(
          (await rail.evaluate((el) => el.scrollTop)) -
            (await list.evaluate((el) => el.scrollTop)),
        ),
      )
      .toBeLessThanOrEqual(1);
    await rail.evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(0);
    // Exercise the browser's actual native thumb, not a synthetic pointer handler.
    const thumbHeight = await rail.evaluate(
      (el) => el.clientHeight ** 2 / el.scrollHeight,
    );
    await page.mouse.move(width - 3, thumbHeight / 2);
    await page.mouse.down();
    await page.mouse.move(width - 3, thumbHeight / 2 + 100, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(30);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const bottom = await list.evaluate((el) => {
      const cards = el.querySelectorAll(".note-card");
      return (
        el.getBoundingClientRect().bottom -
        cards[cards.length - 1].getBoundingClientRect().bottom
      );
    });
    expect(bottom).toBeGreaterThanOrEqual(-1);
    expect(bottom).toBeLessThan(80);
    // Pagination controls are a sibling of the viewport in the real page.
    // Adding/removing that row must reduce/reclaim list height without page overflow.
    const before = (await dimensions()).height;
    await page.locator(".workspace-main").evaluate((el) => {
      const footer = document.createElement("div");
      footer.className = "load-more";
      footer.id = "pagination-layout-probe";
      footer.innerHTML =
        '<button type="button">Pagination layout probe</button>';
      el.append(footer);
    });
    await expect
      .poll(async () => (await dimensions()).height)
      .toBeLessThan(before);
    expect((await dimensions()).outer).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("button", { name: "Pagination layout probe" }),
    ).toBeInViewport();
    await page
      .locator("#pagination-layout-probe")
      .evaluate((el) => el.remove());
    await expect.poll(async () => (await dimensions()).height).toBe(before);
    await page.screenshot({
      path: `test-results/notes-single-scroll-${width}.png`,
    });
    const resizedWidth = width === 1920 ? 760 : 430;
    await page.setViewportSize({ width: resizedWidth, height: 760 });
    await expect
      .poll(() => list.evaluate((el) => el.getBoundingClientRect().right))
      .toBe(resizedWidth);
    const resizedRail = (await rail.boundingBox())!;
    expect(resizedRail.y).toBe(0);
    expect(resizedRail.height).toBe(760);
    expect(resizedRail.x + resizedRail.width).toBe(resizedWidth);
    expect((await dimensions()).outer).toBeLessThanOrEqual(1);
  });
}

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
      const horizontalOffsets: number[] = [];
      const leftEdges: number[] = [];
      const columns = new Set<string>();
      const start = performance.now();
      let previous = start;
      let longest = 0;
      function sample(time: number) {
        longest = Math.max(longest, time - previous);
        previous = time;
        samples.push(new DOMMatrix(getComputedStyle(layer).transform).a);
        horizontalOffsets.push(el.scrollLeft);
        leftEdges.push(
          card.getBoundingClientRect().left - el.getBoundingClientRect().left,
        );
        columns.add(
          getComputedStyle(el.querySelector(".note-grid")!)
            .gridTemplateColumns.split(" ")
            .length.toString(),
        );
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
            clientX: el.getBoundingClientRect().left + el.clientWidth * 0.85,
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
        horizontalOffsets,
        leftEdges,
        longest,
        layout,
        during,
        columnCounts: [...columns],
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
    expect(result.horizontalOffsets.every((value) => value === 0)).toBe(true);
    expect(result.leftEdges.every((value) => Math.abs(value) < 1)).toBe(true);
    expect(
      new Set(result.samples.map((n) => n.toFixed(4))).size,
    ).toBeGreaterThan(15);
    for (let i = 1; i < result.samples.length; i++) {
      expect(result.samples[i] - result.samples[i - 1]).toBeGreaterThanOrEqual(
        -0.00001,
      );
      expect(result.samples[i] - result.samples[i - 1]).toBeLessThan(0.04);
    }
    // A column boundary may reflow while zoom is still in progress; it must
    // not oscillate layouts on every frame or wait for the gesture to stop.
    expect(result.columnCounts.length).toBeLessThanOrEqual(2);
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
    const extremes = await list.evaluate(async (el) => {
      const card = el.querySelector(".note-card")!;
      const offsets: number[] = [];
      const edges: number[] = [];
      function record() {
        offsets.push(el.scrollLeft);
        edges.push(
          card.getBoundingClientRect().left - el.getBoundingClientRect().left,
        );
      }
      for (const deltaY of [-80, 80]) {
        for (let i = 0; i < 18; i++) {
          el.dispatchEvent(
            new WheelEvent("wheel", {
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
              deltaY,
              clientX: el.getBoundingClientRect().right - 30,
              clientY: 350,
            }),
          );
          await new Promise((resolve) => requestAnimationFrame(resolve));
          record();
        }
        for (let i = 0; i < 40; i++) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          record();
        }
      }
      return { offsets, edges };
    });
    expect(extremes.offsets.every((value) => value === 0)).toBe(true);
    expect(extremes.edges.every((value) => Math.abs(value) < 1)).toBe(true);
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

for (const width of [393, 1280, 1920]) {
  test(`fixed grid card widths and balanced gaps at every zoom ${width}`, async ({
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
            gaps: firstRow
              .slice(1)
              .map((rect, i) => rect.left - firstRow[i].right),
            widths: Array.from(el.querySelectorAll(".note-card")).map(
              (node) => node.getBoundingClientRect().width,
            ),
            gridWidth: grid.width,
            available:
              el.clientWidth - parseFloat(getComputedStyle(el).paddingRight),
          };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.gridWidth).toBeCloseTo(layout.available, 0);
        if (mode === "list") expect(layout.rightGap).toBeLessThan(1);
        else
          expect(layout.rightGap).toBeCloseTo(
            layout.available -
              (layout.columns * layout.widths[0] +
                ((layout.columns - 1) * 20 * percent) / 100),
            0,
          );
        expect(
          Math.max(...layout.widths) - Math.min(...layout.widths),
        ).toBeLessThan(1);
        if (mode === "list") {
          expect(layout.columns).toBe(1);
          expect(layout.widths[0]).toBeCloseTo(layout.available, 0);
        } else {
          expect(layout.widths[0]).toBeCloseTo(
            Math.min((320 * percent) / 100, layout.available),
            0,
          );
          if (layout.gaps.length) {
            expect(
              Math.max(...layout.gaps) - Math.min(...layout.gaps),
            ).toBeLessThan(1);
            expect(Math.min(...layout.gaps)).toBeCloseTo(
              (20 * percent) / 100,
              0,
            );
          }
          columns.push(layout.columns);
        }
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
    } else if (width === 1280) expect(columns).toEqual([5, 3, 2]);
    else expect(columns).toEqual([2, 1, 1]);
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
