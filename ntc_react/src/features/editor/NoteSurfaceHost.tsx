import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/ui";
import { t as tr } from "../../shared/i18n";
import "./NoteSurfaceHost.css";
import { NoteSurfaceVisibility } from "./noteSurfaceVisibility";

type SurfaceProps = ComponentProps<typeof Modal>;
type Frame = Pick<SurfaceProps, "title" | "className" | "style" | "onClose">;
type Registration = Frame & { session: string; token: symbol };
const Surface = createContext<{
  container: HTMLDivElement | null;
  session: string;
  configure: (frame: Registration) => void;
  release: (token: symbol) => void;
} | null>(null);

// One persistent panel that all note sessions render into. No backdrop, no
// focus trap, no scroll lock — the notes list stays visible and interactive.
// The panel is always in the DOM (hidden when no note is open), so editor
// chunks are warm by the time the user taps a card.
export function NoteSurfaceHost({ open, session, onClose, children }: {
  open: boolean; session: string; onClose: () => void; children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [registration, setFrame] = useState<Registration>();
  const frame = registration?.session === session ? registration : undefined;
  const visible = open && !!frame;
  const panel = useRef<HTMLDivElement>(null);
  const configure = useCallback((value: Registration) => setFrame(value), []);
  const release = useCallback((token: symbol) => setFrame(current => current?.token === token ? undefined : current), []);
  const context = useMemo(() => ({ container, session, configure, release }), [container, session, configure, release]);
  useLayoutEffect(() => {
    if (!visible || !panel.current) return;
    panel.current.scrollTop = 0;
    panel.current.focus({ preventScroll: true });
  }, [visible]);
  return <Surface.Provider value={context}>
    <NoteSurfaceVisibility.Provider value={visible}>
    {children}
    <div
      ref={panel}
      className={`modal wide note-surface-ready ${frame?.className ?? "note-editor-modal"}`}
      style={frame?.style}
      hidden={!visible}
      aria-hidden={!visible || undefined}
      aria-label={typeof frame?.title === "string" ? frame.title : tr("Open note")}
      role="dialog"
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        // Let Escape dismiss an open tool popover first, never the note
        // beneath it.
        if (panel.current?.querySelector(".note-tool-popover")) return;
        event.preventDefault();
        if (visible) (frame?.onClose ?? onClose)();
      }}
    >
      <div ref={setContainer} className="note-surface-slot" />
    </div>
    </NoteSurfaceVisibility.Provider>
  </Surface.Provider>;
}

export function NoteSurfaceFrame(props: SurfaceProps) {
  const host = useContext(Surface);
  const token = useRef(Symbol());
  const { title, className, style, onClose } = props;
  useLayoutEffect(() => {
    host?.configure({ title, className, style, onClose, session: host.session, token: token.current });
  }, [host, title, className, style, onClose]);
  useLayoutEffect(() => {
    const current = token.current;
    return () => host?.release(current);
  }, [host]);
  if (!host) return <Modal {...props} />;
  return host.container ? createPortal(props.children, host.container) : null;
}
