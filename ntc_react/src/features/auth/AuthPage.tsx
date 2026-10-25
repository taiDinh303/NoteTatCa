import { t as tr, useLanguage } from "../../shared/i18n";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  LockKeyhole,
} from "lucide-react";
import { api, auth } from "../../app/runtime";
import { homePath } from "../../application/access";
import { useAuth } from "../../shared/hooks";
import { Button, ErrorBanner, Field, Logo, Spinner } from "../../shared/ui";
import { GoogleButton } from "./GoogleButton";
type Mode =
  "login" | "register" | "forgot" | "reset" | "verify" | "confirm" | "password";
export function LoginForm({ onDone }: { onDone: () => void }) {
  useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [visible, setVisible] = useState(false);
  return (
    <>
      <GoogleButton
        onCredential={async (token) => {
          await auth.google(token);
          onDone();
        }}
      />
      <div className="auth-divider">
        <span>{tr("or continue with email")}</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError(undefined);
          void auth
            .login(
              String(data.get("email")),
              String(data.get("password")),
              true,
            )
            .then(onDone)
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <ErrorBanner error={error} />
        <Field label={tr("Email address")}>
          <input
            autoComplete="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            maxLength={256}
          />
        </Field>
        <Field label={tr("Password")}>
          <div className="password-input">
            <input
              autoComplete="current-password"
              name="password"
              type={visible ? "text" : "password"}
              placeholder={tr("Enter your password")}
              required
              maxLength={1024}
            />
            <button
              type="button"
              aria-label={visible ? tr("Hide password") : tr("Show password")}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>
        <div className="auth-options">
          <span className="field-hint">
            {tr("Stay signed in on this device")}
          </span>
          <Link to="/forgot-password">{tr("Forgot password?")}</Link>
        </div>
        <Button className="full-width" busy={busy} type="submit">
          {tr("Sign in")}
          <ArrowRight size={16} />
        </Button>
      </form>
    </>
  );
}
const copy: Record<Mode, [string, string]> = {
  login: ["Welcome back.", "Sign in to continue to your account."],
  register: [
    "Make room for your ideas.",
    "Create your private space. It starts with one note.",
  ],
  forgot: [
    "Let’s get you back in.",
    "We’ll send a recovery link if your account is eligible.",
  ],
  reset: ["A fresh start.", "Choose a strong password for your account."],
  verify: [
    "Check your inbox.",
    "Enter the six-digit code to verify your email.",
  ],
  confirm: ["Confirming your email.", "We’re checking the confirmation link."],
  password: [
    "Confirm it’s you.",
    "Enter your password to verify your current account.",
  ],
};
export default function AuthPage({ mode }: { mode: Mode }) {
  useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const state = useAuth();
  const [busy, setBusy] = useState(
    mode === "confirm" &&
      !!params.get("userId") &&
      !!params.get("token") &&
      !!params.get("newEmail"),
  );
  const [error, setError] = useState<unknown>(() =>
    mode === "confirm" &&
    (!params.get("userId") || !params.get("token") || !params.get("newEmail"))
      ? new Error(
          tr(
            "This confirmation link is incomplete. Request a new link in Settings.",
          ),
        )
      : undefined,
  );
  const [success, setSuccess] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const started = useRef(false);
  useEffect(() => {
    if (!codeSent) return;
    const timer = setTimeout(() => setCodeSent(false), 60000);
    return () => clearTimeout(timer);
  }, [codeSent]);
  useEffect(() => {
    if (mode !== "confirm" || started.current) return;
    started.current = true;
    const userId = params.get("userId"),
      token = params.get("token"),
      newEmail = params.get("newEmail");
    if (!userId || !token || !newEmail) return;
    void api
      .request(
        "/auth/confirm-email-change?" +
          new URLSearchParams({ userId, token, newEmail }),
        { authenticated: false },
      )
      .then(() => {
        setSuccess(
          tr(
            "Your email address has been updated. Sign in with your new email.",
          ),
        );
        void auth.logout();
        navigate("/auth/confirm-change-email", { replace: true });
      })
      .catch(setError)
      .finally(() => setBusy(false));
  }, [mode, navigate, params]);
  const done = () =>
    navigate(homePath(auth.getSnapshot().session), { replace: true });
  async function sendCode() {
    setCodeBusy(true);
    setError(undefined);
    try {
      await api.request("/auth/email-code", {
        method: "POST",
        body: { email },
        authenticated: false,
      });
      setCodeSent(true);
    } catch (error) {
      setError(error);
    } finally {
      setCodeBusy(false);
    }
  }
  async function submit(data: FormData) {
    setError(undefined);
    setBusy(true);
    try {
      if (mode === "register") {
        const password = String(data.get("password"));
        if (password !== data.get("confirmPassword"))
          throw new Error(tr("Passwords do not match."));
        await api.request("/auth/register", {
          method: "POST",
          body: {
            email,
            password,
            confirmPassword: password,
            username: email,
            confirmationCode: data.get("code"),
          },
          authenticated: false,
        });
        await auth.login(email, password);
        done();
      }
      if (mode === "forgot") {
        await api.request("/auth/forgot-password", {
          method: "POST",
          body: { email },
          authenticated: false,
        });
        setSuccess(
          tr(
            "If this account is eligible, a recovery link is on its way. Check your inbox and spam folder.",
          ),
        );
      }
      if (mode === "verify") {
        await api.request("/auth/verify-email", {
          method: "POST",
          body: { email, code: data.get("code") },
          authenticated: false,
        });
        setSuccess(tr("Email verified. You can now sign in."));
      }
      if (mode === "reset") {
        if (data.get("password") !== data.get("confirmPassword"))
          throw new Error(tr("Passwords do not match."));
        const userId = params.get("userId"),
          token = params.get("token");
        if (!userId || !token)
          throw new Error(
            tr("This recovery link is incomplete. Request a new one."),
          );
        await api.request("/auth/reset-password", {
          method: "POST",
          body: { userId, token, newPassword: data.get("password") },
          authenticated: false,
        });
        setSuccess(
          tr("Your password has been updated. Sign in with your new password."),
        );
        navigate("/auth/set-password", { replace: true });
      }
      if (mode === "password") {
        if (!state.session)
          throw new Error(tr("Sign in to verify your password."));
        await api.request("/api/auth/verify-password", {
          method: "POST",
          body: {
            userId: state.session.userId,
            password: data.get("password"),
          },
        });
        setSuccess(tr("Your password has been verified."));
      }
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "login" && (state.status === "authenticated" || state.status === "offline"))
    return <Navigate to={homePath(state.session)} replace />;
  return (
    <div className="auth-page">
      <section className="auth-main">
        <Link className="auth-brand" to="/Home">
          <Logo />
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{tr("YOUR LITTLE SPACE")}</span>
          <h1>{tr(copy[mode][0])}</h1>
          <p className="auth-subtitle">{tr(copy[mode][1])}</p>
          {mode === "login" ? (
            <>
              <LoginForm onDone={done} />
              <p className="auth-switch">
                {tr("New around here?")}{" "}
                <Link to="/register">{tr("Create an account")}</Link>
              </p>
              <Link className="subtle-link" to="/verify-email">
                {tr("Need to verify your email?")}
              </Link>
            </>
          ) : (
            <>
              <ErrorBanner error={error} />
              {success ? (
                <div className="success-panel" role="status">
                  <CheckCircle2 size={28} />
                  <p>{success}</p>
                  <Link
                    className="button primary"
                    to={mode === "password" ? "/settings/account" : "/login"}
                  >
                    {mode === "password"
                      ? tr("Back to settings")
                      : tr("Back to sign in")}
                  </Link>
                </div>
              ) : mode === "confirm" ? (
                busy ? (
                  <Spinner label={tr("Confirming your email…")} />
                ) : null
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit(new FormData(e.currentTarget));
                  }}
                >
                  {["register", "forgot", "verify"].includes(mode) ? (
                    <Field label={tr("Email address")}>
                      <input
                        type="email"
                        autoComplete="email"
                        name="email"
                        placeholder="you@example.com"
                        maxLength={256}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setCodeSent(false);
                        }}
                        required
                      />
                    </Field>
                  ) : null}
                  {["register", "verify"].includes(mode) ? (
                    <>
                      <div className="code-row">
                        <Field label={tr("Verification code")}>
                          <input
                            name="code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            placeholder="000000"
                            required
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="secondary"
                          busy={codeBusy}
                          disabled={!email || codeSent}
                          onClick={() => void sendCode()}
                        >
                          {codeSent ? tr("Code sent") : tr("Send code")}
                        </Button>
                      </div>
                      {codeSent ? (
                        <p className="field-hint" role="status">
                          {tr(
                            "Check your inbox. Codes expire in 10 minutes. You can request another code after a minute.",
                          )}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {["register", "reset", "password"].includes(mode) ? (
                    <Field
                      label={
                        mode === "password"
                          ? tr("Your password")
                          : tr("Password")
                      }
                      hint={
                        mode === "password"
                          ? undefined
                          : tr(
                              "At least 8 characters; include a mix of letters, numbers and symbols.",
                            )
                      }
                    >
                      <input
                        type="password"
                        name="password"
                        autoComplete={
                          mode === "password"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        minLength={mode === "password" ? 1 : 8}
                        maxLength={1024}
                      />
                    </Field>
                  ) : null}
                  {["register", "reset"].includes(mode) ? (
                    <Field label={tr("Confirm password")}>
                      <input
                        type="password"
                        name="confirmPassword"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={1024}
                      />
                    </Field>
                  ) : null}
                  <Button type="submit" className="full-width" busy={busy}>
                    {mode === "register"
                      ? tr("Create my space")
                      : mode === "forgot"
                        ? tr("Send recovery link")
                        : mode === "verify"
                          ? tr("Verify email")
                          : mode === "password"
                            ? tr("Verify password")
                            : tr("Set password")}
                    <ArrowRight size={16} />
                  </Button>
                </form>
              )}
              <Link className="back-link" to="/login">
                <ArrowLeft size={15} />
                {tr("Back to sign in")}
              </Link>
            </>
          )}
          <p className="auth-privacy">
            <LockKeyhole size={12} />
            {tr("Private notes. Just for you.")}
          </p>
        </div>
      </section>
      <aside className="auth-art">
        <div className="product-preview">
          <div className="preview-sidebar">
            <div className="preview-sidebar-section">
              <div className="preview-sidebar-item active">
                <span className="preview-icon-dot" />
                <span>All notes</span>
                <span className="preview-count">3</span>
              </div>
              <div className="preview-sidebar-item">
                <span className="preview-icon-dot" />
                <span>Trash</span>
                <span className="preview-count">0</span>
              </div>
            </div>
            <div className="preview-sidebar-heading">
              YOUR LABELS
            </div>
            <div className="preview-sidebar-section">
              <div className="preview-sidebar-item">
                <Hash size={13} />
                <span>Ideas</span>
              </div>
              <div className="preview-sidebar-item">
                <Hash size={13} />
                <span>Personal</span>
              </div>
              <div className="preview-sidebar-item">
                <Hash size={13} />
                <span>Work</span>
              </div>
            </div>
          </div>
          <div className="preview-main">
            <div className="preview-section">
              <div className="preview-section-label">
                Pinned <span className="preview-section-count">1</span>
              </div>
              <div className="preview-note-card" style={{ backgroundColor: "#fce4e5", color: "#30373d" }}>
                <div className="preview-note-title">
                  <span>💡</span> Welcome to your guest space
                </div>
                <div className="preview-note-text">
                  Try writing a note, choosing a color, or adding a label.
                </div>
                <span className="preview-label-chip" style={{ background: "#fce4e5" }}>
                  <Hash size={10} /> Ideas
                </span>
              </div>
            </div>
            <div className="preview-section">
              <div className="preview-section-label">
                Everything else <span className="preview-section-count">2</span>
              </div>
              <div className="preview-note-grid">
                <div className="preview-note-card" style={{ backgroundColor: "#edf5ef", color: "#30373d" }}>
                  <div className="preview-note-title">
                    <span>🌿</span> A few things to try
                  </div>
                  <div className="preview-note-text">
                    Create your own note
                  </div>
                  <span className="preview-label-chip" style={{ background: "#edf5ef" }}>
                    <Hash size={10} /> Personal
                  </span>
                </div>
                <div className="preview-note-card" style={{ backgroundColor: "#faf3e0", color: "#30373d" }}>
                  <div className="preview-note-title">
                    <span>💡</span> A little room for ideas
                  </div>
                  <div className="preview-note-text">
                    A project idea, a book to read, a place to visit.
                  </div>
                  <span className="preview-label-chip" style={{ background: "#faf3e0" }}>
                    <Hash size={10} /> Work
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="art-caption">
          {tr("Less to remember.")}
          <br />
          <strong>{tr("More room to think.")}</strong>
        </div>
      </aside>
    </div>
  );
}
