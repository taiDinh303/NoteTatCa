import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../app/runtime";
import { t as tr, useLanguage } from "../../shared/i18n";
import { Button, ErrorBanner, Select } from "../../shared/ui";
import { errorMessage } from "../../shared/utils";
import { PatternLock } from "./PatternLock";

export function VaultRecovery({
  onReset,
}: {
  onReset: (kind: "pin" | "pattern") => void;
}) {
  useLanguage();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [stage, setStage] = useState<"email" | "code" | "secret" | "confirm">(
    "email",
  );
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"pin" | "pattern">("pin");
  const [secret, setSecret] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    await action(async () => {
      await api.request("/hidden-notes/reset-code", { method: "POST" });
      setCode("");
      setSent(true);
      setStage("code");
    });
  }
  async function submit() {
    await action(async () => {
      if (stage === "code") {
        if (!/^\d{6}$/.test(code))
          throw new Error(tr("Enter the six-digit email code."));
        setStage("secret");
        return;
      }
      if (stage === "secret") {
        if (kind === "pin" ? !/^\d{6}$/.test(secret) : secret.length < 4)
          throw new Error(
            tr("Use a six-digit PIN or at least four pattern points."),
          );
        setConfirmation(secret);
        setSecret("");
        setStage("confirm");
        return;
      }
      if (secret !== confirmation)
        throw new Error(tr("The locks do not match. Try again."));
      await api.request("/hidden-notes/reset", {
        method: "POST",
        body: { code, kind, secret },
      });
      if (active.current) onReset(kind);
    });
  }
  return (
    <section className="vault-page">
      <div className="vault-lock-form vault-recovery">
        <Link to="/hidden-notes" replace className="button ghost vault-recovery-back">
          <ArrowLeft size={16} />
          {tr("Back to unlock")}
        </Link>
        <h1 className="sr-only">{tr("Reset hidden notes lock")}</h1>
        {error ? <ErrorBanner error={new Error(error)} /> : null}
        {stage === "email" ? (
          <>
            <Button busy={busy} onClick={() => void send()}>
              {tr("Send reset code")}
            </Button>
          </>
        ) : (
          <form
            className="vault-recovery-fields"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {stage === "code" ? (
              <>
                {sent ? (
                  <p role="status" className="sr-only">
                    {tr("A reset code was sent to your verified email.")}
                  </p>
                ) : null}
                <label>
                  <span className="sr-only">{tr("Email reset code")}</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
              </>
            ) : (
              <>
                {stage === "secret" ? (
                  <label>
                    <span className="sr-only">{tr("Lock type")}</span>
                    <Select
                      label={tr("Lock type")}
                      value={kind}
                      disabled={busy}
                      onChange={(value) => {
                        setKind(value as "pin" | "pattern");
                        setSecret("");
                      }}
                    >
                      <option value="pin">{tr("Six-digit PIN")}</option>
                      <option value="pattern">{tr("3 by 3 pattern")}</option>
                    </Select>
                  </label>
                ) : null}
                <strong className="sr-only">
                  {tr(
                    stage === "confirm"
                      ? "Repeat your new lock"
                      : "Choose your new lock",
                  )}
                </strong>
                {kind === "pin" ? (
                  <label>
                    <span className="sr-only">{tr("Six-digit PIN")}</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                      disabled={busy}
                      value={secret}
                      onChange={(e) =>
                        setSecret(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                ) : (
                  <>
                    <PatternLock
                      value={secret}
                      onChange={setSecret}
                      disabled={busy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSecret("")}
                    >
                      {tr("Clear pattern")}
                    </Button>
                  </>
                )}
              </>
            )}
            <Button type="submit" busy={busy}>
              {tr(stage === "confirm" ? "Confirm lock" : "Continue")}
            </Button>
            {stage === "code" ? (
              <Button
                type="button"
                variant="secondary"
                busy={busy}
                onClick={() => void send()}
              >
                {tr("Send another code")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSecret("");
                  setConfirmation("");
                  setStage(stage === "confirm" ? "secret" : "code");
                }}
              >
                {tr("Back")}
              </Button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
