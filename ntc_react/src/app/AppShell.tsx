import { SidebarLabels } from "../features/labels/SidebarLabels";
import { RouteContent } from "./RouteContent";
import { warmSettings } from "../features/settings/warmSettings";
import { t as tr, useLanguage } from "../shared/i18n";
import "./SidebarMotion.css";
import "./SidebarLayout.css";
import type { ReactNode } from "react";
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  ArrowLeft,
  Bell,
  CalendarDays,
  FileText,
  LifeBuoy,
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
import { useAuth, useLabels, useNotes } from "../shared/hooks";
import { IconButton, Logo, Modal, Spinner } from "../shared/ui";
import { SessionExpiredDialog, ShellAccountMenu } from "./ShellControls";
import { OfflineControls } from "./OfflineControls";
import { GuestBanner } from "./GuestControls";
import { useTheme } from "../shared/useTheme";
import { desktopNoteWidth, DESKTOP_NOTE_GAP } from "../shared/workspaceGrid";
const LabelsManager = lazy(() => import("../features/labels/LabelsManager"));
const Sidebar = memo(function Sidebar({
  onLabels,
  onNavigate,
  accountControls,
  mobile = false,
}: {
  onLabels: () => void;
  onNavigate: () => void;
  accountControls?: ReactNode;
  mobile?: boolean;
}) {
  useLanguage();
  const sidebarAuth = useAuth();
  const guestMode = sidebarAuth.status === "guest";
  const query = useLabels();
  const notesQuery = useNotes({});
  const trashQuery = useNotes({ trash: true });
  const remindersQuery = useNotes({ hasReminder: true });
  const unreadQuery = useQuery({
    queryKey: workspace.key("unread"),
    queryFn: () => inbox.count(),
    enabled: sidebarAuth.status === "authenticated",
    staleTime: 30_000,
  });
  const notesCount = notesQuery.data?.pages[0]?.totalItems;
  const trashCount = trashQuery.data?.pages[0]?.totalItems;
  const remindersCount = remindersQuery.data?.pages[0]?.totalItems;
  const { pathname } = useLocation();
  const allLabels = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <nav className="primary-nav" aria-label={tr("Workspace")}>
        <NavLink to="/notes" onClick={onNavigate}>
          <FileText size={19} />
          {tr("All notes")}
          {typeof notesCount === "number" ? (
            <span className="nav-count" aria-hidden="true">
              {notesCount}
            </span>
          ) : null}
        </NavLink>
        {!guestMode ? (
          <>
            <NavLink to="/reminders" onClick={onNavigate}>
              <CalendarDays size={19} />
              {tr("Reminders")}
              {typeof remindersCount === "number" ? <span className="nav-count" aria-hidden="true">{remindersCount}</span> : null}
            </NavLink>
            <NavLink to="/notifications" onClick={onNavigate}>
              <Bell size={19} />
              {tr("Inbox")}
              {typeof unreadQuery.data === "number" ? <span className="nav-count" aria-hidden="true">{unreadQuery.data}</span> : null}
            </NavLink>
          </>
        ) : null}
        <NavLink to="/trash" onClick={onNavigate}>
          <Trash2 size={19} />
          {tr("Trash")}
          {typeof trashCount === "number" ? (
            <span className="nav-count" aria-hidden="true">
              {trashCount}
            </span>
          ) : null}
        </NavLink>
      </nav>
      <button
        className="sidebar-section-heading labels-heading"
        type="button"
        aria-label={tr("Manage labels")}
        onClick={() => {
          onLabels();
          onNavigate();
        }}
      >
        <span>{tr("YOUR LABELS")}</span>
        <Tag size={14} />
      </button>
      <SidebarLabels labels={allLabels} onNavigate={onNavigate}>
        {allLabels.length === 0 ? (
          <p className="sidebar-hint">
            {tr("A place for every kind of idea.")}
          </p>
        ) : null}
        {query.hasNextPage ? (
          <button
            className="sidebar-more"
            onClick={() => void query.fetchNextPage()}
          >
            {tr("Load more labels")}
          </button>
        ) : null}
      </SidebarLabels>
      <div className="sidebar-bottom">
        {!guestMode ? (
          <>
            {accountControls}
            <NavLink
              className={`settings-link ${pathname.startsWith("/settings") ? "active" : ""}`}
              to={mobile ? "/settings" : "/settings/account"}
              onPointerEnter={warmSettings}
              onFocus={warmSettings}
              end
              onClick={onNavigate}
            >
              <Settings size={18} />
              {tr("Settings")}
            </NavLink>
            <NavLink
              className={`settings-link ${pathname === "/help" ? "active" : ""}`}
              to="/help"
              onClick={onNavigate}
            >
              <LifeBuoy size={18} />
              {tr("Help & feedback")}
            </NavLink>
          </>
        ) : null}
        <div className="sidebar-footer">
          {tr("A little space. All yours.")}
          <span>NoteTatCa</span>
        </div>
      </div>
    </>
  );
});
export default function AppShell() {
  useLanguage();
  const state = useAuth();
  useEffect(() => {
    if (state.status !== "authenticated") return;
    const timer = window.setTimeout(warmSettings, 500);
    return () => window.clearTimeout(timer);
  }, [state.status, state.session?.userId]);
  const navigate = useNavigate();
  const location = useLocation();
  const settingsTitles: Record<string, string> = {
    "/settings": "Settings",
    "/settings/language": "Language",
    "/settings/privacy": "Privacy",
    "/settings/appearance": "Appearance",
    "/settings/profile": "Profile",
    "/settings/account": "Account & security",
    "/settings/sessions": "Active sessions",
    "/help": "Help & feedback",
  };
  const settingsTitle = settingsTitles[location.pathname];
  const settingsBack =
    location.pathname === "/settings" || location.pathname === "/help"
      ? "/notes"
      : "/settings";
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
  const openLabels = useCallback(
    () => setManageLabels(true),
    [setManageLabels],
  );
  const keepNavigation = useCallback(() => {}, []);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  useLayoutEffect(() => {
    const element = shell.current;
    if (!element) return;
    function sizeSidebar() {
      if (!element) return;
      const column = element.querySelector<HTMLElement>(":scope > .main-column");
      const workspace = column?.querySelector<HTMLElement>(".workspace-main");
      if (!column || !workspace) return;
      const style = getComputedStyle(workspace);
      const fullWidth =
        window.innerWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const width = desktopNoteWidth(fullWidth) + DESKTOP_NOTE_GAP;
      const next = `${width}px`;
      if (element.style.getPropertyValue("--workspace-sidebar-width") === next)
        return;
      // A layout recalculation must not animate the main column from the CSS
      // fallback width. Only an explicit sidebar toggle should animate it.
      const transition = column.style.getPropertyValue("transition");
      const priority = column.style.getPropertyPriority("transition");
      column.style.setProperty("transition", "none", "important");
      element.style.setProperty("--workspace-sidebar-width", next);
      void column.offsetWidth;
      if (transition)
        column.style.setProperty("transition", transition, priority);
      else column.style.removeProperty("transition");
    }
    sizeSidebar();
    window.addEventListener("resize", sizeSidebar);
    return () => window.removeEventListener("resize", sizeSidebar);
  }, []);
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
      ref={shell}
      data-workspace-list={/^\/(notes|reminders|trash|notifications|labels)(\/|$)/.test(location.pathname) ? "" : undefined}
      className={`app-shell customer-shell ${sidebarHidden ? "sidebar-hidden" : ""} ${settingsTitle ? "settings-area" : ""}`}
    >
      <a href="#workspace-main" className="skip-link">
        {tr("Skip to content")}
      </a>
      <header className="topbar">
        {settingsTitle ? (
          <div className="preferences-mobile-header">
            <Link
              className="icon-button"
              to={settingsBack}
              aria-label={tr("Back")}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <h1>{tr(settingsTitle)}</h1>
          </div>
        ) : null}
        <div className="topbar-brand">
          <IconButton
            className="desktop-sidebar-toggle"
            icon={Menu}
            label={sidebarHidden ? tr("Show sidebar") : tr("Hide sidebar")}
            aria-controls="workspace-navigation"
            aria-expanded={!sidebarHidden}
            onPointerDown={(event) => {
              if (
                event.button === 0 &&
                event.isPrimary &&
                event.pointerType !== "touch"
              )
                setSidebarHidden((hidden) => !hidden);
            }}
            onClick={(event) => {
              // Mouse/pen already responded on press. Keyboard and touch still
              // activate on click, without toggling a second time on release.
              if (
                event.detail === 0 ||
                (event.nativeEvent as PointerEvent).pointerType === "touch"
              )
                setSidebarHidden((hidden) => !hidden);
            }}
          />
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label={tr("Open navigation")}
            onClick={() => setMobile(true)}
          />
          <Link
            to="/Home"
            className="header-brand"
            aria-label={tr("NoteTatCa home")}
          >
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
            aria-label={tr("Search your notes")}
            placeholder={tr("Search your notes")}
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
              label={tr("Clear search")}
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
            {tr(
              state.status === "guest"
                ? "Guest workspace"
                : "Private workspace",
            )}
          </span>
          <IconButton
            className="header-theme-toggle"
            icon={theme === "dark" ? Sun : Moon}
            label={
              theme === "dark" ? tr("Use light theme") : tr("Use dark theme")
            }
            onClick={toggleTheme}
          />
          <div className="topbar-divider" />
          <div className="header-account-menu">
            <ShellAccountMenu />
          </div>
        </div>
      </header>
      <aside
        className="sidebar"
        id="workspace-navigation"
        inert={sidebarHidden}
        aria-hidden={sidebarHidden}
      >
        <Sidebar onLabels={openLabels} onNavigate={keepNavigation} />
      </aside>
      <div className="main-column">
        <main className="workspace-main" id="workspace-main">
          <GuestBanner />
          {state.status !== "guest" ? <OfflineControls /> : null}
          <RouteContent><Outlet /></RouteContent>
        </main>
      </div>
      <Modal
        open={mobile}
        onClose={() => setMobile(false)}
        title={<Logo />}
        hideCloseButton
        dismissOnOutside
        className="navigation-drawer workspace-drawer"
      >
        <Sidebar
          mobile
          onLabels={() => setManageLabels(true)}
          onNavigate={() => setMobile(false)}
          accountControls={
            <NavLink
              to="/notifications"
              className="settings-link drawer-inbox"
              aria-label={tr("Open inbox")}
              onClick={() => {
                setMobile(false);
              }}
            >
              <Bell size={18} />
              {tr("Notifications")}
              {(unread.data ?? 0) > 0 ? (
                <span className="drawer-unread">
                  {unread.data! > 9 ? "9+" : unread.data}
                </span>
              ) : null}
            </NavLink>
          }
        />
      </Modal>
      {manageLabels ? (
        <Suspense fallback={<Spinner />}>
          <LabelsManager onClose={() => setManageLabels(false)} />
        </Suspense>
      ) : null}
      <SessionExpiredDialog />
    </div>
  );
}
