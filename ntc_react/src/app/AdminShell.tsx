import { t as tr, useLanguage } from "../shared/i18n";
import "./SidebarMotion.css";
import { useEffect, useState } from "react";
import { RouteContent } from "./RouteContent";
import { warmSettings } from "../features/settings/warmSettings";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowLeft,
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
  return (
    <>
      <Link to="/admin/overview" className="sidebar-brand" onClick={onNavigate}>
        <Logo />
      </Link>
      <div className="workspace-label admin-identity">
        <span className="workspace-glyph">
          <ShieldCheck size={19} />
        </span>
        <span>
          {tr("Administration")}
          <small>{tr("System management")}</small>
        </span>
      </div>
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
      </nav>
      <div className="sidebar-section-heading">
        <span>{tr("YOUR ADMIN ACCOUNT")}</span>
      </div>
      <nav className="primary-nav" aria-label={tr("Administrator settings")}>
        <NavLink to="/admin/settings/profile" onClick={onNavigate}>
          <Users size={18} />
          {tr("Profile")}
        </NavLink>
        <NavLink to="/admin/settings/account" onClick={onNavigate}>
          <Settings size={18} />
          {tr("Account & security")}
        </NavLink>
        <NavLink to="/admin/settings/sessions" onClick={onNavigate}>
          <ShieldCheck size={18} />
          {tr("Active sessions")}
        </NavLink>
        <NavLink to="/admin/preferences" onClick={onNavigate}>
          <Settings size={18} />
          {tr("App settings")}
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="admin-sidebar-note">
          <ShieldCheck size={20} />
          <p>
            {tr("Manage the service.")}
            <br />
            {tr("Protect everyone’s privacy.")}
          </p>
        </div>
        <div className="sidebar-footer">
          {tr("Administration console")}
          <span>NoteTatCa</span>
        </div>
      </div>
    </>
  );
}

export default function AdminShell() {
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
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className={`app-shell admin-shell ${preferenceTitle ? "settings-area" : ""}`}
    >
      <a href="#admin-main" className="skip-link">
        {tr("Skip to content")}
      </a>
      <aside className="sidebar">
        <AdminNavigation onNavigate={() => {}} />
      </aside>
      <div className="main-column">
        <header className="topbar admin-topbar">
          {preferenceTitle ? (
            <div className="preferences-mobile-header">
              <Link
                className="icon-button"
                to={
                  location.pathname === "/admin/preferences" ||
                  location.pathname === "/admin/settings"
                    ? "/admin/overview"
                    : "/admin/preferences"
                }
                aria-label={tr("Back")}
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </Link>
              <h1>{tr(preferenceTitle)}</h1>
            </div>
          ) : null}
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label={tr("Open navigation")}
            onClick={() => setMobile(true)}
          />
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
        <main className="workspace-main" id="admin-main">
          <RouteContent><Outlet /></RouteContent>
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
