import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { auth } from "./runtime";
import { settingsPath } from "../application/access";
import { useAuth, useMe } from "../shared/hooks";
import { ActionMenu, Avatar, Modal } from "../shared/ui";
import { LoginForm } from "../features/auth/AuthPage";

export function ShellAccountMenu() {
  const state = useAuth();
  const me = useMe();
  const navigate = useNavigate();
  const base = settingsPath(state.session);
  const name =
    me.data?.profile?.fullName ||
    state.session?.fullName ||
    state.session?.givenName ||
    state.session?.userName ||
    "Your account";
  return (
    <ActionMenu
      label="Account menu"
      items={[
        {
          label: "Your profile",
          icon: Users,
          action: () => navigate(base + "/profile"),
        },
        {
          label: "Account & security",
          icon: Settings,
          action: () => navigate(base + "/account"),
        },
        {
          label: "Sessions",
          icon: ShieldCheck,
          action: () => navigate(base + "/sessions"),
        },
        {
          label: "Sign out",
          icon: LogOut,
          separator: true,
          action: () => navigate("/logout"),
        },
      ]}
    >
      <button type="button" className="avatar-menu" aria-label="Account menu">
        <Avatar
          name={name}
          picture={me.data ? me.data.profile?.picture : state.session?.picture}
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
  const state = useAuth();
  if (state.status !== "expired") return null;
  return (
    <Modal
      open
      onClose={() => {}}
      title="Welcome back"
      description={
        administration
          ? "Your session expired. Sign in again to continue administering NoteTatCa."
          : "Your session expired. Sign in to continue; your current draft stays in this tab."
      }
    >
      <div className="modal-body">
        <p className="field-hint">
          {administration
            ? "Your account permissions determine which area opens after sign-in."
            : "Sign in to the same account to keep editing. Switching accounts clears this workspace and local drafts."}
        </p>
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
