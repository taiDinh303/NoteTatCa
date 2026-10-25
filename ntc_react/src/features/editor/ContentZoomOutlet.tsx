import { useCallback, useContext } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ZoomIn } from "lucide-react";
import { IconButton } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import { ContentZoomSession } from "./contentZoomSession";

export default function ContentZoomOutlet({
  popup = false,
}: {
  popup?: boolean;
}) {
  useLanguage();
  const session = useContext(ContentZoomSession);
  const setTarget = session?.setTarget;
  const attach = useCallback(
    (node: HTMLDivElement | null) => setTarget?.(node),
    [setTarget],
  );
  if (!session) return null;
  const outlet = <div className="content-zoom-outlet" ref={attach} />;
  if (!popup) return outlet;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton icon={ZoomIn} label={tr("Content zoom")} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="content-zoom-menu"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={tr("Content zoom")}
          onInteractOutside={(event) => {
            // The controls are portaled from the content viewport into this panel.
            // Radix's React-tree check otherwise mistakes their events for outside clicks.
            const target = event.detail.originalEvent.target;
            if (
              target instanceof Element &&
              target.closest(".content-zoom-menu")
            )
              event.preventDefault();
          }}
        >
          {outlet}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
