import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Hash,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { auth, inbox, workspace } from "./runtime";
import { useAuth, useLabels, useMe } from "../shared/hooks";
import {
  ActionMenu,
  Avatar,
  IconButton,
  Logo,
  Modal,
  Spinner,
} from "../shared/ui";
import { LoginForm } from "../features/auth/AuthPage";
const LabelsManager = lazy(() => import("../features/labels/LabelsManager"));
function Sidebar({
  onLabels,
  onNavigate,
}: {
  onLabels: () => void;
  onNavigate: () => void;
}) {
  const state = useAuth();
  const query = useLabels();
  const { pathname } = useLocation();
  const allLabels = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <Link to="/notes" className="sidebar-brand" onClick={onNavigate}>
        <Logo />
      </Link>
      <div className="workspace-label">
        <span className="workspace-glyph">N</span>
        <span>
          Personal workspace<small>Just for you</small>
        </span>
        <ShieldCheck size={14} />
      </div>
      <nav className="primary-nav" aria-label="Workspace">
        <NavLink to="/notes" onClick={onNavigate}>
          <FileText size={19} />
          All notes
        </NavLink>
        <NavLink to="/reminders" onClick={onNavigate}>
          <CalendarDays size={19} />
          Reminders
        </NavLink>
        <NavLink to="/notifications" onClick={onNavigate}>
          <Bell size={19} />
          Inbox
        </NavLink>
        <NavLink to="/trash" onClick={onNavigate}>
          <Trash2 size={19} />
          Trash
        </NavLink>
      </nav>
      <div className="sidebar-section-heading">
        <span>YOUR LABELS</span>
        <IconButton
          icon={Tag}
          label="Manage labels"
          onClick={() => {
            onLabels();
            onNavigate();
          }}
        />
      </div>
      <nav className="label-nav" aria-label="Labels">
        {allLabels.map((label) => (
          <NavLink
            key={label.id}
            to={`/labels/${label.id}`}
            onClick={onNavigate}
          >
            <Hash size={17} style={{ color: label.color ?? undefined }} />
            <span>{label.name}</span>
          </NavLink>
        ))}
        {allLabels.length === 0 ? (
          <p className="sidebar-hint">A place for every kind of idea.</p>
        ) : null}
        {query.hasNextPage ? (
          <button
            className="sidebar-more"
            onClick={() => void query.fetchNextPage()}
          >
            Load more labels
          </button>
        ) : null}
        <button
          className="manage-labels"
          onClick={() => {
            onLabels();
            onNavigate();
          }}
        >
          <span>+</span>Create a label
        </button>
      </nav>
      {state.session?.roles.includes("Admin") ? (
        <>
          <div className="sidebar-section-heading">
            <span>ADMINISTRATION</span>
          </div>
          <nav className="primary-nav admin-nav" aria-label="Administration">
            <NavLink to="/admin/overview" onClick={onNavigate}>
              <LayoutDashboard size={18} />
              Overview
            </NavLink>
            <NavLink to="/admin/users" onClick={onNavigate}>
              <Users size={18} />
              Accounts
            </NavLink>
            <NavLink to="/admin/roles" onClick={onNavigate}>
              <ShieldCheck size={18} />
              Roles
            </NavLink>
            <NavLink to="/admin/audit" onClick={onNavigate}>
              <FileText size={18} />
              Audit trail
            </NavLink>
          </nav>
        </>
      ) : null}
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span>✧</span>
          <p>
            Big ideas often start
            <br />
            with a little note.
          </p>
        </div>
        <NavLink
          className={`settings-link ${pathname.startsWith("/settings") ? "active" : ""}`}
          to="/settings/profile"
          onClick={onNavigate}
        >
          <Settings size={18} />
          Settings
        </NavLink>
        <div className="sidebar-footer">
          A little space. All yours.<span>NoteTatCa</span>
        </div>
      </div>
    </>
  );
}
export default function AppShell() {
  const state = useAuth();
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [mobile, setMobile] = useState(false);
  const [manageLabels, setManageLabels] = useState(false);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ntc.theme.v1") ?? "light";
    } catch {
      return "light";
    }
  });
  const unread = useQuery({
    queryKey: workspace.key("unread"),
    queryFn: () => inbox.count(),
    enabled: state.status === "authenticated",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ntc.theme.v1", theme);
    } catch {
      /* Browser preference storage is optional. */
    }
  }, [theme]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const name =
    me.data?.profile?.fullName ||
    state.session?.fullName ||
    state.session?.givenName ||
    state.session?.userName ||
    "Your account";
  const displaySearch =
    location.pathname === "/notes" ? (params.get("q") ?? "") : search;
  return (
    <div className="app-shell">
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Sidebar onLabels={() => setManageLabels(true)} onNavigate={() => {}} />
      </aside>
      <div className="main-column">
        <header className="topbar">
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label="Open navigation"
            onClick={() => setMobile(true)}
          />
          <form
            className="global-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                "/notes" +
                  (displaySearch
                    ? "?q=" + encodeURIComponent(displaySearch)
                    : ""),
              );
            }}
          >
            <Search size={18} />
            <input
              ref={input}
              value={displaySearch}
              aria-label="Search your notes"
              placeholder="Search your notes"
              onChange={(e) => {
                setSearch(e.target.value);
                if (location.pathname === "/notes") {
                  const next = new URLSearchParams(params);
                  if (e.target.value) next.set("q", e.target.value);
                  else next.delete("q");
                  setParams(next, { replace: true });
                }
              }}
            />
            {displaySearch ? (
              <IconButton
                icon={X}
                label="Clear search"
                onClick={() => {
                  setSearch("");
                  if (location.pathname === "/notes") {
                    const next = new URLSearchParams(params);
                    next.delete("q");
                    setParams(next, { replace: true });
                  }
                }}
              />
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </form>
          <div className="topbar-actions">
            <span className="private-badge">
              <ShieldCheck size={13} />
              Private workspace
            </span>
            <IconButton
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            <div className="notification-button">
              <IconButton
                icon={Bell}
                label="Open inbox"
                onClick={() => navigate("/notifications")}
              />
              {(unread.data ?? 0) > 0 ? (
                <span>{unread.data! > 9 ? "9+" : unread.data}</span>
              ) : null}
            </div>
            <div className="topbar-divider" />
            <ActionMenu
              label="Account menu"
              items={[
                {
                  label: "Your profile",
                  icon: Users,
                  action: () => navigate("/settings/profile"),
                },
                {
                  label: "Account & security",
                  icon: Settings,
                  action: () => navigate("/settings/account"),
                },
                {
                  label: "Sessions",
                  icon: ShieldCheck,
                  action: () => navigate("/settings/sessions"),
                },
                {
                  label: "Sign out",
                  icon: LogOut,
                  separator: true,
                  action: () => navigate("/logout"),
                },
              ]}
            >
              <button
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
          </div>
        </header>
        <main className="workspace-main" id="workspace-main">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Keep what matters.</span>
          <Link to="/privacy">Privacy & data</Link>
        </footer>
      </div>
      {mobile ? (
        <Modal
          open
          onClose={() => setMobile(false)}
          title="Your workspace"
          className="navigation-drawer"
        >
          <Sidebar
            onLabels={() => setManageLabels(true)}
            onNavigate={() => setMobile(false)}
          />
        </Modal>
      ) : null}
      {manageLabels ? (
        <Suspense fallback={<Spinner />}>
          <LabelsManager onClose={() => setManageLabels(false)} />
        </Suspense>
      ) : null}
      {state.status === "expired" ? (
        <Modal
          open
          onClose={() => {}}
          title="Welcome back"
          description="Your session expired. Sign in to continue; your current draft stays in this tab."
        >
          <div className="modal-body">
            <p className="field-hint">
              Sign in to the same account to keep editing. Switching accounts
              clears this workspace and local drafts.
            </p>
            <LoginForm onDone={() => {}} />
            <button
              type="button"
              className="text-button"
              onClick={() => {
                void auth.logout();
              }}
            >
              Sign out and discard local drafts
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
