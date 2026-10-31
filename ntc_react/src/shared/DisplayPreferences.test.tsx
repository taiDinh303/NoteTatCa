// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DisplayPreferences } from "./DisplayPreferences";
import { useDisplayZoom } from "./displayZoom";
import { useEffect } from "react";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.style.removeProperty("--interface-scale");
});

it("paints gesture frames without writing storage or rerendering zoom subscribers until settled", () => {
  vi.useFakeTimers();
  let renders = 0;
  function Consumer() {
    const zoom = useDisplayZoom();
    renders++;
    return <output data-notes-zoom>{zoom.percent}</output>;
  }
  render(
    <DisplayPreferences>
      <Consumer />
    </DisplayPreferences>,
  );
  const write = vi.spyOn(Storage.prototype, "setItem");
  for (let i = 0; i < 20; i++)
    act(() => {
      screen.getByText("100", { selector: "output" }).dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -5,
        }),
      );
      vi.advanceTimersByTime(17);
    });
  expect(
    document.documentElement.style.getPropertyValue("--interface-scale"),
  ).toBe("");
  expect(screen.getByRole("status", { name: "Notes zoom" })).toBeTruthy();
  expect(write).not.toHaveBeenCalled();
  expect(renders).toBe(1);
  act(() => vi.advanceTimersByTime(1000));
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("113");
  expect(renders).toBe(2);
});

it("leaves content gestures and normal scroll events to their own viewport", () => {
  vi.useFakeTimers();
  render(
    <DisplayPreferences>
      <div data-content-zoom data-testid="content">
        Note
      </div>
    </DisplayPreferences>,
  );
  const wheel = new WheelEvent("wheel", {
    cancelable: true,
    bubbles: true,
    ctrlKey: true,
    deltaY: -200,
  });
  act(() => {
    screen.getByTestId("content").dispatchEvent(wheel);
    vi.advanceTimersByTime(200);
  });
  expect(wheel.defaultPrevented).toBe(false);
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("100");
  const scroll = new WheelEvent("wheel", { cancelable: true, deltaY: 100 });
  act(() => window.dispatchEvent(scroll));
  expect(scroll.defaultPrevented).toBe(false);
});

it("cancels pending gesture work when unmounted and still persists explicit changes immediately", () => {
  vi.useFakeTimers();
  function Consumer() {
    const zoom = useDisplayZoom();
    return (
      <button data-notes-zoom onClick={() => zoom.change(120)}>
        Change
      </button>
    );
  }
  const view = render(
    <DisplayPreferences>
      <Consumer />
    </DisplayPreferences>,
  );
  act(() => screen.getByRole("button", { name: "Change" }).click());
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("120");
  act(() =>
    screen.getByRole("button", { name: "Change" }).dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -100,
      }),
    ),
  );
  view.unmount();
  act(() => vi.advanceTimersByTime(1500));
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("120");
});

it("eases coarse wheel deltas over multiple frames, caps each impulse, and ignores chrome", () => {
  vi.useFakeTimers();
  const frames: number[] = [];
  const settlements: number[] = [];
  function Consumer() {
    const { subscribe } = useDisplayZoom();
    useEffect(
      () =>
        subscribe((value, settled) => {
          frames.push(value);
          if (settled) settlements.push(value);
        }),
      [subscribe],
    );
    return (
      <>
        <div data-notes-zoom data-testid="list" />
        <button>Header</button>
      </>
    );
  }
  render(
    <DisplayPreferences>
      <Consumer />
    </DisplayPreferences>,
  );
  const wheel = () =>
    new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -10000,
    });
  act(() =>
    screen.getByRole("button", { name: "Header" }).dispatchEvent(wheel()),
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(frames).toEqual([1]);
  act(() => screen.getByTestId("list").dispatchEvent(wheel()));
  act(() => vi.advanceTimersByTime(17));
  expect(frames.at(-1)).toBeGreaterThan(1);
  expect(frames.at(-1)).toBeLessThan(1.04);
  expect(settlements).toEqual([1]);
  act(() => vi.advanceTimersByTime(1000));
  expect(frames.length).toBeGreaterThan(15);
  expect(frames.at(-1)).toBeCloseTo(Math.exp(80 * 0.0012), 5);
  expect(settlements).toHaveLength(2);
  expect(settlements.at(-1)).toBe(frames.at(-1));
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("110");
});
