import { useEffect, useRef, useState } from "react";
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (value: { credential: string }) => void;
      }): void;
      renderButton(element: HTMLElement, options: object): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}
let googleScript: Promise<void> | undefined;
function loadGoogle() {
  return (googleScript ??= new Promise<void>((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScript = undefined;
      script.remove();
      reject(
        new Error("Google sign-in could not load. Please try email sign-in."),
      );
    };
    document.head.append(script);
  }));
}
export function GoogleButton({
  onCredential,
  label = "signin_with",
}: {
  onCredential: (token: string) => Promise<void>;
  label?: "signin_with" | "continue_with";
}) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [error, setError] = useState("");
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    void loadGoogle()
      .then(() => {
        if (!active || !element.current) return;
        window.google!.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void callback
              .current(response.credential)
              .catch((error) =>
                setError(
                  error instanceof Error
                    ? error.message
                    : "Google sign-in failed.",
                ),
              );
          },
        });
        window.google!.accounts.id.renderButton(element.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 340,
          text: label,
          shape: "pill",
        });
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [clientId, label]);
  return (
    <div className="google-signin">
      {clientId ? (
        <div ref={element} />
      ) : (
        <button
          className="google-placeholder"
          type="button"
          disabled
          title="Google sign-in is temporarily unavailable"
        >
          <span className="google-g">G</span>Continue with Google
        </button>
      )}
      {!clientId ? (
        <span className="field-hint">Use email to sign in for now.</span>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
