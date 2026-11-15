import { test, expect } from "@playwright/test";

const base = "http://127.0.0.1:5199";
for (const width of [320, 393]) {
  test(`mobile pull reveals a row and Back stays inside the workspace ${width}`, async ({ page, request }) => {
    await request.post(base + "/__fixture/reset");
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const card = page.locator(".note-card").first();
    await expect(card).toBeVisible();
    await expect(page.getByRole("button", { name: "Back", exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.goBack();
    await expect(card).toBeVisible();
    await expect(page).toHaveURL(/\/notes$/);
    const view = card.locator(".note-card-identity");
    const marker = page.locator(".hidden-notes-pull");
    const top = (await card.boundingBox())!.y;
    await card.locator(".note-card-identity").dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 100, clientY: 180 }] });
    await expect(marker).toBeVisible();
    expect((await marker.boundingBox())!.height).toBeCloseTo(68, 0);
    expect((await card.boundingBox())!.y - top).toBeCloseTo(68, 0);
    await view.dispatchEvent("touchcancel");
    await expect(marker).toBeHidden();
    await expect.poll(async () => (await card.boundingBox())!.y).toBeCloseTo(top, 0);
    await view.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 250, clientY: 130 }] });
    await expect(marker).toBeHidden();
    await view.dispatchEvent("touchend");
    await expect(page).toHaveURL(/\/notes$/);
    await view.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 100, clientY: 300 }] });
    await expect(marker).toHaveText("Release to open hidden notes");
    expect((await card.boundingBox())!.y - top).toBeCloseTo(170, 0);
    await page.screenshot({ path: `../artifacts/hidden-pull-row-${width}.png`, fullPage: true });
    await view.dispatchEvent("touchend");
    await expect(page).toHaveURL(/\/hidden-notes$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/notes$/);
    await expect(card).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

    // Browser touch input on the preview exercises native event targeting and scrolling.
    const cdp = await page.context().newCDPSession(page);
    const box = (await card.locator(".note-open").boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + 12;
    await cdp.send("Input.dispatchTouchEvent", {type:"touchStart", touchPoints:[{x,y}]});
    for (const delta of [20, 50, 110, 200])
      await cdp.send("Input.dispatchTouchEvent", {type:"touchMove", touchPoints:[{x,y:y+delta}]});
    await expect(marker).toBeVisible();
    await expect(marker).toHaveText("Release to open hidden notes");
    await cdp.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
    await expect(page).toHaveURL(/\/hidden-notes$/);
    await page.goBack();
    await expect(card).toBeVisible();
    await card.locator(".note-open").click();
    await expect(page.getByRole("button", {name:"Close",exact:true})).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("button", {name:"Close",exact:true})).toBeHidden();
    await expect(card).toBeVisible();

    // A fresh tab at a child route has no previous app entry: create a safe workspace destination.
    const direct = await page.context().newPage();
    await direct.setViewportSize({ width, height: 850 });
    await direct.goto("/settings/account");
    await expect(direct.locator(".preferences-mobile-header h1")).toBeVisible();
    await expect(direct.getByRole("button", { name: "Back", exact: true }).filter({ visible: true })).toBeVisible();
    await direct.goBack();
    await expect(direct).toHaveURL(/\/notes$/);
    await expect(direct.locator(".note-card").first()).toBeVisible();
    await direct.close();
  });
}
