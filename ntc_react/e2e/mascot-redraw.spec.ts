import { test, expect } from "@playwright/test";
import {
  mascotCharacters,
  mascotPresetSources,
} from "../src/features/mascot/mascotPreference";
test("all55 redrawn mascots: real cursor directions keep the chest planted and equal size", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() =>
    localStorage.setItem("ntc.mascot.v1", "on:deer"),
  );
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  for (const character of mascotCharacters) {
    await page.evaluate((name) => {
      localStorage.setItem("ntc.mascot.v1", "on:" + name);
      window.dispatchEvent(new Event("ntc:mascot-change"));
    }, character);
    const mascot = page.locator(".note-mascot");
    await expect(mascot).toBeVisible();
    for (const frame of [1, 5, 7, 3, 4]) {
      const r = (await mascot.boundingBox())!;
      await page.mouse.move(
        r.x + r.width / 2 + ((frame % 3) - 1) * 190,
        r.y + r.height / 2 + (Math.floor(frame / 3) - 1) * 190,
      );
      await expect(mascot.locator(".mascot-directions")).toHaveCSS(
        "background-position",
        (frame % 3) * 50 + "% " + Math.floor(frame / 3) * 50 + "%",
      );
      const metrics = await mascot.evaluate(async (element) => {
        const layer = element.querySelector<HTMLElement>(".mascot-directions")!,
          style = getComputedStyle(layer);
        const image = new Image();
        image.src = style.backgroundImage.slice(5, -2);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const c = canvas.getContext("2d")!;
        c.drawImage(image, 0, 0);
        const w = image.width / 3,
          h = image.height / 3,
          [x, y] = style.backgroundPosition.split(" ").map(parseFloat);
        const url = "/src/features/mascot/mascotBodyFloor.ts";
        const { mascotBodyAnchor } = await import(/* @vite-ignore */ url);
        const a = mascotBodyAnchor(
          c.getImageData(Math.round(x / 50) * w, Math.round(y / 50) * h, w, h)
            .data,
          w,
          h,
        );
        const rect = layer.getBoundingClientRect(),
          wrapper = element.getBoundingClientRect(),
          card = element.closest(".note-card")!.getBoundingClientRect();
        return {
          x: rect.x + a.center * rect.width - (wrapper.x + wrapper.width / 2),
          y: rect.y + a.floor * rect.height - card.top,
          width: a.width * rect.width,
        };
      });
      expect(Math.abs(metrics.x), character + " x/" + frame).toBeLessThan(0.65);
      expect(Math.abs(metrics.y), character + " y/" + frame).toBeLessThan(1.1);
      if (frame === 4)
        expect(metrics.width, character + " body size").toBeCloseTo(35, 0);
      if (frame === 7)
        await page.screenshot({
          path: "test-results/redraw-down-" + character + ".png",
        });
    }
  }
});

test("all110 redrawn atlases use the same transparent high-resolution canvas", async ({
  page,
}) => {
  await page.goto("/Home");
  for (const name of mascotCharacters)
    for (const source of Object.values(mascotPresetSources(name))) {
      const metrics = await page.evaluate(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const c = canvas.getContext("2d")!;
        c.drawImage(image, 0, 0);
        const data = c.getImageData(0, 0, image.width, image.height).data;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4)
          if (data[i] === 0) transparent++;
        return { width: image.width, height: image.height, transparent };
      }, source);
      expect(metrics.width, name).toBe(1344);
      expect(metrics.height, name).toBe(1344);
      expect(metrics.transparent, name).toBeGreaterThan(
        metrics.width * metrics.height * 0.15,
      );
    }
});
