import { expect, test } from "@playwright/test";

for (const width of [393, 1440]) {
  test(`Wizard hat stays inside the viewport in View and Edit ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem("ntc.mascot.v1", "on:wizard"),
    );
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await page.locator(".note-card .note-open").first().click();
    for (const mode of ["View", "Edit"]) {
      const dialog = page.getByRole("dialog", {
        name: `${mode} note`,
        exact: true,
      });
      const mascot = dialog.locator(".note-mascot");
      await expect(mascot).toBeVisible();
      const bounds = await mascot
        .locator(".mascot-directions")
        .evaluate(async (element) => {
          const css = getComputedStyle(element),
            image = new Image();
          image.src = css.backgroundImage.slice(5, -2);
          await image.decode();
          const tile = image.width / 3,
            canvas = document.createElement("canvas");
          canvas.width = canvas.height = tile;
          const c = canvas.getContext("2d")!;
          const [column, row] = css.backgroundPosition
            .split(" ")
            .map((v) => parseFloat(v) / 50);
          c.drawImage(
            image,
            column * tile,
            row * tile,
            tile,
            tile,
            0,
            0,
            tile,
            tile,
          );
          const rgba = c.getImageData(0, 0, tile, tile).data;
          let left = tile,
            top = tile,
            right = 0;
          for (let y = 0; y < tile; y++)
            for (let x = 0; x < tile; x++) {
              if (rgba[(y * tile + x) * 4 + 3] <= 96) continue;
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x + 1);
            }
          const rect = element.getBoundingClientRect();
          return {
            left: rect.x + (left / tile) * rect.width,
            top: rect.y + (top / tile) * rect.height,
            right: rect.x + (right / tile) * rect.width,
            viewport: innerWidth,
          };
        });
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
      await page.screenshot({
        path: `test-results/wizard-${mode}-${width}.png`,
      });
      if (mode === "View")
        await dialog.getByRole("button", { name: "Edit", exact: true }).click();
    }
  });
}
