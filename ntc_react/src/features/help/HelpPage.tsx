import { useState } from "react";
import {
  BookOpen,
  Copy,
  Download,
  MessageSquare,
  Send,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { t as tr, useLanguage } from "../../shared/i18n";
import { Button, Field } from "../../shared/ui";
import { download, errorMessage } from "../../shared/utils";
import { api } from "../../app/runtime";
import "./help.css";

const guides = [
  [
    "Write and edit",
    "Choose New to write a note. Notes save automatically; check the save status before closing. Open a saved note in View, then choose Edit to change it.",
  ],
  [
    "Organize your notes",
    "Pin important notes, add labels, and switch between grid and list. Drag a card to reorder it within the same pinned group when all notes are loaded and no search or label filter is active.",
  ],
  [
    "Make it yours",
    "Use the editor toolbar for formatting, text color and font size. Change the note background with the color button; Automatic text color follows the background. Settings contains Language, Privacy and Appearance.",
  ],
] as const;
const questions = [
  [
    "What should I do if saving fails?",
    "Keep the note open and check your connection. Use Retry save when available. Copy your draft before reloading or closing the tab; unsaved drafts are not stored permanently offline.",
  ],
  [
    "Can I recover a deleted note?",
    "Open Trash and choose Restore during the 7-day retention period. Permanently deleted notes cannot be restored from the app.",
  ],
  [
    "How do reminders work?",
    "Open a note in Edit and choose the bell to set a reminder. Manage reminders on the Reminders page and check Inbox for notifications.",
  ],
  [
    "How do I import or export a note?",
    "In Edit, open the three-dot menu and choose Import Markdown or Export Markdown. Markdown may not preserve every formatting detail.",
  ],
  [
    "Where can I find note dates and account settings?",
    "In View, click the Edited date at the bottom to see when a note was created and last edited. Open the avatar menu and choose Account settings for your profile, security and active sessions.",
  ],
] as const;

export default function HelpPage() {
  useLanguage();
  const [kind, setKind] = useState("Report a problem");
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const feedback = `NoteTatCa — ${tr(kind)}\n\n${message.trim()}`;
  return (
    <section className="help-page">
      <header className="help-heading">
        <h1>{tr("Help & feedback")}</h1>
        <p>
          {tr(
            "Find your way around NoteTatCa, solve common problems, or prepare feedback.",
          )}
        </p>
      </header>
      <section aria-labelledby="help-start" className="help-section">
        <h2 id="help-start">
          <BookOpen size={19} aria-hidden="true" />
          {tr("Getting started")}
        </h2>
        <div className="help-guides">
          {guides.map(([title, body]) => (
            <article className="help-guide" key={title}>
              <h3>{tr(title)}</h3>
              <p>{tr(body)}</p>
            </article>
          ))}
        </div>
        <nav className="help-links" aria-label={tr("Useful links")}>
          <Link to="/notes">{tr("All notes")}</Link>
          <Link to="/reminders">{tr("Reminders")}</Link>
          <Link to="/settings">
            <Settings size={14} aria-hidden="true" />
            {tr("Settings")}
          </Link>
        </nav>
      </section>
      <section aria-labelledby="help-faq" className="help-section">
        <h2 id="help-faq">{tr("Frequently asked questions")}</h2>
        <div className="help-faq">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{tr(question)}</summary>
              <p>{tr(answer)}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="help-feedback"
        className="help-section help-feedback"
      >
        <h2 id="help-feedback">
          <MessageSquare size={19} aria-hidden="true" />
          {tr("Feedback")}
        </h2>
        <p>
          {tr(
            "Send a problem, suggestion or question to the NoteTatCa team. Your account email is included so we can reply.",
          )}
        </p>
        <div className="help-feedback-fields">
          <Field label={tr("Feedback type")}>
            <select
              value={kind}
              disabled={sending}
              onChange={(event) => setKind(event.target.value)}
            >
              {[
                "Report a problem",
                "Suggest an improvement",
                "Ask a question",
              ].map((type) => (
                <option key={type} value={type}>
                  {tr(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Your message")}>
            <textarea
              rows={5}
              maxLength={5000}
              value={message}
              disabled={sending}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={tr(
                "What happened? What did you expect? For a problem, include the steps and your browser or device.",
              )}
            />
          </Field>
        </div>
        <p className="help-feedback-note">
          {tr(
            "Do not include passwords, verification codes, or private note content.",
          )}
        </p>
        <div className="help-feedback-actions">
          <Button
            disabled={!message.trim()}
            busy={sending}
            onClick={async () => {
              setSending(true);
              try {
                await api.request<boolean>("/feedback", {
                  method: "POST",
                  body: { kind, message: message.trim() },
                });
                setMessage("");
                toast.success(tr("Feedback sent. Thank you!"));
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setSending(false);
              }
            }}
          >
            <Send size={15} />
            {tr("Send feedback")}
          </Button>
          <Button
            variant="secondary"
            disabled={!message.trim()}
            busy={copying}
            onClick={async () => {
              setCopying(true);
              try {
                await navigator.clipboard.writeText(feedback);
                toast.success(tr("Feedback copied"));
              } catch {
                toast.error(
                  tr("Could not copy. Download your message instead."),
                );
              } finally {
                setCopying(false);
              }
            }}
          >
            <Copy size={15} />
            {tr("Copy feedback")}
          </Button>
          <Button
            variant="secondary"
            disabled={!message.trim()}
            onClick={() => download("notetatca-feedback.txt", feedback)}
          >
            <Download size={15} />
            {tr("Download feedback")}
          </Button>
        </div>
      </section>
    </section>
  );
}
