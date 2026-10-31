import { t as tr, useLanguage } from "../../shared/i18n";
import { Link } from "react-router-dom";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api, cache, workspace, offline } from "../../app/runtime";
import { useAuth } from "../../shared/hooks";
import { errorMessage } from "../../shared/utils";

export default function PrivacySettings({
  administration = false,
}: {
  administration?: boolean;
}) {
  useLanguage();
  const auth = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const sync = useSyncExternalStore(offline.subscribe, offline.getSnapshot);
  const accountBase = administration ? "/admin/settings" : "/settings";
  const downloadArchive = async () => {
    setBusy(true);
    try {
      if (offline.getSnapshot().pending) throw new Error(tr("Sync pending edits before downloading a workspace backup."));
      const archive = await api.request<Record<string, unknown>>("/workspace/archive");
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `notetatca-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const importArchive = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("Backup is larger than 50 MB.");
      const archive: unknown = JSON.parse(await file.text());
      const result = await api.request<{ notes: number; labels: number }>("/workspace/archive/import", { method: "POST", body: archive });
      await Promise.all([
        cache.invalidateQueries({ queryKey: workspace.key("notes") }),
        cache.invalidateQueries({ queryKey: workspace.key("labels") }),
      ]);
      toast.success(tr("Imported {0} notes and {1} labels.").replace("{0}", String(result.notes)).replace("{1}", String(result.labels)));
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
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
        {auth.status === "authenticated" && !administration ? (
          <>
            <p>{tr("Download notes, labels, reminders and version history as JSON. Import adds copies without replacing existing notes. Imported reminders stay off until you enable them.")}</p>
            {sync.pending > 0 && <p role="status">{tr("Sync pending edits before downloading a workspace backup.")}</p>}
            <div className="privacy-actions">
              <button className="button secondary" type="button" disabled={busy} onClick={() => void downloadArchive()}>{tr("Download workspace backup")}</button>
              <button className="button secondary" type="button" disabled={busy} onClick={() => input.current?.click()}>{tr("Import workspace backup")}</button>
              <input ref={input} type="file" accept="application/json,.json" hidden onChange={(event) => void importArchive(event.target.files?.[0])} />
            </div>
          </>
        ) : null}
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
            "Reminder emails include the note title, a short content preview and a link to open the note. You can choose whether to send an email when setting a reminder.",
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
