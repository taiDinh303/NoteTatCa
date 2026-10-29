import { expect, test } from "vitest";
import { mascotArtScale, mascotDirectionFrame } from "./mascotGeometry";

test("corrects opposite horizontal robot gaze without flipping their artwork", () => {
  for (const name of ["gearbot", "knight"])
    expect(
      Array.from({ length: 9 }, (_, i) =>
        mascotDirectionFrame(
          `/mascots/ntc-v6/${name}-directions.webp?rev=x`,
          i,
        ),
      ),
    ).toEqual([2, 1, 0, 5, 4, 3, 8, 7, 6]);
  expect(mascotDirectionFrame("/mascots/ntc-v6/fox-directions.webp", 3)).toBe(
    3,
  );
  expect(mascotDirectionFrame("data:image/png;base64,example", 3)).toBe(3);
});
test("calibrates equally on both axes and preserves generated artwork sizing", () => {
  expect(mascotArtScale("/mascots/ntc-v6/bunny-directions.webp")).toBeLessThan(
    mascotArtScale("/mascots/ntc-v6/fox-directions.webp"),
  );
  expect(
    mascotArtScale("/mascots/ntc-v6/hijabi-directions.webp"),
  ).toBeGreaterThan(mascotArtScale("/mascots/ntc-v6/fox-directions.webp"));
  expect(mascotArtScale("data:image/png;base64,example")).toBe(1);
});
