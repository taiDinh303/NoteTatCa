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
  const [refreshing, setRefreshing] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title={
          section === "overview"
            ? "System overview"
            : section === "users"
              ? "Accounts"
              : section === "roles"
                ? "Roles & permissions"
                : "Audit trail"
        }
        description="Manage accounts and access. Everyone’s note content stays private."
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
          Refresh
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
            <span>{statisticsLabels[key] ?? key}</span>
            <strong>{value.toLocaleString()}</strong>
            <small>Current system total</small>
          </div>
        ))}
      </div>
      <div className="admin-quick-links">
        <Link to="/admin/users">
          <Users size={21} />
          <strong>Manage accounts</strong>
          <span>Create, review, lock or restore accounts.</span>
        </Link>
        <Link to="/admin/roles">
          <ShieldCheck size={21} />
          <strong>Roles & access</strong>
          <span>Manage roles and account memberships.</span>
        </Link>
        <Link to="/admin/audit">
          <Activity size={21} />
          <strong>Review activity</strong>
          <span>Trace administrative changes and their actors.</span>
        </Link>
      </div>
      <div className="privacy-callout">
        <ShieldCheck size={30} />
        <div>
          <h2>Privacy is part of the design.</h2>
          <p>
            Administrative access includes account metadata and aggregate
            totals. It never grants access to another person’s note titles or
            content.
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
  return (
    <div className="pager">
      <span>Page {page}</span>
      <Button
        variant="secondary"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </Button>
      <Button
        variant="secondary"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
function Accounts() {
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
            aria-label="Search accounts"
            value={search}
            placeholder="Find an account…"
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
          Include deactivated
        </label>
        <Button
          onClick={() => {
            setError(undefined);
            setCreate(true);
          }}
        >
          <Plus size={16} />
          Create account
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
                  <th>Account</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>
                    <span className="sr-only">Actions</span>
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
                          ? "Deactivated"
                          : user.isLocked
                            ? "Locked"
                            : "Active"}
                      </span>
                    </td>
                    <td>
                      {user.email}
                      <small className="table-secondary">
                        {user.emailConfirmed ? "Verified" : "Not verified"}
                      </small>
                    </td>
                    <td>{dateTime(user.createdTime)}</td>
                    <td>
                      <ActionMenu
                        label={`Manage ${user.userName}`}
                        items={[
                          {
                            label: "View account details",
                            icon: Users,
                            action: () => setDetailsFor(user),
                          },
                          {
                            label: "Manage roles",
                            icon: ShieldCheck,
                            action: () => setRolesFor(user),
                            disabled: !!user.deactivatedAt,
                          },
                          {
                            label: user.isLocked
                              ? "Unlock account"
                              : "Lock account",
                            icon: user.isLocked ? Unlock : LockKeyhole,
                            action: () =>
                              setTarget({ account: user, action: "lock" }),
                            disabled:
                              user.id === auth.session?.userId ||
                              !!user.deactivatedAt,
                          },
                          {
                            label: user.deactivatedAt
                              ? "Restore account"
                              : "Deactivate account",
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
                title="No accounts found"
                description="Try a different search."
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
          title="Create account"
          description="The account owner must verify their email before signing in."
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
                  toast.success("Account created");
                  await refresh();
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <ErrorBanner error={error} />
            <Field label="Email">
              <input type="email" name="email" maxLength={256} required />
            </Field>
            <Field label="Username">
              <input
                name="username"
                maxLength={256}
                placeholder="Defaults to email"
              />
            </Field>
            <Field label="Temporary password">
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={1024}
                required
              />
            </Field>
            <Field label="Initial role">
              <select name="role">
                <option>User</option>
                <option>Admin</option>
              </select>
            </Field>
            <Button busy={busy} type="submit">
              Create account
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
                ? "Unlock this account?"
                : "Lock this account?"
              : target.action === "deactivate"
                ? "Deactivate this account?"
                : "Restore this account?"
          }
          description={
            target.action === "restore"
              ? "Saved notes are preserved. Existing tokens stay revoked, and any lock remains in effect."
              : target.action === "deactivate"
                ? "This account will stop working, while its notes and history are kept."
                : "Changing account access takes effect immediately for existing sessions."
          }
          onClose={() => setTarget(undefined)}
          onConfirm={async () => {
            await admin.userAction(
              target.account.id,
              target.action,
              !target.account.isLocked,
            );
            await refresh();
            toast.success("Account updated");
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
      title="Account details"
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
                <dt>Account ID</dt>
                <dd>
                  <code>{account.id}</code>
                </dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>{account.userName}</dd>
              </div>
              <div>
                <dt>Account area</dt>
                <dd>{isAdmin ? "Administration only" : "Personal notes"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {account.deactivatedAt
                    ? "Deactivated"
                    : account.isLocked
                      ? "Locked"
                      : "Active"}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {account.email} ·{" "}
                  {account.emailConfirmed ? "Verified" : "Not verified"}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{account.phoneNumber || "Not provided"}</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{account.timeZoneId}</dd>
              </div>
              <div>
                <dt>Password sign-in</dt>
                <dd>{account.hasPassword ? "Available" : "Not set"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{dateTime(account.createdTime)}</dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>
                  {memberships.data?.map((role) => role.name).join(", ") ||
                    "No assigned roles"}
                </dd>
              </div>
            </dl>
            <Link
              className="button secondary"
              to={`/admin/audit?targetUserId=${encodeURIComponent(account.id)}`}
              onClick={onClose}
            >
              View account activity
            </Link>
          </>
        ) : null}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Done
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
      title="Account roles"
      description={user.email}
    >
      <div className="modal-body">
        <p className="field-hint">
          Admin accounts use administration only, even if User is also assigned.
          Role changes end the account’s active sessions.
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
                    <small>{role.description || "Application role"}</small>
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
                          toast.success("Role membership updated");
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
          Done
        </Button>
      </div>
    </Modal>
  );
}
function Roles() {
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
        <p className="muted">Built-in User and Admin roles are protected.</p>
        <Button
          onClick={() => {
            setError(undefined);
            setEditing(null);
          }}
        >
          <Plus size={16} />
          Create role
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
                <p>{role.description || "Application role"}</p>
                <div className="row-actions">
                  {["Admin", "User"].includes(role.name) ? (
                    <span className="secure-pill">
                      <Check size={12} />
                      Built-in
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
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(role)}>
                        <Trash2 size={14} />
                        Delete
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
          title={editing ? "Edit role" : "Create role"}
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
                  toast.success("Role saved");
                })
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            <ErrorBanner error={error} />
            <Field
              label="Role name"
              hint="Letters, numbers, underscores and hyphens only."
            >
              <input
                name="name"
                defaultValue={editing?.name ?? ""}
                pattern="[A-Za-z0-9_-]+"
                required
                maxLength={64}
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={editing?.description ?? ""}
                maxLength={500}
              />
            </Field>
            <Button busy={busy} type="submit">
              Save role
            </Button>
          </form>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete this role?"
          description="The role will be removed from account memberships. Administrative history will be kept."
          confirmLabel="Delete role"
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
            aria-label="Filter target account ID"
            placeholder="Target account ID…"
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            title="Enter a complete account ID (UUID)."
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
          Clear filters
        </Button>
        <select
          aria-label="Audit action filter"
          value={action}
          onChange={(e) => {
            setAction(Number(e.target.value));
            setPage(1);
          }}
        >
          {auditActions.map((name, index) => (
            <option key={name} value={index}>
              {name}
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
                  <th>Action</th>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Target account</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>
                        {auditActions[event.action] ?? "Administrative action"}
                      </strong>
                    </td>
                    <td>{dateTime(event.occurredAt)}</td>
                    <td>
                      <code>{event.actorUserId ?? "Operator"}</code>
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
                title="No matching events"
                description="Administrative changes appear here as metadata only."
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
