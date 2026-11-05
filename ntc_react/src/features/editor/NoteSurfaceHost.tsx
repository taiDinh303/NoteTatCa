import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { hideOthers } from "aria-hidden";
import { RemoveScroll } from "react-remove-scroll";
import { Modal } from "../../shared/ui";
import { t as tr } from "../../shared/i18n";
import "./NoteSurfaceHost.css";

type SurfaceProps = ComponentProps<typeof Modal>;
type Frame = Pick<SurfaceProps, "title" | "className" | "style" | "onClose">;
type Registration = Frame & { session: string; token: symbol };
const Surface = createContext<{
  container: HTMLDivElement | null;
  session: string;
  configure: (frame: Registration) => void;
  release: (token: symbol) => void;
} | null>(null);

// One empty, inaccessible frame is prepared on workspace entry. Only the
// selected note's content/session is mounted; no editor per list card.
export function NoteSurfaceHost({ open, session, onClose, children }: {
  open: boolean; session: string; onClose: () => void; children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [registration, setFrame] = useState<Registration>();
  const frame = registration?.session === session ? registration : undefined;
  const visible = open && !!frame;
  const dialog = useRef<HTMLDivElement>(null);
  const configure = useCallback((value: Registration) => setFrame(value), []);
  const release = useCallback((token: symbol) => setFrame(current => current?.token === token ? undefined : current), []);
  const context = useMemo(() => ({ container, session, configure, release }), [container, session, configure, release]);
  useLayoutEffect(() => {
    if (!visible || !dialog.current) return;
    dialog.current.scrollTop = 0;
    const previous = document.activeElement as HTMLElement | null;
    const restore = hideOthers(dialog.current);
    dialog.current.focus({ preventScroll: true });
    return () => { restore(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [visible]);
  return <Surface.Provider value={context}>
    {children}
    <Dialog.Root open={visible} modal={false} onOpenChange={value => { if (!value) (frame?.onClose ?? onClose)(); }}>
      <Dialog.Portal forceMount>
        <div className="modal-overlay note-surface-backdrop" hidden={!visible} aria-hidden="true" />
        <RemoveScroll enabled={visible} forwardProps>
          <FocusScope asChild trapped={visible} loop={visible} onMountAutoFocus={event => event.preventDefault()} onUnmountAutoFocus={event => event.preventDefault()}>
            <Dialog.Content forceMount ref={dialog}
              aria-label={typeof frame?.title === "string" ? frame.title : tr("Open note")}
              hidden={!visible} aria-hidden={!visible || undefined} aria-modal={visible || undefined}
              className={`modal wide note-surface-ready ${frame?.className ?? "note-editor-modal"}`}
              style={frame?.style}
              onOpenAutoFocus={event => event.preventDefault()}
              onCloseAutoFocus={event => event.preventDefault()}
              onInteractOutside={event => event.preventDefault()}
              onEscapeKeyDown={event => {
                if (event.defaultPrevented) return;
                event.preventDefault();
                // This persistent listener predates tool-panel listeners.
                // Let Escape dismiss the tool first, never the note beneath it.
                if (dialog.current?.querySelector(".note-tool-popover")) return;
                if (visible) (frame?.onClose ?? onClose)();
              }}>
              <div className="modal-title-hidden"><Dialog.Title>{frame?.title ?? tr("Open note")}</Dialog.Title><Dialog.Description>{frame?.title ?? tr("Open note")}</Dialog.Description></div>
              <div ref={setContainer} className="note-surface-slot" />
            </Dialog.Content>
          </FocusScope>
        </RemoveScroll>
      </Dialog.Portal>
    </Dialog.Root>
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
