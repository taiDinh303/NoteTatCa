import { describe, expect, it } from "vitest";
import { desktopGridCardWidth, desktopNoteWidth } from "./workspaceGrid";

describe("fixed grid anchor calibration with protected right inset", () => {
  for (const fullWidth of [924, 1810, 1820, 3340]) {
    it(`keeps every zoom inside the normal margins at ${fullWidth}px`, () => {
      const nominal = desktopNoteWidth(fullWidth);
      const pitch = nominal + 20;
      const columns = Math.round((fullWidth + 20) / pitch);
      const card = desktopGridCardWidth(fullWidth);
      [fullWidth, fullWidth - pitch].forEach((width, index) => {
        for (let percent = 50; percent <= 150; percent++) {
          const scale = percent / 100;
          const count = Math.floor(((width + 0.01) / scale + 20) / (card + 20));
          const used = scale * (count * card + (count - 1) * 20);
          expect(used).toBeLessThanOrEqual(width + 0.01);
          expect(used + scale * (card + 20)).toBeGreaterThan(width);
          if (percent === 50 || percent === 100)
            expect(count).toBe((columns - index) / scale);
        }
      });
      expect(desktopGridCardWidth(fullWidth)).toBe(card);
    });
  }
});