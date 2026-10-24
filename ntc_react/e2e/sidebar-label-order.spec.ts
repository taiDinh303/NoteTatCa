import { test, expect } from "@playwright/test";

for (const touch of [false, true]) {
  test(`sidebar label order persists without navigating touch=${touch}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: touch ? 393 : 1440, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    async function openNav() {
      if (touch)
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
    }
    await openNav();
    if (touch)
      await expect(page.locator(".workspace-drawer")).toHaveCSS(
        "clip-path",
        "inset(0px 0% 0px 0px)",
      );
    const nav = page
      .getByRole("navigation", { name: "Labels", exact: true })
      .filter({ visible: true });
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(3);
    const names = await links.allTextContents();
    const source = (await links.nth(2).boundingBox())!,
      target = (await links.first().boundingBox())!;
    const sx = source.x + 60,
      sy = source.y + source.height / 2;
    const tx = target.x + 60,
      ty = target.y + target.height / 2;
    if (touch) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: sx, y: sy, id: 1 }],
      });
      await page.waitForTimeout(280);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: tx, y: ty, id: 1 }],
      });
      await expect(nav.locator(".sorting")).toHaveCount(1);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(sx + 12, sy, { steps: 3 });
      await page.mouse.move(tx, ty, { steps: 12 });
      await page.mouse.up();
    }
    await expect(links).toHaveText([names[2], names[0], names[1]]);
    await expect(page).toHaveURL(/\/notes$/);
    await page.reload();
    await openNav();
    if (touch)
      await expect(page.locator(".workspace-drawer")).toHaveCSS(
        "clip-path",
        "inset(0px 0% 0px 0px)",
      );
    await expect(links).toHaveText([names[2], names[0], names[1]]);
    if (!touch) {
      const handle = nav.getByRole("button", {
        name: `Move ${names[2]}`,
        exact: true,
      });
      await handle.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      await expect(links).toHaveText([names[0], names[2], names[1]]);
      await page.reload();
      await expect(links).toHaveText([names[0], names[2], names[1]]);
    }
    await links.first().click();
    await expect(page).toHaveURL(/\/labels\//);
  });
}
