import { expect, test } from "@playwright/test";
import { mascotPresetSources } from "../src/features/mascot/mascotPreference";

test("paper pal uses the cool white redesign instead of the beige portrait", async ({
  page,
}) => {
  await page.goto("/Home");
  const sources = mascotPresetSources("paper");
  expect(sources.directions).toContain("/ntc-v6/");
  const warmRatio = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    const c = canvas.getContext("2d")!;
    const tile = image.width / 3;
    c.drawImage(image, tile, tile, tile, tile, 0, 0, 320, 320);
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
