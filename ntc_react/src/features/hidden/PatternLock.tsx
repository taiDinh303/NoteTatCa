import { useRef, useLayoutEffect } from "react";
import { t as tr } from "../../shared/i18n";
export function PatternLock({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const current = useRef(value);
  useLayoutEffect(() => {
    current.current = value;
  }, [value]);
  function add(n: number, start = false) {
    let next = start ? "" : current.current;
    if (next.includes(String(n))) return;
    const prev = Number(next.at(-1));
    if (next.length) {
      const dx = Math.abs((prev % 3) - (n % 3)),
        dy = Math.abs(Math.floor(prev / 3) - Math.floor(n / 3));
      if (
        (dx === 2 && dy === 0) ||
        (dx === 0 && dy === 2) ||
        (dx === 2 && dy === 2)
      ) {
        const middle = String((prev + n) / 2);
        if (!next.includes(middle)) next += middle;
      }
    }
    next += String(n);
    current.current = next;
    onChange(next);
  }
  return (
    <div
      className="vault-pattern"
      role="group"
      aria-label={tr("3 by 3 pattern")}
      ref={root}
      onPointerDown={(e) => {
        if (disabled) return;
        const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
          "[data-point]",
        );
        if (!target) return;
        e.preventDefault();
        drawing.current = true;
        root.current?.setPointerCapture(e.pointerId);
        add(Number(target.dataset.point), true);
      }}
      onPointerMove={(e) => {
        if (!drawing.current || disabled) return;
        const target = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLButtonElement>("[data-point]");
        if (target && root.current?.contains(target))
          add(Number(target.dataset.point));
      }}
      onPointerUp={() => {
        drawing.current = false;
      }}
      onPointerCancel={() => {
        drawing.current = false;
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 300 300">
        <polyline
          points={[...value]
            .map((c) => {
              const n = Number(c);
              return `${50 + (n % 3) * 100},${50 + Math.floor(n / 3) * 100}`;
            })
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
      {Array.from({ length: 9 }, (_, n) => (
        <button
          key={n}
          type="button"
          data-point={n}
          aria-label={tr("Point {0}", n + 1)}
          aria-pressed={value.includes(String(n))}
          disabled={disabled}
          onClick={(e) => {
            if (e.detail === 0) add(n);
          }}
        >
          <span />
        </button>
      ))}
    </div>
  );
}
