import { account, auth, cache, workspace } from "../../app/runtime";
import type { DeviceSession, Page } from "../../domain/models";

export function warmSettings() {
  void Promise.allSettled([
    import("./SettingsIndex"),
    import("./SettingsPage"),
    import("./PreferencesPage"),
  ]);
  // Public, small preview atlases; no AI calls or generation in the background.
  void import("../mascot/mascotPreviews").then(module => module.warmMascotPreviews()).catch(() => {});
  if (auth.getSnapshot().status !== "authenticated") return;
  void cache.prefetchQuery({ queryKey: workspace.key("logins"), queryFn: () => account.logins() });
  void cache.prefetchInfiniteQuery({
    queryKey: workspace.key("sessions"),
    queryFn: ({ pageParam }) => account.sessions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: Page<DeviceSession>) => last.hasNextPage ? last.currentPage + 1 : undefined,
  });
}
