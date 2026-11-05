import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const opened = "ntc-note-tool-open";
export default function NoteToolPanel({ title, onClose, children, className = "" }: {
  title: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; });
  const [host] = useState(() => document.querySelector<HTMLElement>(".note-editor-modal"));
  useLayoutEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const panelElement = ref.current;
    document.dispatchEvent(new Event(opened));
    const dismiss = () => close.current();
    const hasNestedDialog = () => [...document.querySelectorAll(".modal:not([hidden]):not([data-state='closed'])")].some(dialog => dialog !== host);
    const outside = (event: PointerEvent) => {
      if (hasNestedDialog()) return;
      const target = event.target as Element;
      if (!ref.current?.contains(target) && !target.closest("[data-note-tool-trigger]")) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (hasNestedDialog()) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(); }
    };
    const measure = () => {
      const footer = host?.querySelector<HTMLElement>(".editor-footer");
      if (ref.current && footer) ref.current.style.bottom = `${footer.offsetHeight + 8}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (host) observer.observe(host);
    document.addEventListener(opened, dismiss);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      observer.disconnect();
      document.removeEventListener(opened, dismiss);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
      if (trigger?.isConnected && (document.activeElement === document.body || panelElement?.contains(document.activeElement)))
        trigger.focus({ preventScroll: true });
    };
  }, [host]);
  const panel = <div ref={ref} className={`note-tool-popover ${className}`} role="dialog" aria-label={title}>
    <div className="note-tool-heading">{title}</div>
    <div className="note-tool-body">{children}</div>
  </div>;
  return host ? createPortal(panel, host) : panel;
}
