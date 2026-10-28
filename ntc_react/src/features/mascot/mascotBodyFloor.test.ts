import { expect, test } from "vitest";
import { mascotBodyFloor, mascotBodyAnchor } from "./mascotBodyFloor";
function picture(rectangles: number[][]) {
  const data = new Uint8ClampedArray(100 * 100 * 4);
  for (const [left, top, right, bottom] of rectangles)
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) data[(y * 100 + x) * 4 + 3] = 255;
  return data;
}
test("anchors the actual chest, not lower specks or detached effects", () => {
  expect(
    mascotBodyFloor(
      picture([
        [20, 10, 80, 75],
        [1, 90, 12, 93],
        [45, 95, 48, 98],
      ]),
      100,
      100,
    ),
  ).toBe(0.75);
});
test("includes a substantial separate robot chest below a neck gap", () => {
  expect(
    mascotBodyFloor(
      picture([
        [20, 10, 80, 55],
        [30, 60, 70, 85],
      ]),
      100,
      100,
    ),
  ).toBe(0.85);
});
test("measures every frame independently", () => {
  expect(
    [72, 81, 76].map((bottom) =>
      mascotBodyFloor(picture([[25, 10, 75, bottom]]), 100, 100),
    ),
  ).toEqual([0.72, 0.81, 0.76]);
});

test("horizontal anchor follows the chest, not a turning head", () => {
  const a = mascotBodyAnchor(
    picture([
      [10, 10, 70, 55],
      [30, 60, 70, 85],
    ]),
    100,
    100,
  );
  const b = mascotBodyAnchor(
    picture([
      [30, 10, 90, 55],
      [30, 60, 70, 85],
    ]),
    100,
    100,
  );
  expect(a.center).toBe(0.5);
  expect(b.center).toBe(0.5);
  const shifted = mascotBodyAnchor(
    picture([
      [20, 10, 80, 55],
      [40, 60, 80, 85],
    ]),
    100,
    100,
  );
  expect(shifted.center).toBe(0.6);
});

test("extra transparent headroom does not change the measured chest", () => {
  const compact = picture([
    [20, 10, 80, 75],
    [30, 75, 70, 85],
  ]);
  const padded = new Uint8ClampedArray(160 * 160 * 4);
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 100; x++)
      padded[((y + 30) * 160 + x + 30) * 4 + 3] =
        compact[(y * 100 + x) * 4 + 3];
  const a = mascotBodyAnchor(compact, 100, 100);
  const b = mascotBodyAnchor(padded, 160, 160);
  expect(a.width * 100).toBe(40);
  expect(b.width * 160).toBe(40);
  expect(b.center * 160 - a.center * 100).toBe(30);
  expect(b.floor * 160 - a.floor * 100).toBe(30);
});
