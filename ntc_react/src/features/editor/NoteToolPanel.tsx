import type { ReactNode } from "react";
import { useMobileLayout } from "../../shared/useMobileLayout";
import { Modal } from "../../shared/ui";

export default function NoteToolPanel({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const mobile = useMobileLayout();
  return mobile ? <Modal open title={title} onClose={onClose} className="note-tool-sheet" dismissOnOutside>
    <div className="modal-body">{children}</div>
  </Modal> : <div className="label-chooser">{children}</div>;
}
