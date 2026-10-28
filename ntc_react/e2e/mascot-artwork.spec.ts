import { expect, test } from "@playwright/test";
import {
  mascotCharacters,
  mascotPresetSources,
} from "../src/features/mascot/mascotPreference";

test("all project companions have one identical torso across all eighteen frames", async ({
  page,
}) => {
  await page.goto("/Home");
  expect(mascotCharacters).toHaveLength(55);
  for (const name of mascotCharacters) {
    const result = await page.evaluate(async (sources) => {
      const cells: Uint8ClampedArray[] = [];
      for (const source of [sources.directions, sources.reactions]) {
        const image = new Image();
        image.src = source;
        await image.decode();
        if (image.naturalWidth !== 960 || image.naturalHeight !== 960)
          throw new Error("Unexpected atlas geometry");
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 320;
        const c = canvas.getContext("2d", { willReadFrequently: true })!;
        for (let i = 0; i < 9; i++) {
          c.clearRect(0, 0, 320, 320);
          c.drawImage(
            image,
            (i % 3) * 320,
            Math.floor(i / 3) * 320,
            320,
            320,
            0,
            0,
            320,
            320,
          );
          cells.push(c.getImageData(0, 0, 320, 320).data);
        }
      }
      const ref = cells[4];
      let changed = 0,
        left = 320,
        right = -1,
        bottom = -1,
        edgePixels = 0;
      for (let y = 244; y < 320; y++)
        for (let x = 0; x < 320; x++) {
          const p = (y * 320 + x) * 4;
          if (ref[p + 3] > 96) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
          for (const cell of cells) {
            // Browser premultiplication may round near-transparent colors; allow 1/255.
            if (
              Math.abs(cell[p + 3] - ref[p + 3]) > 1 ||
              (ref[p + 3] > 32 &&
                [0, 1, 2].some((k) => Math.abs(cell[p + k] - ref[p + k]) > 1))
            )
              changed++;
          }
        }
      for (const cell of cells)
        for (let k = 0; k < 320; k++) {
          for (const p of [
            k * 4,
            (319 * 320 + k) * 4,
            k * 320 * 4,
            (k * 320 + 319) * 4,
          ])
            if (cell[p + 3] > 96) edgePixels++;
        }
      return { changed, bodyWidth: right - left + 1, bottom, edgePixels };
    }, mascotPresetSources(name));
    expect(result.changed, name + " torso changes").toBe(0);
    expect(result.bodyWidth, name + " width").toBeGreaterThanOrEqual(142);
    expect(result.bodyWidth, name + " width").toBeLessThanOrEqual(146);
    expect(result.bottom, name + " baseline").toBe(299);
    expect(result.edgePixels, name + " clipped pixels").toBe(0);
  }
});

test("paper pal uses the cool white redesign instead of the beige portrait", async ({
  page,
}) => {
  await page.goto("/Home");
  const sources = mascotPresetSources("paper");
  expect(sources.directions).toContain("/ntc-v2/");
  const warmRatio = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    const c = canvas.getContext("2d")!;
    c.drawImage(image, 320, 320, 320, 320, 0, 0, 320, 320);
    const pixels = c.getImageData(0, 0, 320, 320).data;
    let warm = 0,
      opaque = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 160) continue;
      opaque++;
      if (pixels[i] - pixels[i + 2] > 24 && pixels[i] - pixels[i + 1] > 8)
        warm++;
    }
    return warm / opaque;
  }, sources.directions);
  expect(warmRatio).toBeLessThan(0.04);
});
