import { t as tr, useLanguage } from "../shared/i18n";
import { lazy, Suspense, useEffect, useRef } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { auth } from "./runtime";
import { homePath, isAdministrator } from "../application/access";
import { useAuth } from "../shared/hooks";
import { Spinner } from "../shared/ui";
import { Landing, NotFound, Privacy } from "../features/public/PublicPages";
import {
  ConnectionFeedback,
  ConnectionProgress,
  StartupScreen,
  WorkspaceReady,
} from "./Startup";
import { Button } from "../shared/ui";
const AuthPage = lazy(() => import("../features/auth/AuthPage"));
const AppShell = lazy(() => import("./AppShell"));
const AdminShell = lazy(() => import("./AdminShell"));
const NotesPage = lazy(() => import("../features/notes/NotesPage"));
const RemindersPage = lazy(() => import("../features/reminders/RemindersPage"));
const InboxPage = lazy(() => import("../features/inbox/InboxPage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const PreferencesPage = lazy(
  () => import("../features/settings/PreferencesPage"),
);
const AdminPage = lazy(() => import("../features/admin/AdminPage"));
function Root() {
  useLanguage();
  useEffect(() => {
    void auth.bootstrap();
  }, []);
  return (
    <ConnectionFeedback>
      <Suspense
        fallback={
          <StartupScreen title={tr("Opening your space…")}>
            <ConnectionProgress label={tr("Application loading")} />
          </StartupScreen>
        }
      >
        <Outlet />
      </Suspense>
    </ConnectionFeedback>
  );
}
function Authenticated() {
  useLanguage();
  const state = useAuth();
  const location = useLocation();
  if (state.status === "loading" || state.status === "unavailable")
    return (
      <StartupScreen
        busy={state.status === "loading"}
        title={
          state.status === "loading"
            ? tr("Restoring your session…")
            : tr("Unable to restore your session yet")
        }
      >
        {state.status === "loading" ? (
          <ConnectionProgress label={tr("Session connection progress")} />
        ) : state.status === "unavailable" ? (
          <Button onClick={() => void auth.bootstrap(true)}>
            {tr("Retry connection")}
          </Button>
        ) : null}
      </StartupScreen>
    );
  if (!state.session || state.status === "anonymous")
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <div key={auth.identity()}>
      <WorkspaceReady>
        <Outlet />
      </WorkspaceReady>
    </div>
  );
}
function WorkspaceMember() {
  useLanguage();
  const state = useAuth();
  return isAdministrator(state.session) ? (
    <Navigate to="/admin/overview" replace />
  ) : (
    <Outlet />
  );
}
function Administrator() {
  useLanguage();
  const state = useAuth();
  return isAdministrator(state.session) ? (
    <Outlet />
  ) : (
    <Navigate to={homePath(state.session)} replace />
  );
}
function SettingsArea() {
  useLanguage();
  const state = useAuth();
  const location = useLocation();
  const appPreference = [
    "/settings",
    "/settings/language",
    "/settings/privacy",
    "/settings/appearance",
  ].includes(location.pathname);
  return isAdministrator(state.session) ? (
    <Navigate
      replace
      to={
        (appPreference
          ? location.pathname.replace("/settings", "/admin/preferences")
          : "/admin" + location.pathname) + location.search
      }
    />
  ) : (
    <AppShell />
  );
}
function LegacyRedirect({ to }: { to: string }) {
  useLanguage();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={
        to +
        (to.includes("?")
          ? location.search
            ? "&" + location.search.slice(1)
            : ""
          : location.search)
      }
    />
  );
}
function NoteRoute() {
  useLanguage();
  const { id } = useParams();
  return (
    <Navigate replace to={"/notes?note=" + encodeURIComponent(id ?? "")} />
  );
}
function Logout() {
  useLanguage();
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void auth
      .logout()
      .catch(() => {})
      .finally(() => navigate("/login", { replace: true }));
  }, [navigate]);
  return <Spinner label={tr("Signing out…")} />;
}
const aliases: Record<string, string> = {
  "/Auth/Login": "/login",
  "/Auth/Register": "/register",
  "/Auth/ForgotPassword": "/forgot-password",
  "/Auth/SetPassword": "/auth/set-password",
  "/Auth/ConfirmChangeEmail": "/auth/confirm-change-email",
  "/Auth/VerifyPassword": "/verify-password",
  "/Auth/External/GoogleCallback": "/login",
  "/Auth/Logout": "/logout",
  "/Note": "/notes",
  "/Note/Trash": "/trash",
  "/Settings/Profile/Edit/Name": "/settings/profile?edit=name",
  "/Settings/Profile/Edit/Gender": "/settings/profile?edit=gender",
  "/Settings/Profile/Edit/Birthday": "/settings/profile?edit=birthday",
  "/Settings/Account/Edit/Email": "/settings/account?edit=email",
  "/Settings/Account/Edit/Password": "/settings/account?edit=password",
  "/error": "/not-found",
};
export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      { path: "/", element: <Landing redirectAuthenticated /> },
      { path: "/Home", element: <Landing /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/login", element: <AuthPage key="login" mode="login" /> },
      {
        path: "/register",
        element: <AuthPage key="register" mode="register" />,
      },
      {
        path: "/forgot-password",
        element: <AuthPage key="forgot" mode="forgot" />,
      },
      {
        path: "/verify-email",
        element: <AuthPage key="verify" mode="verify" />,
      },
      {
        path: "/auth/set-password",
        element: <AuthPage key="reset" mode="reset" />,
      },
      {
        path: "/auth/confirm-change-email",
        element: <AuthPage key="confirm" mode="confirm" />,
      },
      { path: "/logout", element: <Logout /> },
      ...Object.entries(aliases).map(([path, to]) => ({
        path,
        element: <LegacyRedirect to={to} />,
      })),
      {
        element: <Authenticated />,
        children: [
          {
            path: "/verify-password",
            element: <AuthPage key="password" mode="password" />,
          },
          {
            element: <WorkspaceMember />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { path: "/notes", element: <NotesPage /> },
                  { path: "/notes/:id", element: <NoteRoute /> },
                  { path: "/labels/:tagId", element: <NotesPage /> },
                  { path: "/trash", element: <NotesPage trash /> },
                  { path: "/reminders", element: <RemindersPage /> },
                  { path: "/notifications", element: <InboxPage /> },
                ],
              },
            ],
          },
          {
            element: <SettingsArea />,
            children: [
              {
                path: "/settings",
                element: <PreferencesPage />,
              },
              {
                path: "/settings/language",
                element: <PreferencesPage section="language" />,
              },
              {
                path: "/settings/privacy",
                element: <PreferencesPage section="privacy" />,
              },
              {
                path: "/settings/appearance",
                element: <PreferencesPage section="appearance" />,
              },
              {
                path: "/settings/profile",
                element: <SettingsPage section="profile" />,
              },
              {
                path: "/settings/account",
                element: <SettingsPage section="account" />,
              },
              {
                path: "/settings/sessions",
                element: <SettingsPage section="sessions" />,
              },
              { path: "/settings/*", element: <NotFound /> },
            ],
          },
          {
            element: <Administrator />,
            children: [
              {
                element: <AdminShell />,
                children: [
                  {
                    path: "/admin",
                    element: <Navigate to="/admin/overview" replace />,
                  },
                  {
                    path: "/admin/overview",
                    element: <AdminPage section="overview" />,
                  },
                  {
                    path: "/admin/users",
                    element: <AdminPage section="users" />,
                  },
                  {
                    path: "/admin/roles",
                    element: <AdminPage section="roles" />,
                  },
                  {
                    path: "/admin/audit",
                    element: <AdminPage section="audit" />,
                  },
                  {
                    path: "/admin/settings",
                    element: <Navigate to="/admin/settings/profile" replace />,
                  },
                  {
                    path: "/admin/settings/profile",
                    element: <SettingsPage section="profile" administration />,
                  },
                  {
                    path: "/admin/preferences",
                    element: <PreferencesPage administration />,
                  },
                  {
                    path: "/admin/preferences/language",
                    element: (
                      <PreferencesPage section="language" administration />
                    ),
                  },
                  {
                    path: "/admin/preferences/privacy",
                    element: (
                      <PreferencesPage section="privacy" administration />
                    ),
                  },
                  {
                    path: "/admin/preferences/appearance",
                    element: (
                      <PreferencesPage section="appearance" administration />
                    ),
                  },
                  {
                    path: "/admin/settings/account",
                    element: <SettingsPage section="account" administration />,
                  },
                  {
                    path: "/admin/settings/sessions",
                    element: <SettingsPage section="sessions" administration />,
                  },
                  { path: "/admin/*", element: <NotFound /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
