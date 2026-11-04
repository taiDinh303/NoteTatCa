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
const Surface = createContext<{
  container: HTMLDivElement | null;
  configure: (frame: Frame) => void;
} | null>(null);

// One empty, inaccessible frame is prepared on workspace entry. Only the
// selected note's content/session is mounted; no editor per list card.
export function NoteSurfaceHost({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState<Frame>();
  const dialog = useRef<HTMLDivElement>(null);
  const configure = useCallback((value: Frame) => setFrame(value), []);
  const context = useMemo(() => ({ container, configure }), [container, configure]);
  useLayoutEffect(() => {
    if (!open || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const restore = hideOthers(dialog.current);
    dialog.current.focus({ preventScroll: true });
    return () => { restore(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);
  return <Surface.Provider value={context}>
    {children}
    <Dialog.Root open={open} modal={false} onOpenChange={value => { if (!value) (frame?.onClose ?? onClose)(); }}>
      <Dialog.Portal forceMount>
        <div className="modal-overlay note-surface-backdrop" hidden={!open} aria-hidden="true" />
        <RemoveScroll enabled={open} forwardProps>
          <FocusScope asChild trapped={open} loop={open} onMountAutoFocus={event => event.preventDefault()} onUnmountAutoFocus={event => event.preventDefault()}>
            <Dialog.Content forceMount ref={dialog}
              hidden={!open} aria-hidden={!open || undefined} aria-modal={open || undefined}
              className={`modal wide note-surface-ready ${frame?.className ?? "note-editor-modal"}`}
              style={frame?.style}
              onOpenAutoFocus={event => event.preventDefault()}
              onCloseAutoFocus={event => event.preventDefault()}
              onInteractOutside={event => event.preventDefault()}
              onEscapeKeyDown={event => { event.preventDefault(); if (open) (frame?.onClose ?? onClose)(); }}>
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
  const { title, className, style, onClose } = props;
  useLayoutEffect(() => {
    host?.configure({ title, className, style, onClose });
  }, [host, title, className, style, onClose]);
  if (!host) return <Modal {...props} />;
  return host.container ? createPortal(props.children, host.container) : null;
}
