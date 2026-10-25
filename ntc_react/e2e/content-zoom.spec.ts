import { test, expect } from "@playwright/test";

test.use({ hasTouch: true });
async function zoomInput(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("button", {
    name: "Content zoom",
    exact: true,
  });
  if (
    (await trigger.isVisible()) &&
    (await trigger.getAttribute("aria-expanded")) !== "true"
  )
    await trigger.click();
  return page.getByRole("spinbutton", {
    name: "Content zoom percentage",
    exact: true,
  });
}
async function setZoom(page: import("@playwright/test").Page, percent: number) {
  const input = await zoomInput(page);
  await input.fill(String(percent));
  await input.press("Enter");
}
for (const width of [320, 393, 1280]) {
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
    await dialog
      .getByRole("button", { name: "Note background color", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Hex color", exact: true })
      .fill(width === 393 ? "#202824" : "#ffdab5");
    await page
      .getByRole("button", { name: "Apply color", exact: true })
      .click();
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
    const boldX = (await dialog
      .getByRole("button", { name: "Bold", exact: true })
      .boundingBox())!.x;
    await zoomInput(page);
    expect(
      (await dialog
        .getByRole("button", { name: "Bold", exact: true })
        .boundingBox())!.x,
    ).toBeGreaterThan(boldX + 100);
    await expect(page.locator(".content-zoom-menu")).toHaveCount(0);
    for (let i = 0; i < 10; i++)
      await page
        .getByRole("button", { name: "Zoom in content", exact: true })
        .click();
    await expect(await zoomInput(page)).toHaveValue("200");
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
    await setZoom(page, 100);
    await expect(await zoomInput(page)).toHaveValue("100");
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
    await expect(await zoomInput(page)).not.toHaveValue("100");
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
    ).toBe("100");
    await dialog.getByRole("button", { name: "View", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "View note", exact: true });
    const footer = dialog.locator(".note-view-footer");
    const stampBefore = await dialog
      .locator(".note-view-timestamp")
      .boundingBox();
    await zoomInput(page);
    const menu = page.locator(".content-zoom-menu");
    await expect(menu).toHaveAttribute("data-side", "top");
    const popup = (await menu.boundingBox())!,
      note = (await dialog.boundingBox())!,
      trigger = (await dialog
        .getByRole("button", { name: "Content zoom", exact: true })
        .boundingBox())!;
    expect(popup.x).toBeGreaterThanOrEqual(note.x);
    expect(popup.x + popup.width).toBeLessThanOrEqual(note.x + note.width);
    expect(popup.y).toBeGreaterThanOrEqual(note.y);
    expect(popup.y + popup.height).toBeLessThan(trigger.y);
    expect(await dialog.locator(".note-view-timestamp").boundingBox()).toEqual(
      stampBefore,
    );
    const noteColor = await dialog.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await expect(menu).toHaveCSS("background-color", noteColor);
    const reset = await menu
      .getByRole("button", { name: "Reset content zoom", exact: true })
      .locator("svg")
      .boundingBox();
    const plus = await menu
      .getByRole("button", { name: "Zoom in content", exact: true })
      .locator("svg")
      .boundingBox();
    expect(reset!.width).toBe(14);
    expect(reset!.height).toBe(14);
    expect(plus!.width).toBe(reset!.width);
    expect(
      await footer.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await expect(await zoomInput(page)).not.toHaveValue("100");
    const read = dialog.getByRole("region", { name: "Note content" });
    await expect(read).toHaveJSProperty("innerHTML", markup);
    await expect(read).toHaveAttribute("contenteditable", "false");
    await setZoom(page, 100);
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
    await expect(await zoomInput(page)).toHaveValue("175");
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
    await expect(await zoomInput(page)).toHaveValue("175");
    await dialog.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(await zoomInput(page)).toHaveValue("175");
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
    await expect(await zoomInput(page)).toHaveValue("100");
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
    [-3000, "300", "Zoom in content"],
    [3000, "50", "Zoom out content"],
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
    await expect(await zoomInput(page)).toHaveValue(expected);
    await expect(
      page.getByRole("button", { name: button, exact: true }),
    ).toBeDisabled();
  }
  await setZoom(page, 100);
  await expect(await zoomInput(page)).toHaveValue("100");
  await expect(content).toHaveText("Keep this text unchanged");
});

test("desktop hand pans both axes and can be turned off for text selection", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    hasTouch: false,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/Home`);
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "New note", exact: true });
  await dialog.getByLabel("Note title").fill("Hand pan regression");
  await dialog
    .getByRole("textbox", { name: "Note content" })
    .fill(
      Array.from(
        { length: 60 },
        (_, i) =>
          `Long paragraph ${i + 1} for horizontal and vertical dragging.`,
      ).join("\n"),
    );
  await dialog.getByRole("button", { name: "View", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "View note", exact: true });
  const input = await zoomInput(page);
  await expect(input).toBeVisible();
  await setZoom(page, 200);
  const hand = page.getByRole("button", { name: "Pan content", exact: true });
  await expect(hand).toHaveAttribute("aria-pressed", "false");
  await dialog
    .getByRole("button", { name: "Enter full screen", exact: true })
    .click();
  await expect(dialog).toHaveClass(/fullscreen/);
  expect((await dialog.boundingBox())!.width).toBeCloseTo(1280);
  expect((await dialog.boundingBox())!.height).toBeCloseTo(900);
  await expect(await zoomInput(page)).toHaveValue("200");
  await dialog
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  expect((await dialog.boundingBox())!.width).toBeLessThan(1280);
  await zoomInput(page);
  await hand.click();
  const view = dialog.locator(".content-zoom-viewport");
  await view.evaluate((el) => {
    el.scrollLeft = 0;
    el.scrollTop = 0;
  });
  await expect(view).toHaveCSS("cursor", "grab");
  const bounds = (await view.boundingBox())!;
  const x = bounds.x + 400,
    y = bounds.y + 300;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y - 140, { steps: 8 });
  await expect(view).toHaveCSS("cursor", "grabbing");
  expect(await view.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  expect(await view.evaluate((el) => el.scrollTop)).toBeGreaterThan(120);
  await page.mouse.up();
  await expect(view).toHaveCSS("cursor", "grab");
  await zoomInput(page);
  await hand.click();
  const before = await view.evaluate((el) => ({
    x: el.scrollLeft,
    y: el.scrollTop,
  }));
  await page.mouse.move(x - 180, y - 180);
  await page.mouse.down();
  await page.mouse.move(x - 250, y - 200, { steps: 5 });
  await page.mouse.up();
  expect(
    await view.evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop })),
  ).toEqual(before);
  expect(
    await page.evaluate(() => window.getSelection()?.toString().length),
  ).toBeGreaterThan(0);
  await dialog.screenshot({
    path: "test-results/content-zoom-hand-desktop.png",
  });
  await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Edit note", exact: true });
  await expect(
    page.getByRole("button", { name: "Pan content", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Content zoom", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await setZoom(page, 200);
  const editHand = page.getByRole("button", {
    name: "Pan content",
    exact: true,
  });
  await expect(editHand).toHaveAttribute("aria-pressed", "false");
  await editHand.click();
  const editView = dialog.locator(".content-zoom-viewport");
  const original = await dialog
    .getByRole("textbox", { name: "Note content" })
    .innerHTML();
  await editView.evaluate((el) => {
    el.scrollLeft = 0;
    el.scrollTop = 0;
  });
  const editArea = (await editView.boundingBox())!;
  await page.mouse.move(editArea.x + 400, editArea.y + 250);
  await page.mouse.down();
  await page.mouse.move(editArea.x + 280, editArea.y + 120, { steps: 8 });
  await page.mouse.up();
  expect(await editView.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  expect(await editView.evaluate((el) => el.scrollTop)).toBeGreaterThan(110);
  await expect(
    dialog.getByRole("textbox", { name: "Note content" }),
  ).toHaveJSProperty("innerHTML", original);
  await editHand.click();
  await expect(editHand).toHaveAttribute("aria-pressed", "false");
  await context.close();
});
