import { MascotPage } from "./MascotPage";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./MascotPage.css";
import { useMascotPreference } from "./mascotPreference";

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
  if (!enabled) return null;
  return (
    <div className="note-mascot note-mascot-corner" data-mascot-anchor="corner">
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
          directions={`/mascots/${character === "custom" ? "bunny" : character}-directions.webp`}
          reactions={`/mascots/${character === "custom" ? "bunny" : character}-reactions.webp`}
          size={size}
          label={tr("mascot")}
          className="note-mascot-sprite"
          disableSquash
        />
      )}
    </div>
  );
}
