import { MascotPage } from "./MascotPage";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./MascotPage.css";

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
export function NoteMascot({
  size = 88,
}: {
  size?: number;
}) {
  useLanguage();
  return (
    <div
      className="note-mascot note-mascot-corner"
      data-mascot-anchor="corner"
    >
      <MascotPage
        directions="/mascots/bunny-directions.png"
        reactions="/mascots/bunny-reactions.png"
        size={size}
        label={tr("mascot")}
        className="note-mascot-sprite"
        fixedBody
      />
    </div>
  );
}
