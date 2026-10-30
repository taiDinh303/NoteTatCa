import { MascotPage } from "./MascotPage";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./MascotPage.css";
import { mascotPresetSources, useMascotPreference } from "./mascotPreference";
import { useAccountMascot } from "./generatedMascot";
import { useAuth } from "../../shared/hooks";
import { useMascotFloor } from "./mascotFloor";
import { useDesktopMascots } from "./desktopMascots";

/*
 * NoteMascot — the selected companion sitting on top of a note card.
 * Uses original project sprites and the page-mascot runtime (MIT).
 * Follows the cursor and changes expression when poked, with a fixed torso.
 *
 * The companion always perches on the top-right edge of its card.
 * The same perch is used by list cards and the opened note frame.
 *
 * No chat logic — decorative only.
 */
export function NoteMascot({ size = 88 }: { size?: number }) {
  const available = useDesktopMascots();
  return available ? <DesktopNoteMascot size={size} /> : null;
}

function DesktopNoteMascot({ size }: { size: number }) {
  useLanguage();
  const { enabled, character, customImage } = useMascotPreference();
  const actor = useAuth();
  const { images: generated } = useAccountMascot(
    actor.status === "guest" ? undefined : actor.session?.userId,
    enabled && character === "generated",
  );
  const preset =
    character === "custom" || character === "generated" ? "bunny" : character;
  const sources = mascotPresetSources(preset);
  const directions =
    character === "generated" && generated
      ? generated.directions
      : sources.directions;
  const reactions =
    character === "generated" && generated
      ? generated.reactions
      : sources.reactions;
  const floor = useMascotFloor(
    directions,
    reactions,
    enabled && character !== "custom",
  );
  if (!enabled) return null;
  return (
    <div
      className="note-mascot note-mascot-corner"
      data-mascot-anchor="corner"
      style={{
        width: size,
        height: size * (character === "custom" ? 1 : (floor?.max ?? 1)),
        visibility:
          character !== "custom" && floor === undefined ? "hidden" : undefined,
      }}
    >
      {character === "custom" && customImage ? (
        <img
          src={customImage}
          alt={tr("Custom mascot")}
          width={size}
          height={size}
          className="note-mascot-custom"
        />
      ) : (
        <MascotPage
          key={character}
          directions={directions}
          reactions={reactions}
          size={size}
          label={tr("mascot")}
          className="note-mascot-sprite"
          disableSquash
          floors={floor}
        />
      )}
    </div>
  );
}
