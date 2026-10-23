// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, cleanup } from "@testing-library/react";
import { useState } from "react";
import { createElement } from "react";
import { initializeLanguage, setLanguage, t, useLanguage } from "./i18n";
import { messages } from "./messages";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  setLanguage("en");
});

describe("language preferences", () => {
  it("keeps selected language usable when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setLanguage("vi");
    expect(t("Settings")).toBe("Cài đặt");
    expect(document.documentElement.lang).toBe("vi");
  });

  it("rejects unsupported stored language codes", () => {
    localStorage.setItem("ntc.language.v1", "unsupported");
    initializeLanguage();
    expect(t("Settings")).toBe("Settings");
    expect(document.documentElement.lang).toBe("en");
  });

  it("preserves interpolated user text in every language", () => {
    const title = "Settings Privacy 中文 日本語";
    for (const language of ["vi", "en", "zh", "ja"] as const) {
      setLanguage(language);
      expect(t("Open {0}", title)).toContain(title);
    }
  });

  it("updates a subscribed component without resetting its local state", () => {
    function StatefulView() {
      useLanguage();
      const [draft] = useState("untranslated draft");
      return createElement("p", null, t("Settings"), " · ", draft);
    }
    render(createElement(StatefulView));
    act(() => setLanguage("ja"));
    expect(screen.getByText("設定 · untranslated draft")).toBeTruthy();
  });

  it("provides complete values and matching interpolation fields in the catalog", () => {
    function fields(value: string) {
      return [...value.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();
    }
    for (const [source, translations] of Object.entries(messages)) {
      expect(translations, source).toHaveLength(3);
      for (const translation of translations) {
        expect(translation.trim(), source).not.toBe("");
        expect(fields(translation), source).toEqual(fields(source));
      }
    }
  });
});
