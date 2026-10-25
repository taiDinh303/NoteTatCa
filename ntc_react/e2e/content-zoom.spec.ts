import { test, expect } from "@playwright/test";

test.use({ hasTouch: true });
for (const width of [393, 1280]) {
  test(`content zoom keeps note chrome and saved text unchanged ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    let dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await dialog
      .getByLabel("Note title", { exact: true })
      .fill("Zoom regression");
    const content = dialog.getByRole("textbox", { name: "Note content" });
    const text = Array.from(
      { length: 80 },
      (_, i) => `Line ${i + 1}: Keep the original font size and content.`,
    ).join("\n");
    await content.fill(text);
    await expect(
      dialog.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    const markup = await content.innerHTML();
    const before = await dialog
      .locator(".editor-heading, .editor-toolbar, .editor-footer")
      .evaluateAll((els) =>
        els.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          y: el.getBoundingClientRect().y,
        })),
      );
    for (let i = 0; i < 10; i++)
      await dialog
        .getByRole("button", { name: "Zoom in content", exact: true })
        .click();
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("200%");
    await expect(content).toHaveJSProperty("innerHTML", markup);
    const after = await dialog
      .locator(".editor-heading, .editor-toolbar, .editor-footer")
      .evaluateAll((els) =>
        els.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          y: el.getBoundingClientRect().y,
        })),
      );
    expect(after).toEqual(before);
    const viewport = dialog.locator(".content-zoom-viewport");
    await viewport.evaluate((el) => {
      el.scrollTop = 500;
      el.scrollLeft = 150;
    });
    expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(400);
    expect(await viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await dialog
      .getByRole("button", { name: "Reset content zoom", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("100%");
    await viewport.evaluate((el) =>
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -180,
          clientX: 100,
          clientY: 200,
        }),
      ),
    );
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).not.toHaveText("100%");
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
    ).toBe("100");
    await dialog.getByRole("button", { name: "View", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).not.toHaveText("100%");
    const read = dialog.getByRole("region", { name: "Note content" });
    await expect(read).toHaveJSProperty("innerHTML", markup);
    await expect(read).toHaveAttribute("contenteditable", "false");
    await dialog
      .getByRole("button", { name: "Reset content zoom", exact: true })
      .click();
    await dialog.locator(".content-zoom-viewport").evaluate((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
    const box = (await dialog.locator(".content-zoom-viewport").boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + 100,
      x = box.x + box.width / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 40, y },
        { x: x + 40, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 70, y },
        { x: x + 70, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("175%");
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
    ).toBe("100");
    const scrollBefore = await dialog
      .locator(".content-zoom-viewport")
      .evaluate((el) => el.scrollTop);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: box.y + box.height - 80, id: 1 }],
    });
    for (let offset = 20; offset <= 180; offset += 20) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: box.y + box.height - 80 - offset, id: 1 }],
      });
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() =>
        dialog.locator(".content-zoom-viewport").evaluate((el) => el.scrollTop),
      )
      .toBeGreaterThan(scrollBefore + 100);
    await dialog.screenshot({
      path: `test-results/content-zoom-view-${width}.png`,
    });
    // Global zoom still works from the title, independently of the document.
    await dialog.locator(".note-view-heading").evaluate((el) =>
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -100,
        }),
      ),
    );
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
      )
      .toBe("111");
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("175%");
    await dialog.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("175%");
    await dialog.getByRole("textbox", { name: "Note content" }).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Edited while content is zoomed");
    await expect(
      dialog.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Open Zoom regression", exact: true })
      .click();
    dialog = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText("100%");
    await expect(
      dialog.getByRole("region", { name: "Note content" }),
    ).toHaveText("Edited while content is zoomed");
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
    ).toBe("111");
  });
}

test("large gestures clamp content zoom and Reset restores the document", async ({
  page,
}) => {
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New note", exact: true });
  const content = dialog.getByRole("textbox", { name: "Note content" });
  await content.fill("Keep this text unchanged");
  const viewport = dialog.locator(".content-zoom-viewport");
  for (const [delta, expected, button] of [
    [-3000, "300%", "Zoom in content"],
    [3000, "50%", "Zoom out content"],
  ] as const) {
    await viewport.evaluate(
      (el, deltaY) =>
        el.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            deltaY,
          }),
        ),
      delta,
    );
    await expect(
      dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
    ).toHaveText(expected);
    await expect(
      dialog.getByRole("button", { name: button, exact: true }),
    ).toBeDisabled();
  }
  await dialog
    .getByRole("button", { name: "Reset content zoom", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Reset content zoom", exact: true }),
  ).toHaveText("100%");
  await expect(content).toHaveText("Keep this text unchanged");
});
