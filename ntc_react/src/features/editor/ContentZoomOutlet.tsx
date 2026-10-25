import { useCallback, useContext, useId, useState } from "react";
import { ZoomIn } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { notePalette } from "../../domain/color";
import { IconButton } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import { ContentZoomSession } from "./contentZoomSession";

export default function ContentZoomOutlet({
  popup = false,
  color,
}: {
  popup?: boolean;
  color?: string;
}) {
  useLanguage();
  const session = useContext(ContentZoomSession);
  const setTarget = session?.setTarget;
  const setHandTarget = session?.setHandTarget;
  const attachHand = useCallback(
    (node: HTMLDivElement | null) => setHandTarget?.(node),
    [setHandTarget],
  );
  const attach = useCallback(
    (node: HTMLDivElement | null) => setTarget?.(node),
    [setTarget],
  );
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const [boundary, setBoundary] = useState<HTMLElement | null>(null);
  const attachRoot = useCallback((node: HTMLDivElement | null) => {
    setBoundary(node?.closest<HTMLElement>(".note-editor-modal") ?? null);
  }, []);
  if (!session) return null;
  if (popup)
    return (
      <Popover.Root open={expanded} onOpenChange={setExpanded}>
        <div className="content-zoom-inline" ref={attachRoot}>
          <Popover.Trigger asChild>
            <IconButton
              icon={ZoomIn}
              label={tr("Content zoom")}
              active={expanded}
            />
          </Popover.Trigger>
          <div className="content-pan-toggle" ref={attachHand} />
        </div>
        <Popover.Portal>
          <Popover.Content
            className="content-zoom-menu"
            side="top"
            align="end"
            sideOffset={8}
            collisionBoundary={boundary}
            collisionPadding={8}
            aria-label={tr("Content zoom")}
            style={{
              ...notePalette(color),
              backgroundColor: color || undefined,
            }}
            onInteractOutside={(event) => {
              const target = event.detail.originalEvent.target;
              if (
                target instanceof Element &&
                target.closest(".content-zoom-menu")
              )
                event.preventDefault();
            }}
          >
            <div className="content-zoom-outlet" ref={attach} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  return (
    <div className="content-zoom-inline">
      <div className="content-pan-toggle" ref={attachHand} />
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
