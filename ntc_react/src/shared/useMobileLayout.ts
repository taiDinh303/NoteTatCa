import { useSyncExternalStore } from "react";
/** Mobile layout media query. AND terms must be grouped in parentheses: a
    mixed `a or b and c` query is rejected by Chromium (`media: "not all"`),
    which silently disables every consumer (mobile layout, back buffer, zoom). */
export const MOBILE_LAYOUT_QUERY =
  "(max-width: 800px) or ((orientation: landscape) and (max-height: 500px))";
const query = MOBILE_LAYOUT_QUERY;
function subscribe(changed: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
export function useMobileLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
