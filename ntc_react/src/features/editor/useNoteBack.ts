import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";

/** A same-route entry lets the first mobile Back close the note, even on direct entry. */
export function useNoteBack(
  dirty: () => boolean,
  requestClose: () => void,
  onClose: () => void,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const [token] = useState(() => crypto.randomUUID());
  const pushed = useRef(false);
  const bypass = useRef(false);
  const back = useRef(false);
  const handled = useRef(false);
  const close = useRef(requestClose);
  useLayoutEffect(() => {
    close.current = requestClose;
  });
  const blocker = useBlocker(({ historyAction, nextLocation }) => {
    if (bypass.current) return false;
    back.current =
      pushed.current &&
      historyAction === "POP" &&
      nextLocation.state?.noteBack !== token;
    if (nextLocation.state?.noteBack === token) return false;
    // A second POP may arrive before React paints the intermediate reset state.
    if (back.current) handled.current = false;
    return dirty() || back.current;
  });
  useEffect(() => {
    if (pushed.current || !window.matchMedia("(max-width: 800px)").matches)
      return;
    pushed.current = true;
    navigate(location.pathname + location.search + location.hash, {
      state: { ...location.state, noteBack: token },
    });
  }, [navigate, location, token]);
  useEffect(() => {
    if (blocker.state !== "blocked") {
      handled.current = false;
      return;
    }
    if (back.current && !handled.current) {
      handled.current = true;
      close.current();
    }
  }, [blocker]);
  function finish() {
    bypass.current = true;
    if (blocker.state === "blocked") {
      // POP already has a destination; proceeding consumes the note entry.
      onClose();
      blocker.proceed();
    } else {
      if (pushed.current && location.state?.noteBack === token)
        navigate(-1);
      onClose();
    }
  }
  return { blocker, finish, backRequested: blocker.state === "blocked" && blocker.location.pathname === location.pathname && blocker.location.search === location.search && blocker.location.state?.noteBack !== token };
}
