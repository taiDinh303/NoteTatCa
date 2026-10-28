// Verify exported pixels against intact source frames, independently of torso geometry.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  src = path.join(root, "assets/mascots/ntc-v5/raw");
(async () => {
  const geometry = JSON.parse(
    fs.readFileSync(path.join(src, "../geometry.json")),
  );
  assert.equal(geometry.details.length, 55);
  let checked = 0;
  for (const item of geometry.details) {
    const image = await loadImage(path.join(src, item.name + ".png"));
    assert.equal(
      item.transforms.reduce(
        (area, t) => area + t.sourceWidth * t.sourceHeight,
        0,
      ),
      image.width * image.height,
      item.name + " preserves the full source grid",
    );
    const canonical = await sharp(path.join(src, "..", item.name + ".webp"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(canonical.info.width, 2688);
    assert.equal(canonical.info.height, 1344);
    const atlases = await Promise.all(
      ["directions", "reactions"].map((k) =>
        sharp(
          path.join(
            root,
            "ntc_react/public/mascots/ntc-v5",
            item.name + "-" + k + ".webp",
          ),
        )
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
    );
    for (let n = 0; n < 18; n++) {
      const kind = Math.floor(n / 9),
        i = n % 9,
        t = item.transforms[n];
      assert.equal(t.scale, item.scale);
      const cell = createCanvas(t.sourceWidth, t.sourceHeight);
      cell
        .getContext("2d")
        .drawImage(
          image,
          t.sourceX,
          t.sourceY,
          t.sourceWidth,
          t.sourceHeight,
          0,
          0,
          t.sourceWidth,
          t.sourceHeight,
        );
      const expected = createCanvas(1344, 1344),
        c = expected.getContext("2d");
      c.drawImage(
        cell,
        (i % 3) * 448 + t.dx,
        Math.floor(i / 3) * 448 + t.dy,
        t.sourceWidth * t.scale,
        t.sourceHeight * t.scale,
      );
      const pixels = c.getImageData(
          (i % 3) * 448,
          Math.floor(i / 3) * 448,
          448,
          448,
        ).data,
        actual = atlases[kind];
      let visible = 0;
      for (let y = 0; y < 448; y++)
        for (let x = 0; x < 448; x++) {
          const p = (y * 448 + x) * 4,
            q = ((Math.floor(i / 3) * 448 + y) * 1344 + (i % 3) * 448 + x) * 4;
          assert.ok(
            Math.abs(pixels[p + 3] - actual[q + 3]) <= 1,
            item.name + "/" + n + " alpha",
          );
          if (pixels[p + 3] > 32) {
            visible++;
            for (let k = 0; k < 3; k++)
              assert.ok(
                Math.abs(pixels[p + k] - actual[q + k]) <= 2,
                item.name + "/" + n + " artwork",
              );
          }
          const canonicalIndex =
            ((Math.floor(i / 3) * 448 + y) * 2688 +
              ((i % 3) + kind * 3) * 448 +
              x) *
            4;
          assert.ok(
            Math.abs(actual[q + 3] - canonical.data[canonicalIndex + 3]) <= 1,
            item.name + " canonical alpha",
          );
          if (actual[q + 3] > 32)
            for (let k = 0; k < 3; k++)
              assert.ok(
                Math.abs(actual[q + k] - canonical.data[canonicalIndex + k]) <=
                  2,
                item.name + " canonical artwork",
              );
        }
      assert.ok(visible > 100);
      checked++;
    }
  }
  console.log(
    "PASS: " +
      checked +
      " intact frames, 55 characters, uniform scale per character.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
