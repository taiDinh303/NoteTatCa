import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Settings,
  ZoomIn,
} from "lucide-react";
import { auth } from "./runtime";
import { settingsPath } from "../application/access";
import { useAuth, useMe } from "../shared/hooks";
import { ActionMenu, Avatar, Modal } from "../shared/ui";
import { LoginForm } from "../features/auth/AuthPage";
import { useDisplayZoom } from "../shared/displayZoom";
import { ZoomDialog } from "../shared/ZoomDialog";

export function ShellAccountMenu({ onNavigate }: { onNavigate?: () => void } = {}) {
  const state = useAuth();
  const me = useMe();
  const navigate = useNavigate();
  const base = settingsPath(state.session);
  function navigateTo(path: string) {
    void navigate(path);
    onNavigate?.();
  }
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoom = useDisplayZoom();
  const trigger = useRef<HTMLButtonElement>(null);
  const name =
    me.data?.profile?.fullName ||
    state.session?.fullName ||
    state.session?.givenName ||
    state.session?.userName ||
    "Your account";
  return (
    <>
      <ActionMenu
        label="Account menu"
        items={[
          {
            label: "Account settings",
            icon: Settings,
            action: () => navigateTo(base + "/profile"),
          },
          {
            label: `Zoom (${zoom.percent}%)`,
            icon: ZoomIn,
            action: () => setZoomOpen(true),
          },
          {
            label: "Sign out",
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
          aria-label="Account menu"
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
      {zoomOpen ? (
        <ZoomDialog
          onClose={() => {
            setZoomOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}

export function SessionExpiredDialog({
  administration = false,
}: {
  administration?: boolean;
}) {
  const state = useAuth();
  if (state.status !== "expired") return null;
  const description = administration
    ? "Your session expired. Sign in again to continue administering NoteTatCa."
    : "Your session expired. Sign in to continue; your current draft stays in this tab.";
  const hint = administration
    ? "Your account permissions determine which area opens after sign-in."
    : "Sign in to the same account to keep editing. Switching accounts clears this workspace and local drafts.";
  return (
    <Modal
      open
      onClose={() => {}}
      title="Welcome back"
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
          {administration ? "Sign out" : "Sign out and discard local drafts"}
        </button>
      </div>
    </Modal>
  );
}
