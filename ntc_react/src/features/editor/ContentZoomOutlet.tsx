import { useCallback, useContext, useId, useState } from "react";
import { ZoomIn } from "lucide-react";
import { IconButton } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import { ContentZoomSession } from "./contentZoomSession";

export default function ContentZoomOutlet() {
  useLanguage();
  const session = useContext(ContentZoomSession);
  const setTarget = session?.setTarget;
  const attach = useCallback(
    (node: HTMLDivElement | null) => setTarget?.(node),
    [setTarget],
  );
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  if (!session) return null;
  return (
    <div className="content-zoom-inline">
      <IconButton
        icon={ZoomIn}
        label={tr("Content zoom")}
        active={expanded}
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
      />
      <div
        id={id}
        className="content-zoom-outlet"
        data-expanded={expanded}
        ref={attach}
      />
    </div>
  );
}
