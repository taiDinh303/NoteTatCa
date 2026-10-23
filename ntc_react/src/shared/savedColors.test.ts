// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { normalizeHexColor, useSavedColors } from "./savedColors";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it("normalizes hex values and rejects invalid input", () => {
  expect(normalizeHexColor(" #aBc ")).toBe("#AABBCC");
  expect(normalizeHexColor("1122cc")).toBe("#1122CC");
  for (const input of ["", "red", "#12345", "#GG0000", "url(test)"])
    expect(normalizeHexColor(input)).toBeNull();
});

it("deduplicates colors, persists them and removes saved entries", () => {
  const { result, unmount } = renderHook(() => useSavedColors("first"));
  act(() => result.current.save("#abc"));
  act(() => result.current.save("#AABBCC"));
  expect(result.current.colors).toEqual(["#AABBCC"]);
  unmount();
  const reopened = renderHook(() => useSavedColors("first"));
  expect(reopened.result.current.colors).toEqual(["#AABBCC"]);
  act(() => reopened.result.current.remove("#AABBCC"));
  expect(
    JSON.parse(localStorage.getItem("ntc.saved-note-colors.v1:first")!),
  ).toEqual([]);
});

it("keeps accounts separate and ignores malformed saved data", () => {
  localStorage.setItem(
    "ntc.saved-note-colors.v1:first",
    JSON.stringify(["#abc", "invalid", 42, "#AABBCC"]),
  );
  localStorage.setItem("ntc.saved-note-colors.v1:second", "not json");
  const first = renderHook(() => useSavedColors("first"));
  const second = renderHook(() => useSavedColors("second"));
  expect(first.result.current.colors).toEqual(["#AABBCC"]);
  expect(second.result.current.colors).toEqual([]);
});

it("remains usable if storage writes are blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const { result } = renderHook(() => useSavedColors("first"));
  expect(() => act(() => result.current.save("#fff"))).not.toThrow();
  expect(result.current.colors).toEqual(["#FFFFFF"]);
});
