import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { api, auth } from "../../app/runtime";
import { homePath } from "../../application/access";
import { useAuth } from "../../shared/hooks";
import { Button, ErrorBanner, Field, Logo, Spinner } from "../../shared/ui";
import { GoogleButton } from "./GoogleButton";
type Mode =
  "login" | "register" | "forgot" | "reset" | "verify" | "confirm" | "password";
export function LoginForm({ onDone }: { onDone: () => void }) {
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
        <span>or continue with email</span>
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
        <Field label="Email address">
          <input
            autoComplete="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            maxLength={256}
          />
        </Field>
        <Field label="Password">
          <div className="password-input">
            <input
              autoComplete="current-password"
              name="password"
              type={visible ? "text" : "password"}
              placeholder="Enter your password"
              required
              maxLength={1024}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>
        <div className="auth-options">
          <span className="field-hint">Stay signed in on this device</span>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button className="full-width" busy={busy} type="submit">
          Sign in <ArrowRight size={16} />
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
          "This confirmation link is incomplete. Request a new link in Settings.",
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
          "Your email address has been updated. Sign in with your new email.",
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
          throw new Error("Passwords do not match.");
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
          "If this account is eligible, a recovery link is on its way. Check your inbox and spam folder.",
        );
      }
      if (mode === "verify") {
        await api.request("/auth/verify-email", {
          method: "POST",
          body: { email, code: data.get("code") },
          authenticated: false,
        });
        setSuccess("Email verified. You can now sign in.");
      }
      if (mode === "reset") {
        if (data.get("password") !== data.get("confirmPassword"))
          throw new Error("Passwords do not match.");
        const userId = params.get("userId"),
          token = params.get("token");
        if (!userId || !token)
          throw new Error(
            "This recovery link is incomplete. Request a new one.",
          );
        await api.request("/auth/reset-password", {
          method: "POST",
          body: { userId, token, newPassword: data.get("password") },
          authenticated: false,
        });
        setSuccess(
          "Your password has been updated. Sign in with your new password.",
        );
        navigate("/auth/set-password", { replace: true });
      }
      if (mode === "password") {
        if (!state.session) throw new Error("Sign in to verify your password.");
        await api.request("/api/auth/verify-password", {
          method: "POST",
          body: {
            userId: state.session.userId,
            password: data.get("password"),
          },
        });
        setSuccess("Your password has been verified.");
      }
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  if (mode === "login" && state.status === "authenticated")
    return <Navigate to={homePath(state.session)} replace />;
  return (
    <div className="auth-page">
      <section className="auth-main">
        <Link className="auth-brand" to="/">
          <Logo />
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">YOUR LITTLE SPACE</span>
          <h1>{copy[mode][0]}</h1>
          <p className="auth-subtitle">{copy[mode][1]}</p>
          {mode === "login" ? (
            <>
              <LoginForm onDone={done} />
              <p className="auth-switch">
                New around here? <Link to="/register">Create an account</Link>
              </p>
              <Link className="subtle-link" to="/verify-email">
                Need to verify your email?
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
                      ? "Back to settings"
                      : "Back to sign in"}
                  </Link>
                </div>
              ) : mode === "confirm" ? (
                busy ? (
                  <Spinner label="Confirming your email…" />
                ) : null
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit(new FormData(e.currentTarget));
                  }}
                >
                  {["register", "forgot", "verify"].includes(mode) ? (
                    <Field label="Email address">
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
                        <Field label="Verification code">
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
                          {codeSent ? "Code sent" : "Send code"}
                        </Button>
                      </div>
                      {codeSent ? (
                        <p className="field-hint" role="status">
                          Check your inbox. Codes expire in 10 minutes. You can
                          request another code after a minute.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {["register", "reset", "password"].includes(mode) ? (
                    <Field
                      label={mode === "password" ? "Your password" : "Password"}
                      hint={
                        mode === "password"
                          ? undefined
                          : "At least 8 characters; include a mix of letters, numbers and symbols."
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
                    <Field label="Confirm password">
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
                      ? "Create my space"
                      : mode === "forgot"
                        ? "Send recovery link"
                        : mode === "verify"
                          ? "Verify email"
                          : mode === "password"
                            ? "Verify password"
                            : "Set password"}
                    <ArrowRight size={16} />
                  </Button>
                </form>
              )}
              <Link className="back-link" to="/login">
                <ArrowLeft size={15} />
                Back to sign in
              </Link>
            </>
          )}
          <p className="auth-privacy">
            <LockKeyhole size={12} />
            Private notes. Just for you.
          </p>
        </div>
      </section>
      <aside className="auth-art">
        <div className="art-spark">
          <Sparkles size={26} />
        </div>
        <div className="paper-card art-note-one">
          <span>💡</span>
          <h2>
            Good ideas
            <br />
            deserve a home.
          </h2>
          <p>
            A thought, a plan, a tiny reminder.
            <br />
            Keep the things that matter.
          </p>
          <span className="mini-label">a little inspiration</span>
        </div>
        <div className="paper-card art-note-two">
          <Leaf size={25} />
          <h3>A little more clarity.</h3>
          <div className="art-check">
            <span>✓</span> Capture the thought
          </div>
          <div className="art-check">
            <span>✓</span> Make a little space
          </div>
          <div className="art-check">
            <span /> Let ideas grow
          </div>
        </div>
        <div className="art-caption">
          Less to remember.
          <br />
          <strong>More room to think.</strong>
        </div>
        <div className="art-orbit" />
      </aside>
    </div>
  );
}
