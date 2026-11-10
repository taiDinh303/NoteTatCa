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
    await expect(page.getByRole("button", { name: "Back", exact: true }).filter({ visible: true })).toBeVisible();
    await page.goBack();
    await expect(card).toBeVisible();
    await expect(page).toHaveURL(/\/notes$/);
    const view = page.locator("[data-notes-zoom]");
    const marker = page.locator(".hidden-notes-pull");
    const top = (await card.boundingBox())!.y;
    await view.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 100, clientY: 180 }] });
    await expect(marker).toBeVisible();
    expect((await marker.boundingBox())!.height).toBeCloseTo(32, 0);
    expect((await card.boundingBox())!.y - top).toBeCloseTo(32, 0);
    await view.dispatchEvent("touchcancel");
    await expect(marker).toBeHidden();
    await expect.poll(async () => (await card.boundingBox())!.y).toBeCloseTo(top, 0);
    await view.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 250, clientY: 130 }] });
    await expect(marker).toBeHidden();
    await view.dispatchEvent("touchend");
    await expect(page).toHaveURL(/\/notes$/);
    await view.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 100, clientY: 100 }] });
    await view.dispatchEvent("touchmove", { touches: [{ identifier: 0, clientX: 100, clientY: 245 }] });
    await expect(marker).toHaveText("Release to open hidden notes");
    expect((await card.boundingBox())!.y - top).toBeCloseTo(44, 0);
    await page.screenshot({ path: `../artifacts/hidden-pull-row-${width}.png`, fullPage: true });
    await view.dispatchEvent("touchend");
    await expect(page).toHaveURL(/\/hidden-notes$/);
    await page.getByRole("button", { name: "Back", exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/notes$/);
    await expect(card).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

    // A fresh tab at a child route has no previous app entry: create a safe workspace destination.
    const direct = await page.context().newPage();
    await direct.setViewportSize({ width, height: 850 });
    await direct.goto("/settings/account");
    await expect(direct.getByRole("button", { name: "Back", exact: true }).filter({ visible: true })).toBeVisible();
    await direct.goBack();
    await expect(direct).toHaveURL(/\/notes$/);
    await expect(direct.locator(".note-card").first()).toBeVisible();
    await direct.close();
  });
}
