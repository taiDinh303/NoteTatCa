import { describe, expect, it } from "vitest";
import { desktopGridCardWidth, desktopNoteWidth } from "./workspaceGrid";

describe("fixed grid anchor calibration", () => {
  for (const fullWidth of [924, 1810, 1820, 3340]) {
    it(`reduces the worst anchor remainder at ${fullWidth}px without stretching gaps`, () => {
      const nominal = desktopNoteWidth(fullWidth);
      const pitch = nominal + 20;
      const columns = Math.round((fullWidth + 20) / pitch);
      const widths = [fullWidth, fullWidth - pitch];
      const fit = (width: number, count: number, scale: number) =>
        ((width + 38) / scale - (count - 1) * 20) / count;
      const previous = Math.min(nominal,
        fit(widths[0], columns, 1.05), fit(widths[1], columns - 1, 1.05),
        fit(widths[0], columns * 2, 0.53), fit(widths[1], (columns - 1) * 2, 0.53));
      const worst = (card: number) => Math.max(...widths.flatMap(width =>
        [0.5, 1, 1.5].map(scale => {
          const count = Math.floor(((width + (scale <= 1 ? 38 : 0) + 1) / scale + 20) / (card + 20));
          return Math.abs(width - scale * (count * card + (count - 1) * 20));
        })));
      const card = desktopGridCardWidth(fullWidth, 50);
      expect(worst(card)).toBeLessThan(worst(previous));
      widths.forEach((width, index) => {
        for (const scale of [0.5, 1]) {
          expect(Math.floor(((width + 39) / scale + 20) / (card + 20)))
            .toBe((columns - index) / scale);
        }
      });
      expect(desktopGridCardWidth(fullWidth, 50)).toBe(card);
    });
  }
});
