import type { DeviceSession, Page } from "../domain/models";
import { useEffect } from "react";
import { useAuth } from "../shared/hooks";
import { account, admin, auth, cache } from "./runtime";
import { isAdministrator } from "../application/access";

/** Shells mount after priority notes preparation; secondary reads never gate navigation. */
export function useBackgroundPages() {
  const state = useAuth();
  const id = state.status === "authenticated" ? state.session?.userId : undefined;
  const administrator = !!state.session && isAdministrator(state.session);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const guard = () => {
      if (cancelled || auth.getSnapshot().status !== "authenticated" || auth.getSnapshot().session?.userId !== id)
        throw new DOMException("Session changed", "AbortError");
    };
    const read = <T,>(parts: unknown[], load: () => Promise<T>) => cache.prefetchQuery({
      queryKey: ["private", id, ...parts], staleTime: 300_000, retry: false,
      queryFn: async () => { guard(); const data = await load(); guard(); return data; },
    });
    const tasks: (() => Promise<unknown>)[] = [
      () => read(["logins"], () => account.logins()),
      () => cache.prefetchInfiniteQuery({
        queryKey: ["private", id, "sessions"], initialPageParam: 1, staleTime: 300_000, retry: false,
        queryFn: async ({pageParam}) => { guard(); const data = await account.sessions(pageParam); guard(); return data; },
        getNextPageParam: (last: Page<DeviceSession>) => last.hasNextPage ? last.currentPage + 1 : undefined,
      }),
    ];
    if (administrator) tasks.push(
      () => read(["admin-users", 1, "", false], () => admin.users()),
      () => read(["admin-roles", 1], () => admin.roles()),
      () => read(["admin-audit", 1, "", 0], () => admin.audit()),
      () => read(["admin-deliveries", 1, {userId:"",status:"",from:"",to:""}], () => admin.deliveries()),
      () => read(["admin-announcements", 1], () => admin.announcements()),
      () => import("../features/admin/ReminderDeliveries"),
      () => import("../features/admin/AnnouncementsPage"),
    );
    else tasks.unshift(
      async () => { const vault = await import("../features/hidden/vaultRuntime"); guard(); await vault.loadVaultStatus(); },
      () => import("../features/hidden/HiddenNotes"),
      () => import("../features/hidden/VaultRecovery"),
    );
    tasks.push(() => import("../features/settings/SettingsPage"), () => import("../features/settings/PrivacySettings"), () => import("../features/help/HelpPage"));
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < tasks.length) { const task = tasks[next++]; try { guard(); await task(); } catch { /* Own page handles errors and retry. */ } }
    };
    void Promise.all([worker(), worker()]);
    return () => { cancelled = true; };
  }, [id, administrator]);
}
