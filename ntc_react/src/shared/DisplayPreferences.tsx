import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, ZoomIn } from "lucide-react";

const levels = [75, 90, 100, 110, 125, 150] as const;
const storageKey = "ntc.interface.zoom.v1";
const ZoomContext = createContext<{
  percent: number;
  setPercent: (value: number) => void;
}>({
  percent: 100,
  setPercent: () => {},
});

export function DisplayPreferences({ children }: { children: ReactNode }) {
  const [percent, setPercent] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return levels.some((level) => level === saved) ? saved : 100;
    } catch {
      return 100;
    }
  });
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--interface-scale",
      String(percent / 100),
    );
    try {
      localStorage.setItem(storageKey, String(percent));
    } catch {
      // Display preferences must also work with browser storage disabled.
    }
  }, [percent]);
  return (
    <ZoomContext.Provider value={{ percent, setPercent }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function InterfaceZoom() {
  const { percent, setPercent } = useContext(ZoomContext);
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="zoom-trigger"
          aria-label={`Interface zoom: ${percent}%`}
          title="Interface zoom"
        >
          <ZoomIn size={16} aria-hidden="true" />
          <span>{percent}%</span>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="dropdown zoom-menu"
          align="end"
          sideOffset={8}
          collisionPadding={12}
        >
          <Dropdown.Label className="zoom-menu-label">
            Interface zoom
          </Dropdown.Label>
          <Dropdown.RadioGroup
            value={String(percent)}
            onValueChange={(value) => setPercent(Number(value))}
          >
            {levels.map((level) => (
              <Dropdown.RadioItem
                key={level}
                value={String(level)}
                className="dropdown-item zoom-option"
              >
                <span>
                  {level}%{level === 100 ? " · Default" : ""}
                </span>
                <Dropdown.ItemIndicator>
                  <Check size={16} aria-hidden="true" />
                </Dropdown.ItemIndicator>
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
