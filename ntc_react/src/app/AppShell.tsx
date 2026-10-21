import type { ReactNode } from "react";
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
  FileText,
  Hash,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { inbox, workspace } from "./runtime";
import { useAuth, useLabels } from "../shared/hooks";
import { IconButton, Logo, Modal, Spinner } from "../shared/ui";
import { SessionExpiredDialog, ShellAccountMenu } from "./ShellControls";
import { useTheme } from "../shared/useTheme";
const LabelsManager = lazy(() => import("../features/labels/LabelsManager"));
function Sidebar({
  onLabels,
  onNavigate,
  accountControls,
}: {
  onLabels: () => void;
  onNavigate: () => void;
  accountControls?: ReactNode;
}) {
  const query = useLabels();
  const { pathname } = useLocation();
  const allLabels = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
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
      <button
        className="sidebar-section-heading labels-heading"
        type="button"
        aria-label="Manage labels"
        onClick={() => {
          onLabels();
          onNavigate();
        }}
      >
        <span>YOUR LABELS</span>
        <Tag size={14} />
      </button>
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
      </nav>
      <div className="sidebar-bottom">
        {accountControls}
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
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [mobile, setMobile] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("ntc.sidebar.hidden.v1") === "true";
    } catch {
      return false;
    }
  });
  const [manageLabels, setManageLabels] = useState(false);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    try {
      localStorage.setItem("ntc.sidebar.hidden.v1", String(sidebarHidden));
    } catch {
      /* Layout preference storage is optional. */
    }
  }, [sidebarHidden]);
  const unread = useQuery({
    queryKey: workspace.key("unread"),
    queryFn: () => inbox.count(),
    enabled: state.status === "authenticated",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
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
  const displaySearch =
    location.pathname === "/notes" ? (params.get("q") ?? "") : search;
  return (
    <div
      className={`app-shell customer-shell ${sidebarHidden ? "sidebar-hidden" : ""}`}
    >
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
        <header className="topbar">
          <div className="topbar-brand">
          <IconButton
            className="desktop-sidebar-toggle"
            icon={Menu}
            label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
            aria-controls="workspace-navigation"
            aria-expanded={!sidebarHidden}
            onClick={() => setSidebarHidden((hidden) => !hidden)}
          />
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label="Open navigation"
            onClick={() => setMobile(true)}
          />
          <Link to="/Home" className="header-brand" aria-label="NoteTatCa home">
            <Logo />
          </Link>
          </div>
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
            ) : null}
          </form>
          <div className="topbar-actions">
            <span className="private-badge">
              <ShieldCheck size={13} />
              Private workspace
            </span>
            <IconButton
              className="header-theme-toggle"
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              onClick={toggleTheme}
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
            <div className="header-account-menu"><ShellAccountMenu /></div>
          </div>
        </header>
      <aside className="sidebar" id="workspace-navigation">
        <Sidebar onLabels={() => setManageLabels(true)} onNavigate={() => {}} />
      </aside>
      <div className="main-column">

        <main className="workspace-main" id="workspace-main">
          <Outlet />
        </main>
      </div>
      {mobile ? (
        <Modal
          open
          onClose={() => setMobile(false)}
          title="Your workspace"
          hideCloseButton
          dismissOnOutside
          className="navigation-drawer"
        >
          <Sidebar
            onLabels={() => setManageLabels(true)}
            onNavigate={() => setMobile(false)}
            accountControls={
              <div className="drawer-account-controls">
                <ShellAccountMenu onNavigate={() => setMobile(false)} />
                <button type="button" className="settings-link" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  {theme === "dark" ? "Use light theme" : "Use dark theme"}
                </button>
              </div>
            }
          />
        </Modal>
      ) : null}
      {manageLabels ? (
        <Suspense fallback={<Spinner />}>
          <LabelsManager onClose={() => setManageLabels(false)} />
        </Suspense>
      ) : null}
      <SessionExpiredDialog />
    </div>
  );
}
