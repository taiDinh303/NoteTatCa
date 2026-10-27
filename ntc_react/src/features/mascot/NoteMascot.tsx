import { MascotPage } from "./MascotPage";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./MascotPage.css";
import { useMascotPreference } from "./mascotPreference";
import { useAccountMascot } from "./generatedMascot";
import { useAuth } from "../../shared/hooks";
import { useMascotFloor } from "./mascotFloor";

/*
 * NoteMascot — the bunny that sits on top of a note card.
 * Uses the sprite-sheet mascot (port of nilbuild/page-mascot, MIT). It follows
 * the cursor and blinks/squashes when poked.
 *
 * The bunny always perches on the top-right edge of its card.
 * - It is only rendered outside the editor, on the notes list page.
 *
 * No chat logic — decorative only.
 */
export function NoteMascot({ size = 88 }: { size?: number }) {
  useLanguage();
  const { enabled, character, customImage } = useMascotPreference();
  const actor = useAuth();
  const { images: generated } = useAccountMascot(
    actor.status === "guest" ? undefined : actor.session?.userId,
    enabled && character === "generated",
  );
  const preset =
    character === "custom" || character === "generated" ? "bunny" : character;
  const directions =
    character === "generated" && generated
      ? generated.directions
      : `/mascots/${preset}-directions.webp`;
  const reactions =
    character === "generated" && generated
      ? generated.reactions
      : `/mascots/${preset}-reactions.webp`;
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
        height: size * (character === "custom" ? 1 : (floor ?? 1)),
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
        />
      )}
    </div>
  );
}
