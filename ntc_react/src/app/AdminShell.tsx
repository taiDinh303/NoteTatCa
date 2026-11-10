import { t as tr, useLanguage } from "../shared/i18n";
import { MobileBack } from "./MobileBack";
import { useMobileWorkspaceEntry } from "./useMobileWorkspaceEntry";
import "./SidebarMotion.css";
import "./AdminShell.css";
import { useEffect, useState } from "react";
import { RouteContent } from "./RouteContent";
import { warmSettings } from "../features/settings/warmSettings";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { IconButton, Logo, Modal } from "../shared/ui";
import { useTheme } from "../shared/useTheme";
import { SessionExpiredDialog, ShellAccountMenu } from "./ShellControls";

function AdminNavigation({ onNavigate }: { onNavigate: () => void }) {
  useLanguage();
  const { pathname } = useLocation();
  return (
    <>
      <nav className="primary-nav" aria-label={tr("Administration")}>
        <NavLink to="/admin/overview" onClick={onNavigate}>
          <LayoutDashboard size={19} />
          {tr("Overview")}
        </NavLink>
        <NavLink to="/admin/users" onClick={onNavigate}>
          <Users size={19} />
          {tr("Accounts")}
        </NavLink>
        <NavLink to="/admin/roles" onClick={onNavigate}>
          <ShieldCheck size={19} />
          {tr("Roles")}
        </NavLink>
        <NavLink to="/admin/audit" onClick={onNavigate}>
          <FileText size={19} />
          {tr("Audit trail")}
        </NavLink>
        <NavLink to="/admin/reminder-deliveries" onClick={onNavigate}>
          <Activity size={19} />
          {tr("Reminder deliveries")}
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <NavLink
          to="/admin/settings"
          className={`settings-link ${/^\/admin\/(settings|preferences)(\/|$)/.test(pathname) ? "active" : ""}`}
          onPointerEnter={warmSettings}
          onFocus={warmSettings}
          onClick={onNavigate}
        >
          <Settings size={18} />
          {tr("Settings")}
        </NavLink>
        <div className="sidebar-footer">
          {tr("Administration console")}
          <span>NoteTatCa</span>
        </div>
      </div>
    </>
  );
}

export default function AdminShell() {
  useMobileWorkspaceEntry("/admin/overview");
  useEffect(() => {
    const timer = window.setTimeout(warmSettings, 500);
    return () => window.clearTimeout(timer);
  }, []);
  useLanguage();
  const location = useLocation();
  const preferenceTitles: Record<string, string> = {
    "/admin/settings": "Settings",
    "/admin/settings/profile": "Profile",
    "/admin/settings/account": "Account & security",
    "/admin/settings/sessions": "Active sessions",
    "/admin/preferences": "Settings",
    "/admin/preferences/language": "Language",
    "/admin/preferences/privacy": "Privacy",
    "/admin/preferences/appearance": "Appearance",
  };
  const preferenceTitle = preferenceTitles[location.pathname];
  const [mobile, setMobile] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("ntc.admin.sidebar.hidden.v1") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "ntc.admin.sidebar.hidden.v1",
        String(sidebarHidden),
      );
    } catch {
      // Navigation remains usable when browser storage is unavailable.
    }
  }, [sidebarHidden]);
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className={`app-shell admin-shell ${sidebarHidden ? "sidebar-hidden" : ""} ${preferenceTitle ? "settings-area" : ""}`}
    >
      <a href="#admin-main" className="skip-link">
        {tr("Skip to content")}
      </a>
      <header className="topbar admin-topbar">
        {preferenceTitle ? (
          <div className="preferences-mobile-header">
            <MobileBack className="icon-button" fallback={
                location.pathname === "/admin/preferences" ||
                location.pathname === "/admin/settings"
                  ? "/admin/overview"
                  : "/admin/preferences"
              }
            />
            <h1>{tr(preferenceTitle)}</h1>
          </div>
        ) : null}
        <div className="topbar-brand">
          {!preferenceTitle ? <MobileBack fallback="/admin/overview" /> : null}
          <IconButton
            className="desktop-sidebar-toggle"
            icon={Menu}
            label={sidebarHidden ? tr("Show sidebar") : tr("Hide sidebar")}
            aria-controls="admin-navigation"
            aria-expanded={!sidebarHidden}
            onClick={() => setSidebarHidden((hidden) => !hidden)}
          />
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label={tr("Open navigation")}
            onClick={() => setMobile(true)}
          />
          <Link
            to="/admin/overview"
            className="header-brand"
            aria-label={tr("Admin console")}
          >
            <Logo />
          </Link>
        </div>
        <Link to="/admin/overview" className="admin-console-title">
          <ShieldCheck size={20} />
          <span>{tr("Admin console")}</span>
        </Link>
        <div className="topbar-actions">
          <span className="private-badge">
            <ShieldCheck size={13} />
            {tr("Administrator")}
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
          <ShellAccountMenu />
        </div>
      </header>
      <aside
        className="sidebar"
        id="admin-navigation"
        inert={sidebarHidden}
        aria-hidden={sidebarHidden}
      >
        <AdminNavigation onNavigate={() => {}} />
      </aside>
      <div className="main-column">
        <main className="workspace-main" id="admin-main">
          <RouteContent>
            <Outlet />
          </RouteContent>
        </main>
      </div>
      <Modal
        open={mobile}
        onClose={() => setMobile(false)}
        title={tr("Administration navigation")}
        hideCloseButton
        dismissOnOutside
        className="navigation-drawer"
      >
        <AdminNavigation onNavigate={() => setMobile(false)} />
      </Modal>
      <SessionExpiredDialog administration />
    </div>
  );
}
