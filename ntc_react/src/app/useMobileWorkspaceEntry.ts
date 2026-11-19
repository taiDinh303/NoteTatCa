import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMobileLayout } from "../shared/useMobileLayout";

/**
 * Mobile system-back guard.
 *
 * The browser can only exit the app when the user pops below the last
 * in-app history entry, so on phones we keep a buffer entry under the
 * current page: whenever the history index falls back to 0 (initial load,
 * deep link, or after in-app backs drained the stack) we re-assert it —
 * replace the deepest entry with the workspace home URL, then push the
 * real current page on top of it. Result: every system back press lands
 * on an in-app page (the note panel's own back entry closes the note
 * first via `useNoteBack`), and back never exits the app from within a
 * page (notes, settings, notifications, …). The user still leaves via
 * the browser's own close/tab UI.
 *
 * Desktop is untouched: the effect is a no-op when the mobile layout
 * query does not match.
 */
export function useMobileWorkspaceEntry(home: string) {
  const mobile = useMobileLayout();
  const location = useLocation();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (!mobile) return;
    if (Number(window.history.state?.idx ?? 0) > 0) return;
    const current = location.pathname + location.search + location.hash;
    if (current === home) return;
    navigate(home, { replace: true });
    navigate(current, { state: location.state });
  }, [mobile, location, navigate, home]);
}
