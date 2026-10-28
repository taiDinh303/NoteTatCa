// Verify exported pixels against intact source frames, independently of torso geometry.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  src = path.join(root, "assets/mascots/ntc-v1");
(async () => {
  const geometry = JSON.parse(
    fs.readFileSync(path.join(src, "geometry-v4.json")),
  );
  assert.equal(geometry.details.length, 55);
  let checked = 0;
  for (const item of geometry.details) {
    const image = await loadImage(path.join(src, item.name + ".png"));
    const atlases = await Promise.all(
      ["directions", "reactions"].map((k) =>
        sharp(
          path.join(
            root,
            "ntc_react/public/mascots/ntc-v4",
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
        col = (i % 3) + kind * 3,
        row = Math.floor(i / 3),
        t = item.transforms[n];
      assert.equal(t.scale, item.scale);
      const cell = createCanvas(t.sourceWidth, t.sourceHeight);
      cell
        .getContext("2d")
        .drawImage(
          image,
          Math.round((col * image.width) / 6),
          Math.round((row * image.height) / 3),
          t.sourceWidth,
          t.sourceHeight,
          0,
          0,
          t.sourceWidth,
          t.sourceHeight,
        );
      const expected = createCanvas(960, 960),
        c = expected.getContext("2d");
      c.drawImage(
        cell,
        (i % 3) * 320 + t.dx,
        Math.floor(i / 3) * 320 + t.dy,
        t.sourceWidth * t.scale,
        t.sourceHeight * t.scale,
      );
      const pixels = c.getImageData(
          (i % 3) * 320,
          Math.floor(i / 3) * 320,
          320,
          320,
        ).data,
        actual = atlases[kind];
      let visible = 0;
      for (let y = 0; y < 320; y++)
        for (let x = 0; x < 320; x++) {
          const p = (y * 320 + x) * 4,
            q = ((Math.floor(i / 3) * 320 + y) * 960 + (i % 3) * 320 + x) * 4;
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
