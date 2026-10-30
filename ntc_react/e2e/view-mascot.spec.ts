import { expect, test } from "@playwright/test";

for (const width of [801, 1440]) {
  test(`View mascot has headroom and Edit keeps the same frame ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await expect(page.locator(".note-card")).toHaveCount(3);
    await page.locator(".note-card .note-open").first().click();
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    const mascot = viewer.locator(".note-mascot");
    await expect(mascot).toBeVisible();
    await expect(page.locator(".note-card .note-mascot")).toHaveCount(0);
    await expect(page.locator(".note-mascot")).toHaveCount(1);
    const frame = (await viewer.boundingBox())!,
      pet = (await mascot.boundingBox())!;
    expect(pet.y).toBeGreaterThanOrEqual(0);
    expect(Math.abs(pet.y + pet.height - frame.y)).toBeLessThan(2);
    expect(frame.height).toBeLessThan(800);
    await expect(viewer).toHaveCSS("overflow", "visible");
    await mascot.getByRole("button").click();
    await expect(viewer).toBeVisible();
    await page.screenshot({ path: `test-results/view-mascot-${width}.png` });
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor).toBeVisible();
    const editing = (await editor.boundingBox())!;
    expect(Math.abs(editing.height - frame.height)).toBeLessThan(1);
    expect(Math.abs(editing.y - frame.y)).toBeLessThan(1);
    await expect(editor.locator(".note-mascot")).toBeVisible();
    const editPet = (await editor.locator(".note-mascot").boundingBox())!;
    expect(Math.abs(editPet.x - pet.x)).toBeLessThan(1);
    expect(Math.abs(editPet.y - pet.y)).toBeLessThan(1);
    await editor.getByRole("button", { name: "View", exact: true }).click();
    await expect(mascot).toBeVisible();
    if (width > 800) {
      await viewer
        .getByRole("button", { name: "Enter full screen", exact: true })
        .click();
      await expect(viewer.locator(".note-mascot")).toHaveCount(0);
      expect((await viewer.boundingBox())!.height).toBeGreaterThan(890);
      await viewer
        .getByRole("button", { name: "Exit full screen", exact: true })
        .click();
      await expect(mascot).toBeVisible();
    }
    await page.evaluate(() => {
      localStorage.setItem("ntc.mascot.v1", "off:bunny");
      window.dispatchEvent(new Event("ntc:mascot-change"));
    });
    await expect(mascot).toHaveCount(0);
  });
}

test("one note mascot keeps its reaction and timers across View/Edit", async ({
  page,
}) => {
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await page.locator(".note-card .note-open").first().click();
  const view = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(view.locator(".note-mascot")).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await view.locator(".note-mascot button").click();
  await expect(view.locator(".mascot-reactions")).toHaveCSS("opacity", "1");
  for (let i = 0; i < 3; i++) {
    await view.getByRole("button", { name: "Edit", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(edit.locator(".note-mascot")).toBeVisible();
    await expect(edit.locator(".mascot-reactions")).toHaveCSS("opacity", "1");
    await expect(edit.locator(".mascot-reactions")).toHaveCSS(
      "background-position",
      "0% 0%",
    );
    await expect(page.locator(".note-mascot")).toHaveCount(1);
    await edit.getByRole("button", { name: "View", exact: true }).click();
    await expect(view.locator(".mascot-reactions")).toHaveCSS("opacity", "1");
    await expect(page.locator(".note-mascot")).toHaveCount(1);
  }
  await page.clock.runFor(130);
  await expect(view.locator(".mascot-reactions")).toHaveCSS(
    "background-position",
    "50% 0%",
  );
  await page.clock.runFor(500);
  await expect(view.locator(".mascot-reactions")).toHaveCSS("opacity", "0");
  await view.getByRole("button", { name: "Close", exact: true }).click();
  await page.clock.runFor(600);
  await expect(page.locator(".note-card .note-mascot")).toBeVisible();
});
