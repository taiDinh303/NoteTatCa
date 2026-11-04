import { test, expect } from "@playwright/test";

test("100 percent grid fills its available columns before any sidebar toggle", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await request.post("http://127.0.0.1:5199/__fixture/seed-notes?count=14");
  await page.addInitScript(() => {
    localStorage.setItem("ntc.interface.zoom.v1", "100");
    localStorage.setItem("ntc.sidebar.hidden.v1", "true");
    localStorage.setItem("ntc.mascot.v1", "off:bunny");
  });
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  const layout = () =>
    page.locator(".notes-zoom-layer").evaluate((element) => {
      const shell = element.closest(".customer-shell")!;
      const view = element.closest(".notes-zoom-viewport")!;
      const workspace = getComputedStyle(view.parentElement!);
      const width =
        shell.clientWidth -
        parseFloat(workspace.paddingLeft) -
        parseFloat(workspace.paddingRight);
      const grid = Array.from(element.querySelectorAll(".note-grid")).at(-1)!;
      const boxes = Array.from(grid.querySelectorAll(".note-card")).map(
        (card) => card.getBoundingClientRect(),
      );
      return {
        fullWidth: width,
        available:
          view.getBoundingClientRect().width -
          parseFloat(workspace.paddingRight),
        columns: boxes.filter((box) => Math.abs(box.top - boxes[0].top) < 2)
          .length,
        expected: Math.max(3, Math.round((width + 20) / 320)),
        card: (element as HTMLElement).style.getPropertyValue(
          "--notes-card-width",
        ),
      };
    });
  for (const width of [
    1920, 1919, 1918, 1917, 1916, 1915, 1914, 1913, 1912, 1911, 1910,
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(
        async () => {
          const value = await layout();
          return { columns: value.columns, expected: value.expected };
        },
        {
          message: `All columns should fit at ${width}px without toggling navigation`,
        },
      )
      .toEqual({ columns: 6, expected: 6 });
    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    const menuLayout = await layout();
    expect(menuLayout.columns).toBe(menuLayout.expected);
    await page.keyboard.press("Escape");
  }
  // Browser zoom and fractional containing blocks can differ from clientWidth
  // by less than a CSS pixel, without losing room for a whole card.
  await page.addStyleTag({
    content: ".customer-shell { width: calc(100% - 0.2px); }",
  });
  await expect.poll(async () => (await layout()).columns).toBe(6);
  const base = await layout();
  await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
  await expect.poll(async () => (await layout()).columns).toBe(5);
  await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
  await expect.poll(async () => (await layout()).columns).toBe(6);
  expect((await layout()).card).toBe(base.card);
  await page.screenshot({ path: "artifacts/grid-initial-fit/fitted-100.png" });
});

test("a settled gesture displaying 100 percent uses exactly 100 percent geometry", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.addInitScript(() => {
    localStorage.setItem("ntc.interface.zoom.v1", "100");
    localStorage.setItem("ntc.sidebar.hidden.v1", "true");
  });
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const view = page.locator("[data-notes-zoom]");
  await expect(page.locator(".note-card").first()).toBeVisible();
  await view.dispatchEvent("wheel", {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
    deltaY: -1,
  });
  await expect(page.locator(".zoom-indicator")).toBeVisible();
  await expect(page.locator(".zoom-indicator")).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
  ).toBe("100");
  await expect(page.locator(".notes-zoom-layer")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  expect(
    await page
      .locator(".notes-zoom-layer")
      .evaluate((element) => element.style.getPropertyValue("--notes-columns")),
  ).toBe("6");
});
