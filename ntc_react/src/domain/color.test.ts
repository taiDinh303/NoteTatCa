import { describe, expect, it } from "vitest";
import { labelTint, notePalette } from "./color";

describe("labelTint", () => {
  it("tints a six-digit hex with light alpha", () => {
    expect(labelTint("#8c9d90")).toBe("#8c9d901F");
  });

  it("expands three-digit hex before tinting", () => {
    expect(labelTint("#f00")).toBe("#ff00001F");
  });

  it("keeps eight-digit hex color channels intact", () => {
    expect(labelTint("#ff0000cc")).toBe("#ff00001F");
  });

  it("returns null for missing or invalid colors", () => {
    expect(labelTint()).toBeNull();
    expect(labelTint(null)).toBeNull();
    expect(labelTint("#12345")).toBeNull();
    expect(labelTint("blue")).toBeNull();
  });
});

describe("notePalette", () => {
  it("picks dark foreground on light notes", () => {
    expect(notePalette("#eaf6ff")?.color).toBe("#202824");
  });

  it("picks light foreground on dark notes", () => {
    expect(notePalette("#101820")?.color).toBe("#ffffff");
  });

  it("returns undefined for invalid input", () => {
    expect(notePalette(null)).toBeUndefined();
    expect(notePalette("#xyz")).toBeUndefined();
  });
});
