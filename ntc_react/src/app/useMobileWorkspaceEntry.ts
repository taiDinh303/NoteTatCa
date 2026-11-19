import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMobileLayout } from "../shared/useMobileLayout";

/**
 * Mobile system-back buffer.
 *
 * The browser only exits the app when the user pops below the last in-app
 * history entry. On phones we guarantee at least one such entry: on the first
 * mobile entry we replace the deepest entry with the workspace home URL and
 * push the real current page on top of it. From then on every system back
 * press lands on an in-app page (the note panel's own back entry, pushed by
 * `useNoteBack`, closes the note first). Desktop is untouched.
 *
 * The buffer is created even when the entry IS the home page — that is the
 * case a phone most often starts in, and skipping it there is what lets a
 * single back press exit the app.
 */
export function useMobileWorkspaceEntry(home: string) {
  const mobile = useMobileLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (!mobile || initialized.current) return;
    initialized.current = true;
    if (Number(window.history.state?.idx ?? 0) > 0) return;
    const current = location.pathname + location.search + location.hash;
    navigate(home, { replace: true });
    navigate(current, { state: location.state });
  }, [mobile, location, navigate, home]);
}
