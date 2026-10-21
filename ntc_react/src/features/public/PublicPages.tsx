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
import { useAuth } from "../../shared/hooks";
import { homePath } from "../../application/access";
import { Logo, Spinner } from "../../shared/ui";
export function Landing({ redirectAuthenticated = false }: { redirectAuthenticated?: boolean }) {
  const auth = useAuth();
  if (redirectAuthenticated && auth.status === "authenticated")
    return <Navigate to={homePath(auth.session)} replace />;
  if (redirectAuthenticated && auth.status === "loading") return <Spinner label="Opening your space…" />;
  const signedIn = auth.status === "authenticated";
  const destination = homePath(auth.session);
  return (
    <div className="landing">
      <header>
        <Link to="/Home">
          <Logo />
        </Link>
        <nav>
          <Link to="/privacy">Your privacy</Link>
          {!signedIn && <Link to="/login">Sign in</Link>}
          <Link className="button primary" to={signedIn ? destination : "/register"}>
            {signedIn ? "Open workspace" : "Get started"}
            <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={13} />A LITTLE SPACE FOR EVERYTHING
            </span>
            <h1>
              Clear your mind.
              <br />
              <span>Keep your ideas.</span>
            </h1>
            <p>
              For the things you’re thinking about, the plans you’re making, and
              the little details worth keeping.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" to={signedIn ? destination : "/register"}>
                {signedIn ? "Open your workspace" : "Find your little space"}
                <ArrowRight size={18} />
              </Link>
              <Link className="button secondary large" to={signedIn ? destination : "/login"}>
                {signedIn ? "Back to the app" : "Welcome back"}
              </Link>
            </div>
            <span className="hero-reassurance">
              <LockKeyhole size={13} />
              Your notes are private. Always yours.
            </span>
          </div>
          <div className="hero-note-scene" aria-hidden="true">
            <div className="hero-floating-tag">
              <Leaf size={16} /> Room to think
            </div>
            <div className="paper-card hero-note">
              <div className="hero-note-icons">
                💡
                <Grip size={19} />
              </div>
              <span className="mini-label">A thought for today</span>
              <h2>
                What if you gave
                <br />
                that idea a little space?
              </h2>
              <p>
                Let it be a messy first draft.
                <br />
                Great things start somewhere.
              </p>
              <div className="hero-note-line" />
              <span className="mini-label">ideas</span>
              <span className="mini-label">just for me</span>
            </div>
            <div className="paper-card hero-checklist">
              <span>🌿</span>
              <h3>A slower kind of Sunday</h3>
              <div>
                <Check size={16} />
                Make something good
              </div>
              <div>
                <Check size={16} />
                Go where the light is
              </div>
              <div>
                <span className="fake-checkbox" />
                Leave room for nothing
              </div>
            </div>
            <div className="hero-reminder">
              <Bell size={20} />
              <span>
                A gentle reminder<small>Good things take a little time.</small>
              </span>
            </div>
          </div>
        </section>
        <section className="landing-features">
          {[
            [
              FileText,
              "More than a blank page",
              "Write freely. Add checklists, colors and a little personality.",
            ],
            [
              Tag,
              "A place for every idea",
              "Labels, pins and a quick search keep things within reach.",
            ],
            [
              Bell,
              "Remember what matters",
              "Let your notes find you again with thoughtful reminders.",
            ],
            [
              Search,
              "Less looking. More finding.",
              "A calm workspace that keeps up with the way you think.",
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
          <h2>Your next idea is waiting.</h2>
          <p>Give it somewhere to live.</p>
          <Link className="button primary" to={signedIn ? destination : "/register"}>
            {signedIn ? "Open your workspace" : "Create your space"}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
}
export function Privacy() {
  return (
    <main className="public-document">
      <Link to="/">
        <Logo />
      </Link>
      <span className="eyebrow">YOUR NOTES. YOUR SPACE.</span>
      <h1>Privacy & data</h1>
      <p className="lead">NoteTatCa is designed for private, personal notes.</p>
      <h2>Who can see your notes?</h2>
      <p>
        Each account has its own notes, labels and reminders. Administrators can
        manage accounts and view system totals; administrative access does not
        grant access to note content.
      </p>
      <h2>Your account</h2>
      <p>
        Your email and profile are used to sign you in and deliver account
        messages. Linking Google is optional. You can review and revoke active
        sessions in account settings.
      </p>
      <h2>Reminders and email</h2>
      <p>
        Reminder emails contain a link to the app rather than your note content.
        Delivery depends on the server’s configured reminder service and email
        provider.
      </p>
      <h2>Deleted notes</h2>
      <p>
        Notes in trash can be restored during a seven-day retention period,
        unless you choose to delete them permanently sooner. Backups follow the
        operator’s separate retention arrangements.
      </p>
      <h2>This browser</h2>
      <p>
        Your refresh session is saved in this browser until you sign out or it
        is revoked. Note caches stay in memory and are cleared on sign-out or
        account changes. Theme and layout preferences may be saved locally.
        Avoid using shared browser profiles for private notes.
      </p>
      <h2>Service-specific details</h2>
      <p>
        The operator must provide contact details, hosting locations and the
        applicable privacy notice before a public release. This page describes
        current app behavior and does not replace that notice.
      </p>
      <Link className="button secondary" to="/">
        Back to the app
      </Link>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="crash-page">
      <Logo />
      <span className="eyebrow">404 · A LITTLE LOST</span>
      <h1>This page wandered off.</h1>
      <p>Check the address or return to your account.</p>
      <Link className="button primary" to="/">
        Back to the app
      </Link>
    </main>
  );
}
