import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
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
          Administration<small>System management</small>
        </span>
      </div>
      <nav className="primary-nav" aria-label="Administration">
        <NavLink to="/admin/overview" onClick={onNavigate}>
          <LayoutDashboard size={19} />
          Overview
        </NavLink>
        <NavLink to="/admin/users" onClick={onNavigate}>
          <Users size={19} />
          Accounts
        </NavLink>
        <NavLink to="/admin/roles" onClick={onNavigate}>
          <ShieldCheck size={19} />
          Roles
        </NavLink>
        <NavLink to="/admin/audit" onClick={onNavigate}>
          <FileText size={19} />
          Audit trail
        </NavLink>
      </nav>
      <div className="sidebar-section-heading">
        <span>YOUR ADMIN ACCOUNT</span>
      </div>
      <nav className="primary-nav" aria-label="Administrator settings">
        <NavLink to="/admin/settings/profile" onClick={onNavigate}>
          <Users size={18} />
          Profile
        </NavLink>
        <NavLink to="/admin/settings/account" onClick={onNavigate}>
          <Settings size={18} />
          Account & security
        </NavLink>
        <NavLink to="/admin/settings/sessions" onClick={onNavigate}>
          <ShieldCheck size={18} />
          Active sessions
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="admin-sidebar-note">
          <ShieldCheck size={20} />
          <p>
            Manage the service.
            <br />
            Protect everyone’s privacy.
          </p>
        </div>
        <div className="sidebar-footer">
          Administration console<span>NoteTatCa</span>
        </div>
      </div>
    </>
  );
}

export default function AdminShell() {
  const [mobile, setMobile] = useState(false);
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="app-shell admin-shell">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <AdminNavigation onNavigate={() => {}} />
      </aside>
      <div className="main-column">
        <header className="topbar admin-topbar">
          <IconButton
            className="mobile-menu-button"
            icon={Menu}
            label="Open navigation"
            onClick={() => setMobile(true)}
          />
          <Link to="/admin/overview" className="admin-console-title">
            <ShieldCheck size={20} />
            <span>Admin console</span>
          </Link>
          <div className="topbar-actions">
            <span className="private-badge">
              <ShieldCheck size={13} />
              Administrator
            </span>
            <IconButton
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              onClick={toggleTheme}
            />
            <div className="topbar-divider" />
            <ShellAccountMenu />
          </div>
        </header>
        <main className="workspace-main" id="admin-main">
          <Outlet />
        </main>
      </div>
      {mobile ? (
        <Modal
          open
          onClose={() => setMobile(false)}
          title="Administration navigation"
          className="navigation-drawer"
        >
          <AdminNavigation onNavigate={() => setMobile(false)} />
        </Modal>
      ) : null}
      <SessionExpiredDialog administration />
    </div>
  );
}
