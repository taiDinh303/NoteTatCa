import { t as tr, useLanguage } from "../../shared/i18n";
import { Link } from "react-router-dom";

export default function PrivacySettings({
  administration = false,
}: {
  administration?: boolean;
}) {
  useLanguage();
  const accountBase = administration ? "/admin/settings" : "/settings";
  return (
    <div className="privacy-sections">
      <section className="preferences-list privacy-section">
        <h2>{tr("Your notes")}</h2>
        <p>
          {tr(
            "Notes, labels and reminders belong to your account. Other users cannot access them through the app. Administrator permissions do not include reading your note content.",
          )}
        </p>
        <p>
          {tr(
            "Your notes are stored by the service so you can access them after signing in.",
          )}
        </p>
      </section>
      <section className="preferences-list privacy-section">
        <h2>{tr("Account & sign-in")}</h2>
        <p>
          {tr(
            "Your email and profile are used for sign-in and account messages. Linking Google is optional.",
          )}
        </p>
        <div className="privacy-actions">
          <Link className="button secondary" to={`${accountBase}/account`}>
            {tr("Account & security")}
          </Link>
          <Link className="button secondary" to={`${accountBase}/sessions`}>
            {tr("Active sessions")}
          </Link>
        </div>
      </section>
      <section className="preferences-list privacy-section">
        <h2>{tr("This browser")}</h2>
        <p>
          {tr(
            "Your sign-in session is saved in this browser until you sign out or it is revoked. Theme, layout and language preferences are saved locally when browser storage is available.",
          )}
        </p>
        <p>
          {tr(
            "Notes and labels are saved on this device for offline use. Pending edits sync when the app is open and connected. Signing out clears local notes after protecting unsynced changes. Browser storage can be cleared by your browser and is not a backup.",
          )}
        </p>
      </section>
      <section className="preferences-list privacy-section">
        <h2>{tr("Reminders and email")}</h2>
        <p>
          {tr(
            "Reminder emails contain a link to the app rather than your note content. You can choose whether to send an email when setting a reminder.",
          )}
        </p>
      </section>
      <section className="preferences-list privacy-section">
        <h2>{tr("Deleted notes")}</h2>
        <p>
          {tr(
            "You can restore notes from Trash for up to 30 days. Permanent deletion cannot be undone in the app.",
          )}
        </p>
        {!administration ? (
          <Link className="button secondary" to="/trash">
            {tr("Open Trash")}
          </Link>
        ) : null}
      </section>
      <Link className="button secondary" to="/privacy">
        {tr("Read privacy & data")}
      </Link>
    </div>
  );
}
