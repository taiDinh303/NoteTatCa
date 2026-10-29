const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mascotSourceFrames } = require("./mascot-source-frames.cjs");
function sheet() {
  const width = 240,
    height = 120,
    data = new Uint8ClampedArray(width * height * 4);
  function rect(x, y, w, h, alpha = 255) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) data[(j * width + i) * 4 + 3] = alpha;
  }
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 6; col++) {
      rect(col * 40 + 12, row * 40 + 10, 16, 15);
      rect(col * 40 + 15, row * 40 + 28, 10, 5); // Detached mechanical chest.
      rect(col * 40 + 31, row * 40 + 15, 2, 2); // Small reaction effect.
    }
  return { width, height, data, rect };
}
test("preserves every source pixel exactly once, including detached bodies and small effects", () => {
  const { data, width, height } = sheet(),
    frames = mascotSourceFrames(data, width, height);
  assert.equal(frames.length, 18);
  const coverage = new Uint8Array(width * height);
  for (const f of frames)
    for (let y = f.y; y < f.y + f.h; y++)
      for (let x = f.x; x < f.x + f.w; x++) coverage[y * width + x]++;
  assert.ok(coverage.every((v) => v === 1));
  for (const f of frames)
    for (let y = f.y; y < f.y + f.h; y++)
      for (let x = f.x; x < f.x + f.w; x++)
        if (data[(y * width + x) * 4 + 3])
          assert.ok(
            x > f.x && x < f.x + f.w - 1 && y > f.y && y < f.y + f.h - 1,
          );
});
test("refuses characters touching the outer canvas rather than publishing clipped ears", () => {
  const s = sheet();
  s.rect(0, 10, 2, 5);
  assert.throws(
    () => mascotSourceFrames(s.data, s.width, s.height),
    /outer source edge/,
  );
});
test("refuses a solid connection across a cell boundary", () => {
  const s = sheet();
  s.rect(25, 15, 31, 2);
  assert.throws(
    () => mascotSourceFrames(s.data, s.width, s.height),
    /No clear column gutter/,
  );
});
