import { expect, test } from "vitest";
import { mascotBodyFloor } from "./mascotBodyFloor";
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
