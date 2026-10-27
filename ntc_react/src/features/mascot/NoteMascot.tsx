import { MascotPage } from "./MascotPage";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./MascotPage.css";

/*
 * NoteMascot — the bunny that sits on top of a note card.
 * Uses the sprite-sheet mascot (port of nilbuild/page-mascot, MIT). It follows
 * the cursor and blinks/squashes when poked.
 *
 * Position rules:
 * - When no note has been opened yet in this session, it sits at the
 *   "middle of the list" (anchored to the note card in the center column).
 * - After the user opens and closes a note, it moves to the top-right
 *   corner of that card ("on top of the note that was last opened").
 * - It is only rendered outside the editor, on the notes list page.
 *
 * No chat logic — decorative only.
 */
export function NoteMascot({
  size = 88,
  anchor = "center",
}: {
  size?: number;
  /** "center" = anchored to the middle of the card; "corner" = top-right. */
  anchor?: "center" | "corner";
}) {
  useLanguage();
  return (
    <div
      className={`note-mascot ${anchor === "center" ? "note-mascot-center" : "note-mascot-corner"}`}
      data-mascot-anchor={anchor}
    >
      <MascotPage
        directions="/mascots/bunny-directions.png"
        reactions="/mascots/bunny-reactions.png"
        size={size}
        label={tr("mascot")}
        className="note-mascot-sprite"
      />
    </div>
  );
}
