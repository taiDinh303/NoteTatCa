import { t as tr, useLanguage, currentLanguage } from "../../shared/i18n";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { admin, cache, workspace } from "../../app/runtime";
import type { Account, Role } from "../../domain/models";
import { useAuth, useDebounced } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  Modal,
  PageHeading,
  Spinner,
} from "../../shared/ui";
import { dateTime, initials } from "../../shared/utils";
export default function AdminPage({
  section,
}: {
  section: "overview" | "users" | "roles" | "audit";
}) {
  useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow={tr("ADMINISTRATION")}
        title={
          section === "overview"
            ? tr("System overview")
            : section === "users"
              ? tr("Accounts")
              : section === "roles"
                ? tr("Roles & permissions")
                : tr("Audit trail")
        }
        description={tr(
          "Manage accounts and access. Everyone’s note content stays private.",
        )}
      >
        <Button
          variant="secondary"
          busy={refreshing}
          onClick={() => {
            setRefreshing(true);
            const resource = {
              overview: "admin-stats",
              users: "admin-users",
              roles: "admin-roles",
              audit: "admin-audit",
            }[section];
            void cache
              .invalidateQueries({ queryKey: workspace.key(resource) })
              .finally(() => setRefreshing(false));
          }}
        >
          <RefreshCw size={16} />
          {tr("Refresh")}
        </Button>
      </PageHeading>
      {section === "overview" ? (
        <Overview />
      ) : section === "users" ? (
        <Accounts />
      ) : section === "roles" ? (
        <Roles />
      ) : (
        <Audit />
      )}
    </>
  );
}
const statisticsLabels: Record<string, string> = {
  totalAccounts: "Total accounts",
  lockedAccounts: "Locked accounts",
  activeNotes: "Active notes",
  trashedNotes: "Notes in trash",
  activeReminders: "Active reminders",
  pendingEmails: "Pending emails",
};
function Overview() {
  useLanguage();
  const query = useQuery({
    queryKey: workspace.key("admin-stats"),
    queryFn: () => admin.stats(),
  });
  return query.isPending ? (
    <Spinner />
  ) : query.isError ? (
    <ErrorPanel error={query.error} retry={() => void query.refetch()} />
  ) : (
    <>
      <div className="stat-grid">
        {Object.entries(query.data).map(([key, value], index) => (
          <div className="stat-card" key={key}>
            <div className={`stat-icon tint-${index % 3}`}>
              {index < 2 ? (
                <Users size={22} />
              ) : index < 4 ? (
                <FileText size={22} />
              ) : (
                <Activity size={22} />
              )}
            </div>
            <span>{tr(statisticsLabels[key] ?? key)}</span>
            <strong>{value.toLocaleString(currentLanguage())}</strong>
            <small>{tr("Current system total")}</small>
          </div>
        ))}
      </div>
      <div className="admin-quick-links">
        <Link to="/admin/users">
          <Users size={21} />
          <strong>{tr("Manage accounts")}</strong>
          <span>{tr("Create, review, lock or restore accounts.")}</span>
        </Link>
        <Link to="/admin/roles">
          <ShieldCheck size={21} />
          <strong>{tr("Roles & access")}</strong>
          <span>{tr("Manage roles and account memberships.")}</span>
        </Link>
        <Link to="/admin/audit">
          <Activity size={21} />
          <strong>{tr("Review activity")}</strong>
          <span>{tr("Trace administrative changes and their actors.")}</span>
        </Link>
      </div>
      <div className="privacy-callout">
        <ShieldCheck size={30} />
        <div>
          <h2>{tr("Privacy is part of the design.")}</h2>
          <p>
            {tr(
              "Administrative access includes account metadata and aggregate totals. It never grants access to another person’s note titles or content.",
            )}
          </p>
        </div>
      </div>
    </>
  );
}
function Pager({
  page,
  hasNext,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}) {
  useLanguage();
  return (
    <div className="pager">
      <span>
        {tr("Page")}
        {page}
      </span>
      <Button
        variant="secondary"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
        {tr("Previous")}
      </Button>
      <Button
        variant="secondary"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        {tr("Next")}
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
function Accounts() {
  useLanguage();
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [inactive, setInactive] = useState(false);
  const [create, setCreate] = useState(false);
  const [detailsFor, setDetailsFor] = useState<Account>();
  const [rolesFor, setRolesFor] = useState<Account>();
  const [target, setTarget] = useState<{
    account: Account;
    action: "lock" | "deactivate" | "restore";
  }>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: workspace.key("admin-users", page, q, inactive),
    queryFn: () => admin.users(page, q, inactive),
  });
  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: workspace.key("admin-users") }),
      cache.invalidateQueries({ queryKey: workspace.key("admin-stats") }),
      cache.invalidateQueries({ queryKey: workspace.key("admin-audit") }),
    ]);
  }
  return (
    <>
      <div className="table-toolbar">
        <div className="table-search">
          <Search size={17} />
          <input
            aria-label={tr("Search accounts")}
            value={search}
            placeholder={tr("Find an account…")}
            maxLength={200}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={inactive}
            onChange={(e) => {
              setInactive(e.target.checked);
              setPage(1);
            }}
          />
          {tr("Include deactivated")}
        </label>
        <Button
          onClick={() => {
            setError(undefined);
            setCreate(true);
          }}
        >
          <Plus size={16} />
          {tr("Create account")}
        </Button>
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Account")}</th>
                  <th>{tr("Status")}</th>
                  <th>{tr("Email")}</th>
                  <th>{tr("Created")}</th>
                  <th>
                    <span className="sr-only">{tr("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="table-person">
                        <span className="avatar">
                          {initials(user.userName)}
                        </span>
                        <div>
                          <strong>{user.userName}</strong>
                          <small>{user.id.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${!user.deactivatedAt && !user.isLocked ? "success" : ""}`}
                      >
                        {user.deactivatedAt
                          ? tr("Deactivated")
                          : user.isLocked
                            ? tr("Locked")
                            : tr("Active")}
                      </span>
                    </td>
                    <td>
                      {user.email}
                      <small className="table-secondary">
                        {user.emailConfirmed
                          ? tr("Verified")
                          : tr("Not verified")}
                      </small>
                    </td>
                    <td>{dateTime(user.createdTime)}</td>
                    <td>
                      <ActionMenu
                        label={tr("Manage {0}", user.userName)}
                        items={[
                          {
                            label: tr("View account details"),
                            icon: Users,
                            action: () => setDetailsFor(user),
                          },
                          {
                            label: tr("Manage roles"),
                            icon: ShieldCheck,
                            action: () => setRolesFor(user),
                            disabled: !!user.deactivatedAt,
                          },
                          {
                            label: user.isLocked
                              ? tr("Unlock account")
                              : tr("Lock account"),
                            icon: user.isLocked ? Unlock : LockKeyhole,
                            action: () =>
                              setTarget({ account: user, action: "lock" }),
                            disabled:
                              user.id === auth.session?.userId ||
                              !!user.deactivatedAt,
                          },
                          {
                            label: user.deactivatedAt
                              ? tr("Restore account")
                              : tr("Deactivate account"),
                            icon: user.deactivatedAt ? RotateCcw : UserRoundX,
                            danger: !user.deactivatedAt,
                            action: () =>
                              setTarget({
                                account: user,
                                action: user.deactivatedAt
                                  ? "restore"
                                  : "deactivate",
                              }),
                            disabled: user.id === auth.session?.userId,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {query.data.items.length === 0 ? (
              <EmptyState
                icon={Users}
                title={tr("No accounts found")}
                description={tr("Try a different search.")}
              />
            ) : null}
          </div>
          <Pager
            page={page}
            hasNext={query.data.hasNextPage}
            onChange={setPage}
          />
        </>
      )}
      {create ? (
        <Modal
          open
          onClose={() => setCreate(false)}
          title={tr("Create account")}
          description={tr(
            "The account owner must verify their email before signing in.",
          )}
        >
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setBusy(true);
              setError(undefined);
              void admin
                .createUser({
                  email: data.get("email"),
                  username: data.get("username"),
                  password: data.get("password"),
                  role: data.get("role"),
                })
                .then(async () => {
                  setCreate(false);
                  toast.success(tr("Account created"));
                  await refresh();
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <ErrorBanner error={error} />
            <Field label={tr("Email")}>
              <input type="email" name="email" maxLength={256} required />
            </Field>
            <Field label={tr("Username")}>
              <input
                name="username"
                maxLength={256}
                placeholder={tr("Defaults to email")}
              />
            </Field>
            <Field label={tr("Temporary password")}>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={1024}
                required
              />
            </Field>
            <Field label={tr("Initial role")}>
              <select name="role">
                <option>{tr("User")}</option>
                <option>{tr("Admin")}</option>
              </select>
            </Field>
            <Button busy={busy} type="submit">
              {tr("Create account")}
            </Button>
          </form>
        </Modal>
      ) : null}
      {rolesFor ? (
        <Memberships user={rolesFor} onClose={() => setRolesFor(undefined)} />
      ) : null}
      {detailsFor ? (
        <AccountDetails
          user={detailsFor}
          onClose={() => setDetailsFor(undefined)}
        />
      ) : null}
      {target ? (
        <ConfirmDialog
          title={
            target.action === "lock"
              ? target.account.isLocked
                ? tr("Unlock this account?")
                : tr("Lock this account?")
              : target.action === "deactivate"
                ? tr("Deactivate this account?")
                : tr("Restore this account?")
          }
          description={
            target.action === "restore"
              ? tr(
                  "Saved notes are preserved. Existing tokens stay revoked, and any lock remains in effect.",
                )
              : target.action === "deactivate"
                ? tr(
                    "This account will stop working, while its notes and history are kept.",
                  )
                : tr(
                    "Changing account access takes effect immediately for existing sessions.",
                  )
          }
          onClose={() => setTarget(undefined)}
          onConfirm={async () => {
            await admin.userAction(
              target.account.id,
              target.action,
              !target.account.isLocked,
            );
            await refresh();
            toast.success(tr("Account updated"));
          }}
        />
      ) : null}
    </>
  );
}
function AccountDetails({
  user,
  onClose,
}: {
  user: Account;
  onClose: () => void;
}) {
  useLanguage();
  const details = useQuery({
    queryKey: workspace.key("admin-user", user.id),
    queryFn: () => admin.user(user.id),
  });
  const memberships = useQuery({
    queryKey: workspace.key("memberships", user.id),
    queryFn: () => admin.memberships(user.id),
  });
  const account = details.data;
  const isAdmin = memberships.data?.some((role) => role.name === "Admin");
  return (
    <Modal
      open
      onClose={onClose}
      title={tr("Account details")}
      description={user.email}
    >
      <div className="modal-body">
        {details.isPending || memberships.isPending ? (
          <Spinner />
        ) : details.isError || memberships.isError ? (
          <ErrorPanel
            error={details.error ?? memberships.error}
            retry={() => {
              void details.refetch();
              void memberships.refetch();
            }}
          />
        ) : account ? (
          <>
            <dl className="admin-account-details">
              <div>
                <dt>{tr("Account ID")}</dt>
                <dd>
                  <code>{account.id}</code>
                </dd>
              </div>
              <div>
                <dt>{tr("Username")}</dt>
                <dd>{account.userName}</dd>
              </div>
              <div>
                <dt>{tr("Account area")}</dt>
                <dd>
                  {isAdmin ? tr("Administration only") : tr("Personal notes")}
                </dd>
              </div>
              <div>
                <dt>{tr("Status")}</dt>
                <dd>
                  {account.deactivatedAt
                    ? tr("Deactivated")
                    : account.isLocked
                      ? tr("Locked")
                      : tr("Active")}
                </dd>
              </div>
              <div>
                <dt>{tr("Email")}</dt>
                <dd>
                  {account.email} ·{" "}
                  {account.emailConfirmed ? tr("Verified") : tr("Not verified")}
                </dd>
              </div>
              <div>
                <dt>{tr("Phone")}</dt>
                <dd>{account.phoneNumber || tr("Not provided")}</dd>
              </div>
              <div>
                <dt>{tr("Timezone")}</dt>
                <dd>{account.timeZoneId}</dd>
              </div>
              <div>
                <dt>{tr("Password sign-in")}</dt>
                <dd>{account.hasPassword ? tr("Available") : tr("Not set")}</dd>
              </div>
              <div>
                <dt>{tr("Created")}</dt>
                <dd>{dateTime(account.createdTime)}</dd>
              </div>
              <div>
                <dt>{tr("Roles")}</dt>
                <dd>
                  {memberships.data?.map((role) => role.name).join(", ") ||
                    tr("No assigned roles")}
                </dd>
              </div>
            </dl>
            <Link
              className="button secondary"
              to={`/admin/audit?targetUserId=${encodeURIComponent(account.id)}`}
              onClick={onClose}
            >
              {tr("View account activity")}
            </Link>
          </>
        ) : null}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          {tr("Done")}
        </Button>
      </div>
    </Modal>
  );
}
function Memberships({
  user,
  onClose,
}: {
  user: Account;
  onClose: () => void;
}) {
  useLanguage();
  const current = useAuth();
  const [rolePage, setRolePage] = useState(1);
  const roles = useQuery({
    queryKey: workspace.key("admin-roles", rolePage),
    queryFn: () => admin.roles(rolePage),
  });
  const memberships = useQuery({
    queryKey: workspace.key("memberships", user.id),
    queryFn: () => admin.memberships(user.id),
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<unknown>();
  return (
    <Modal
      open
      onClose={onClose}
      title={tr("Account roles")}
      description={user.email}
    >
      <div className="modal-body">
        <p className="field-hint">
          {tr(
            "Admin accounts use administration only, even if User is also assigned. Role changes end the account’s active sessions.",
          )}
        </p>
        <ErrorBanner error={error} />
        {roles.isPending || memberships.isPending ? (
          <Spinner />
        ) : roles.isError || memberships.isError ? (
          <ErrorPanel
            error={roles.error ?? memberships.error}
            retry={() => {
              void roles.refetch();
              void memberships.refetch();
            }}
          />
        ) : (
          <>
            {roles.data.items.map((role) => {
              const active = memberships.data.some((m) => m.id === role.id);
              return (
                <label key={role.id} className="membership-row">
                  <span>
                    <strong>{role.name}</strong>
                    <small>{role.description || tr("Application role")}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={
                      !!busy ||
                      (current.session?.userId === user.id &&
                        role.name === "Admin")
                    }
                    onChange={() => {
                      setBusy(role.id);
                      setError(undefined);
                      void admin
                        .membership(user.id, role.id, !active)
                        .then(async () => {
                          await memberships.refetch();
                          await Promise.all([
                            cache.invalidateQueries({
                              queryKey: workspace.key("admin-audit"),
                            }),
                            cache.invalidateQueries({
                              queryKey: workspace.key("admin-users"),
                            }),
                          ]);
                          toast.success(tr("Role membership updated"));
                        })
                        .catch(setError)
                        .finally(() => setBusy(""));
                    }}
                  />
                </label>
              );
            })}
            <Pager
              page={rolePage}
              hasNext={roles.data.hasNextPage}
              onChange={setRolePage}
            />
          </>
        )}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          {tr("Done")}
        </Button>
      </div>
    </Modal>
  );
}
function Roles() {
  useLanguage();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: workspace.key("admin-roles", page),
    queryFn: () => admin.roles(page),
  });
  const [editing, setEditing] = useState<Role | null | undefined>();
  const [deleting, setDeleting] = useState<Role>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  async function refresh() {
    await cache.invalidateQueries({ queryKey: workspace.key("admin-roles") });
    await cache.invalidateQueries({ queryKey: workspace.key("memberships") });
  }
  return (
    <>
      <div className="table-toolbar">
        <p className="muted">
          {tr("Built-in User and Admin roles are protected.")}
        </p>
        <Button
          onClick={() => {
            setError(undefined);
            setEditing(null);
          }}
        >
          <Plus size={16} />
          {tr("Create role")}
        </Button>
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="roles-grid">
            {query.data.items.map((role) => (
              <article className="settings-card role-card" key={role.id}>
                <span className="settings-symbol">
                  <ShieldCheck size={22} />
                </span>
                <h2>{role.name}</h2>
                <p>{role.description || tr("Application role")}</p>
                <div className="row-actions">
                  {["Admin", "User"].includes(role.name) ? (
                    <span className="secure-pill">
                      <Check size={12} />
                      {tr("Built-in")}
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setError(undefined);
                          setEditing(role);
                        }}
                      >
                        <Pencil size={14} />
                        {tr("Edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(role)}>
                        <Trash2 size={14} />
                        {tr("Delete")}
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pager
            page={page}
            hasNext={query.data.hasNextPage}
            onChange={setPage}
          />
        </>
      )}
      {editing !== undefined ? (
        <Modal
          open
          onClose={() => setEditing(undefined)}
          title={editing ? tr("Edit role") : tr("Create role")}
        >
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setBusy(true);
              setError(undefined);
              void admin
                .saveRole(
                  {
                    name: data.get("name"),
                    description: String(data.get("description")) || null,
                  },
                  editing?.id,
                )
                .then(async () => {
                  await refresh();
                  setEditing(undefined);
                  toast.success(tr("Role saved"));
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <ErrorBanner error={error} />
            <Field
              label={tr("Role name")}
              hint={tr("Letters, numbers, underscores and hyphens only.")}
            >
              <input
                name="name"
                defaultValue={editing?.name ?? ""}
                pattern="[A-Za-z0-9_-]+"
                required
                maxLength={64}
              />
            </Field>
            <Field label={tr("Description")}>
              <textarea
                name="description"
                defaultValue={editing?.description ?? ""}
                maxLength={500}
              />
            </Field>
            <Button busy={busy} type="submit">
              {tr("Save role")}
            </Button>
          </form>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={tr("Delete this role?")}
          description={tr(
            "The role will be removed from account memberships. Administrative history will be kept.",
          )}
          confirmLabel={tr("Delete role")}
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await admin.deleteRole(deleting.id);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}
const auditActions = [
  "All actions",
  "Account locked",
  "Account unlocked",
  "Account created",
  "Account deactivated",
  "Role granted",
  "Role revoked",
  "Role created",
  "Role updated",
  "Role deactivated",
  "Role deleted",
  "Administrator granted",
  "Account restored",
];
function Audit() {
  useLanguage();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(0);
  const target = params.get("targetUserId") ?? "";
  const [targetInput, setTargetInput] = useState(target);
  const query = useQuery({
    queryKey: workspace.key("admin-audit", page, target, action),
    queryFn: () => admin.audit(page, target || undefined, action || undefined),
  });
  return (
    <>
      <div className="table-toolbar">
        <form
          className="table-search"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params);
            if (targetInput.trim())
              next.set("targetUserId", targetInput.trim());
            else next.delete("targetUserId");
            setParams(next);
            setPage(1);
          }}
        >
          <Search size={16} />
          <input
            aria-label={tr("Filter target account ID")}
            placeholder={tr("Target account ID…")}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            title={tr("Enter a complete account ID (UUID).")}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
          />
        </form>
        <Button
          variant="secondary"
          onClick={() => {
            setParams({});
            setTargetInput("");
            setAction(0);
            setPage(1);
          }}
        >
          {tr("Clear filters")}
        </Button>
        <select
          aria-label={tr("Audit action filter")}
          value={action}
          onChange={(e) => {
            setAction(Number(e.target.value));
            setPage(1);
          }}
        >
          {auditActions.map((name, index) => (
            <option key={name} value={index}>
              {tr(name)}
            </option>
          ))}
        </select>
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{tr("Action")}</th>
                  <th>{tr("Time")}</th>
                  <th>{tr("Actor")}</th>
                  <th>{tr("Target account")}</th>
                  <th>{tr("Role")}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>
                        {tr(
                          auditActions[event.action] ?? "Administrative action",
                        )}
                      </strong>
                    </td>
                    <td>{dateTime(event.occurredAt)}</td>
                    <td>
                      <code>{event.actorUserId ?? tr("Operator")}</code>
                    </td>
                    <td>
                      <code>{event.targetUserId ?? "—"}</code>
                    </td>
                    <td>
                      <code>{event.roleId ?? "—"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.data.items.length ? (
              <EmptyState
                icon={Activity}
                title={tr("No matching events")}
                description={tr(
                  "Administrative changes appear here as metadata only.",
                )}
              />
            ) : null}
          </div>
          <Pager
            page={page}
            hasNext={query.data.hasNextPage}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
