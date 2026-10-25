import { t as tr, useLanguage } from "../shared/i18n";
import { useRef, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Settings,
  RefreshCw,
  LogIn,
  Copy,
} from "lucide-react";
import {
  auth,
  offline,
  cache,
  workspace,
  onlineWorkspace,
  guest,
} from "./runtime";
import { settingsPath, isAdministrator } from "../application/access";
import { toast } from "sonner";
import { errorMessage } from "../shared/utils";
import { useAuth, useMe } from "../shared/hooks";
import { ActionMenu, Avatar, Modal } from "../shared/ui";
import { LoginForm } from "../features/auth/AuthPage";
import { ZoomDropdown } from "../shared/ZoomMenu";

export function ShellAccountMenu({
  onNavigate,
}: { onNavigate?: () => void } = {}) {
  useLanguage();
  const state = useAuth();
  const guestData = useSyncExternalStore(guest.subscribe, guest.getSnapshot);
  const guestMode = state.status === "guest";
  const me = useMe();
  const navigate = useNavigate();
  const base = settingsPath(state.session);
  function navigateTo(path: string) {
    void navigate(path);
    onNavigate?.();
  }
  const trigger = useRef<HTMLButtonElement>(null);
  const name =
    me.data?.profile?.fullName ||
    state.session?.fullName ||
    state.session?.givenName ||
    state.session?.userName ||
    tr("Your account");
  return (
    <ActionMenu
      label={tr("Account menu")}
      extra={<ZoomDropdown />}
      items={[
        ...(guestMode
          ? [
              {
                label: tr("Sign in"),
                icon: LogIn,
                action: () => {
                  guest.requestImport();
                  navigateTo("/login");
                },
              },
            ]
          : []),
        ...(!guestMode && !isAdministrator(state.session)
          ? [
              {
                label: tr("Sync now"),
                icon: RefreshCw,
                action: () => {
                  void (async () => {
                    if (!navigator.onLine)
                      throw new Error(tr("Working offline"));
                    if (!onlineWorkspace()) await auth.refresh();
                    await offline.sync();
                    await cache.invalidateQueries({
                      queryKey: workspace.key("notes"),
                    });
                  })().catch((error) => toast.error(errorMessage(error)));
                },
              },
            ]
          : []),
        ...(!guestMode && !isAdministrator(state.session) && guestData.exists
          ? [
              {
                label: tr("Copy guest notes"),
                icon: Copy,
                action: () => guest.requestImport(),
              },
            ]
          : []),
        ...(!guestMode
          ? [
              {
                label: tr("Account settings"),
                icon: Settings,
                action: () => navigateTo(base + "/profile"),
              },
            ]
          : []),
        {
          label: tr(guestMode ? "Leave guest mode" : "Sign out"),
          icon: LogOut,
          separator: true,
          action: () => navigateTo("/logout"),
        },
      ]}
    >
      <button
        ref={trigger}
        type="button"
        className="avatar-menu"
        aria-label={tr("Account menu")}
      >
        <Avatar
          name={name}
          picture={
            me.data ? me.data.profile?.picture : state.session?.picture
          }
        />
        <span className="account-name">{name.split(" ")[0]}</span>
        <ChevronDown size={12} />
      </button>
    </ActionMenu>
  );
}

export function SessionExpiredDialog({
  administration = false,
}: {
  administration?: boolean;
}) {
  useLanguage();
  const state = useAuth();
  if (state.status !== "expired") return null;
  const description = administration
    ? tr(
        "Your session expired. Sign in again to continue administering NoteTatCa.",
      )
    : tr(
        "Your session expired. Sign in to continue; your current draft stays in this tab.",
      );
  const hint = administration
    ? tr("Your account permissions determine which area opens after sign-in.")
    : tr(
        "Sign in to the same account to keep editing. Switching accounts clears this workspace and local drafts.",
      );
  return (
    <Modal
      open
      onClose={() => {}}
      title={tr("Welcome back")}
      description={description}
    >
      <div className="modal-body">
        <p className="field-hint">{hint}</p>
        <LoginForm onDone={() => {}} />
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void auth.logout();
          }}
        >
          {administration
            ? tr("Sign out")
            : tr("Sign out and discard local drafts")}
        </button>
      </div>
    </Modal>
  );
}
