import {
  languages,
  setLanguage,
  type Language,
  t as tr,
  useLanguage,
} from "../../shared/i18n";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Check,
  FileText,
  Grip,
  Leaf,
  LockKeyhole,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { useAuth, useMe } from "../../shared/hooks";
import { homePath } from "../../application/access";
import { Avatar, Logo, Spinner } from "../../shared/ui";
import * as Dropdown from "@radix-ui/react-dropdown-menu";

function LanguageFlag({ code }: { code: Language }) {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" className="language-flag">
      <rect width="30" height="20" fill={code === "en" ? "#18346a" : code === "ja" ? "#fff" : "#da251d"} />
      {code === "ja" ? <circle cx="15" cy="10" r="6" fill="#bc002d" /> : null}
      {code === "vi" || code === "zh" ? <path d="m0-7 1.6 4.8h5L2.6.8l1.6 4.8L0 2.6l-4.2 3L-2.6.8l-4-3h5Z" fill="#ffdf00" transform={code === "vi" ? "translate(15 10)" : "translate(6 6) scale(.55)"} /> : null}
      {code === "zh" ? [0, 1, 2, 3].map((i) => <path key={i} d="m0-2 .5 1.4H2L.8.3l.4 1.4L0 .8l-1.2.9.4-1.4L-2-.6h1.5Z" fill="#ffdf00" transform={`translate(${[11,13,13,11][i]} ${[3,6,9,12][i]})`} />) : null}
      {code === "en" ? <><path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.5" /><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="7" /><path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="4" /></> : null}
    </svg>
  );
}

function LandingLanguageSelect() {
  const language = useLanguage();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="landing-language" aria-label={`${tr("App language")}: ${languages.find((item) => item.code === language)?.name}`} title={tr("App language")}>
        <LanguageFlag code={language} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="landing-language-menu" align="end" sideOffset={8} collisionPadding={12}>
          <Dropdown.RadioGroup value={language} onValueChange={(code) => setLanguage(code as Language)} aria-label={tr("App language")}>
            {languages.map(({ code, name }) => <Dropdown.RadioItem key={code} value={code} className="landing-language-option" lang={code}><LanguageFlag code={code} /><span>{name}</span><Dropdown.ItemIndicator><Check size={16} /></Dropdown.ItemIndicator></Dropdown.RadioItem>)}
          </Dropdown.RadioGroup>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function Landing({
  redirectAuthenticated = false,
}: {
  redirectAuthenticated?: boolean;
}) {
  useLanguage();
  const auth = useAuth();
  const me = useMe();
  if (redirectAuthenticated && (auth.status === "authenticated" || auth.status === "offline" || auth.status === "guest"))
    return <Navigate to={homePath(auth.session)} replace />;
  if (redirectAuthenticated && auth.status === "loading")
    return <Spinner label={tr("Opening your space…")} />;
  const signedIn =
    auth.status === "authenticated" ||
    auth.status === "offline" ||
    auth.status === "guest";
  const destination = homePath(auth.session);
  const accountName =
    me.data?.profile?.fullName ||
    auth.session?.fullName ||
    auth.session?.givenName ||
    auth.session?.userName ||
    tr("Your account");
  return (
    <div className="landing">
      <header>
        <Link to="/Home">
          <Logo />
        </Link>
        <nav>
          <LandingLanguageSelect />
          {!signedIn ? (
            <Link className="button primary" to="/login">
              {tr("Sign in")}
              <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              className="avatar-menu"
              to={destination}
              aria-label={tr("Open workspace")}
            >
              <Avatar
                name={accountName}
                picture={
                  me.data
                    ? me.data.profile?.picture
                    : auth.session?.picture
                }
              />
              <span className="account-name">{accountName.split(" ")[0]}</span>
            </Link>
          )}
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={13} />
              {tr("A LITTLE SPACE FOR EVERYTHING")}
            </span>
            <h1>
              {tr("Clear your mind.")}
              <br />
              <span>{tr("Keep your ideas.")}</span>
            </h1>
            <p>
              {tr(
                "For the things you’re thinking about, the plans you’re making, and the little details worth keeping.",
              )}
            </p>
            <div className="hero-actions">
              {!signedIn ? <Link className="button primary large" to="/guest">{tr("Try guest mode")}<ArrowRight size={18} /></Link> : null}
              <Link
                className={`button ${signedIn ? "primary" : "secondary"} large`}
                to={signedIn ? destination : "/register"}
              >
                {signedIn
                  ? tr("Open your workspace")
                  : tr("Find your little space")}
                <ArrowRight size={18} />
              </Link>
            </div>
            <span className="hero-reassurance">
              <LockKeyhole size={13} />
              {tr("Your notes are private. Always yours.")}
            </span>
          </div>
          <div className="hero-note-scene" aria-hidden="true">
            <div className="hero-floating-tag">
              <Leaf size={16} />
              {tr("Room to think")}
            </div>
            <div className="paper-card hero-note">
              <div className="hero-note-icons">
                💡
                <Grip size={19} />
              </div>
              <span className="mini-label">{tr("A thought for today")}</span>
              <h2>
                {tr("What if you gave")}
                <br />
                {tr("that idea a little space?")}
              </h2>
              <p>
                {tr("Let it be a messy first draft.")}
                <br />
                {tr("Great things start somewhere.")}
              </p>
              <div className="hero-note-line" />
              <span className="mini-label" style={{ background: "#e9a33c1f", color: "#a0721f" }}>
                <Tag size={10} style={{ color: "#e9a33c" }} />
                {tr("ideas")}
              </span>
              <span className="mini-label" style={{ background: "#4b79651f", color: "#3a6152" }}>
                <Tag size={10} style={{ color: "#4b7965" }} />
                {tr("just for me")}
              </span>
            </div>
            <div className="paper-card hero-checklist">
              <span>🌿</span>
              <h3>{tr("A slower kind of Sunday")}</h3>
              <div>
                <Check size={16} />
                {tr("Make something good")}
              </div>
              <div>
                <Check size={16} />
                {tr("Go where the light is")}
              </div>
              <div>
                <span className="fake-checkbox" />
                {tr("Leave room for nothing")}
              </div>
            </div>
            <div className="hero-reminder">
              <Bell size={20} />
              <span>
                {tr("A gentle reminder")}
                <small>{tr("Good things take a little time.")}</small>
              </span>
            </div>
          </div>
        </section>
        <section className="landing-features">
          {[
            [
              FileText,
              tr("More than a blank page"),
              tr(
                "Write freely. Add checklists, colors and a little personality.",
              ),
            ],
            [
              Tag,
              tr("A place for every idea"),
              tr("Labels, pins and a quick search keep things within reach."),
            ],
            [
              Bell,
              tr("Remember what matters"),
              tr("Let your notes find you again with thoughtful reminders."),
            ],
            [
              Search,
              tr("Less looking. More finding."),
              tr("A calm workspace that keeps up with the way you think."),
            ],
          ].map(([Icon, title, text]) => {
            const Glyph = Icon as typeof FileText;
            return (
              <article key={String(title)}>
                <span>
                  <Glyph size={22} />
                </span>
                <h2>{String(title)}</h2>
                <p>{String(text)}</p>
              </article>
            );
          })}
        </section>
        <section className="landing-bottom">
          <span>✧</span>
          <h2>{tr("Your next idea is waiting.")}</h2>
          <p>{tr("Give it somewhere to live.")}</p>
          <Link
            className="button primary"
            to={signedIn ? destination : "/register"}
          >
            {signedIn ? tr("Continue where you left off") : tr("Create your space")}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div className="landing-footer-intro">
            <Link to="/Home"><Logo /></Link>
            <p>{tr("A little space for your notes, ideas and everyday plans.")}</p>
            <span className="landing-footer-note"><LockKeyhole size={13} />{tr("Your notes are private. Always yours.")}</span>
          </div>
          <nav aria-label={tr("Explore NoteTatCa")}>
            <h2>{tr("Explore NoteTatCa")}</h2>
            <Link to={signedIn ? destination : "/guest"}>{signedIn ? tr("Open workspace") : tr("Try guest mode")}</Link>
            <Link to={signedIn ? destination : "/login"}>{signedIn ? tr("Your account") : tr("Sign in")}</Link>
            {!signedIn ? <Link to="/register">{tr("Create an account")}</Link> : null}
          </nav>
          <div className="landing-footer-resources">
            <h2>{tr("Resources")}</h2>
            {["About NoteTatCa", "Help center", "Terms of use"].map((label) => <span className="landing-footer-pending" key={label}>{tr(label)}<small>{tr("Coming soon")}</small></span>)}
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} NoteTatCa.</span>
          <Link to="/privacy">{tr("Privacy & data")}</Link>
          <span className="landing-footer-signoff"><Leaf size={13} />{tr("Less to remember. More room to think.")}</span>
        </div>
      </footer>
    </div>
  );
}
export function Privacy() {
  useLanguage();
  return (
    <main className="public-document">
      <Link to="/">
        <Logo />
      </Link>
      <span className="eyebrow">{tr("YOUR NOTES. YOUR SPACE.")}</span>
      <h1>{tr("Privacy & data")}</h1>
      <p className="lead">
        {tr("NoteTatCa is designed for private, personal notes.")}
      </p>
      <h2>{tr("Who can see your notes?")}</h2>
      <p>
        {tr(
          "Each account has its own notes, labels and reminders. Administrators can manage accounts and view system totals; administrative access does not grant access to note content.",
        )}
      </p>
      <h2>{tr("Guest mode")}</h2>
      <p>{tr("Guest notes and labels stay on this browser without an account. Anyone using this browser profile can access them. Sign in and choose Copy to my account to store a copy online.")}</p>
      <h2>{tr("Your account")}</h2>
      <p>
        {tr(
          "Your email and profile are used to sign you in and deliver account messages. Linking Google is optional. You can review and revoke active sessions in account settings.",
        )}
      </p>
      <h2>{tr("Reminders and email")}</h2>
      <p>
        {tr(
          "Reminder emails include the note title, a short content preview and a link to open the note. Delivery depends on the server’s configured reminder service and email provider.",
        )}
      </p>
      <h2>{tr("Deleted notes")}</h2>
      <p>
        {tr(
          "Notes in trash can be restored during a 30-day retention period, unless you choose to delete them permanently sooner. Backups follow the operator’s separate retention arrangements.",
        )}
      </p>
      <h2>{tr("This browser")}</h2>
      <p>
        {tr(
          "Account notes and labels are cached on this browser for offline use. Signing out protects pending changes before clearing the account cache. Guest data is separate and stays until you reset the demo, copy it successfully, or clear browser data.",
        )}
      </p>
      <h2>{tr("Service-specific details")}</h2>
      <p>
        {tr(
          "The operator must provide contact details, hosting locations and the applicable privacy notice before a public release. This page describes current app behavior and does not replace that notice.",
        )}
      </p>
      <Link className="button secondary" to="/">
        {tr("Back to the app")}
      </Link>
    </main>
  );
}
export function NotFound() {
  useLanguage();
  return (
    <main className="crash-page">
      <Logo />
      <span className="eyebrow">{tr("404 · A LITTLE LOST")}</span>
      <h1>{tr("This page wandered off.")}</h1>
      <p>{tr("Check the address or return to your account.")}</p>
      <Link className="button primary" to="/">
        {tr("Back to the app")}
      </Link>
    </main>
  );
}
