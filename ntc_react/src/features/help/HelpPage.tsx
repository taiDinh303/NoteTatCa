import { t as tr, useLanguage } from "../../shared/i18n";
import "./help.css";

export default function HelpPage() {
  useLanguage();
  return (
    <section className="help-page">
      <h1>{tr("Help & feedback")}</h1>
      <p className="help-placeholder">{tr("This page is coming soon.")}</p>
    </section>
  );
}
