import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMobileLayout } from "../shared/useMobileLayout";

/** Give a directly opened mobile workspace one in-app destination before external history. */
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
