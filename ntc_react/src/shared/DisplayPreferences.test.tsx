// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DisplayPreferences } from "./DisplayPreferences";
import { useDisplayZoom } from "./displayZoom";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.style.removeProperty("--interface-scale");
});

it("paints gesture frames without writing storage or rerendering zoom subscribers until settled", () => {
  vi.useFakeTimers();
  let renders = 0;
  function Consumer() {
    const zoom = useDisplayZoom();
    renders++;
    return <output>{zoom.percent}</output>;
  }
  render(
    <DisplayPreferences>
      <Consumer />
    </DisplayPreferences>,
  );
  const write = vi.spyOn(Storage.prototype, "setItem");
  for (let i = 0; i < 20; i++)
    act(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", {
          cancelable: true,
          ctrlKey: true,
          deltaY: -5,
        }),
      );
      vi.advanceTimersByTime(17);
    });
  expect(
    Number(
      document.documentElement.style.getPropertyValue("--interface-scale"),
    ),
  ).toBeGreaterThan(1.09);
  expect(
    screen.getByRole("status", { name: "Interface zoom" }).textContent,
  ).toBe("111%");
  expect(write).not.toHaveBeenCalled();
  expect(renders).toBe(1);
  act(() => vi.advanceTimersByTime(161));
  expect(
    screen.getByRole("status", { name: "Interface zoom" }).textContent,
  ).toBe("111%");
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("111");
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
    return <button onClick={() => zoom.change(120)}>Change</button>;
  }
  const view = render(
    <DisplayPreferences>
      <Consumer />
    </DisplayPreferences>,
  );
  act(() => screen.getByRole("button", { name: "Change" }).click());
  expect(localStorage.getItem("ntc.interface.zoom.v1")).toBe("120");
  act(() =>
    window.dispatchEvent(
      new WheelEvent("wheel", {
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
