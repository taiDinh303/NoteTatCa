import { AvatarPicker, TimezoneField } from "./ProfileMedia";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./settings.css";
import { useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  KeyRound,
  Link2,
  LogOut,
  Monitor,
  Mail,
  Phone,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { account, auth, cache, workspace } from "../../app/runtime";
import type { Me } from "../../domain/models";
import { useAuth, useMe } from "../../shared/hooks";
import {
  Button,
  Avatar,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  IconButton,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { GoogleButton } from "../auth/GoogleButton";
function SettingsNav({ base }: { base: string }) {
  useLanguage();
  return (
    <nav className="settings-tabs" aria-label={tr("Settings")}>
      <NavLink to={base + "/profile"}>{tr("Profile")}</NavLink>
      <NavLink to={base + "/account"}>{tr("Account & security")}</NavLink>
      <NavLink to={base + "/sessions"}>{tr("Active sessions")}</NavLink>
    </nav>
  );
}
export default function SettingsPage({
  section,
  administration = false,
}: {
  section: "profile" | "account" | "sessions";
  administration?: boolean;
}) {
  useLanguage();
  const me = useMe();
  return (
    <>
      <SettingsNav base={administration ? "/admin/settings" : "/settings"} />
      {section === "sessions" ? (
        <Sessions />
      ) : me.isPending ? (
        <Spinner />
      ) : me.isError ? (
        <ErrorPanel error={me.error} retry={() => void me.refetch()} />
      ) : section === "profile" ? (
        <ProfileForm key={me.data.profile?.version ?? "new"} me={me.data} />
      ) : (
        <AccountSettings me={me.data} />
      )}
    </>
  );
}
function ProfileForm({ me }: { me: Me }) {
  useLanguage();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const p = me.profile;
  const [picture, setPicture] = useState(p?.picture ?? "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  return (
    <div className="settings-profile">
      <form
        className="settings-card profile-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy || avatarBusy) return;
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError(undefined);
          const body = {
            givenName: String(data.get("givenName")).trim(),
            familyName: String(data.get("familyName")).trim() || null,
            birthDate: String(data.get("birthDate")) || null,
            gender: Number(data.get("gender")),
            ...(p
              ? {
                  version: p.version,
                  picture: picture || null,
                  address: String(data.get("address")) || null,
                  locale: String(data.get("locale")) || null,
                  timeZoneId: String(data.get("timeZoneId")),
                }
              : {}),
          };
          void account
            .profile(body, !!p)
            .then((profile) => {
              cache.setQueryData<Me>(workspace.key("me"), {
                ...me,
                profile,
                account: {
                  ...me.account,
                  timeZoneId: profile.timeZoneId || me.account.timeZoneId,
                },
              });
              setEditing(false);
              toast.success(tr("Profile updated"));
            })
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <div className="profile-identity">
          <Avatar
            large
            name={p?.fullName || me.account.userName}
            picture={picture}
          />
          <div>
            <h2>{p?.fullName || tr("Your profile")}</h2>
            <p>{me.account.email}</p>
            <span className="secure-pill">
              <ShieldCheck size={13} />
              {tr("Private account")}
            </span>
          </div>
        </div>
        <ErrorBanner error={error} />
        {editing && p ? (
          <AvatarPicker
            picture={picture}
            onChange={setPicture}
            onError={setError}
            onBusy={setAvatarBusy}
            disabled={busy}
          />
        ) : null}
        {editing ? (
          <>
            <div className="form-grid">
              <Field label={tr("First name")}>
                <input
                  name="givenName"
                  autoComplete="given-name"
                  defaultValue={p?.givenName ?? ""}
                  autoFocus={params.get("edit") === "name"}
                  maxLength={25}
                  required
                />
              </Field>
              <Field label={tr("Last name")}>
                <input
                  name="familyName"
                  autoComplete="family-name"
                  defaultValue={p?.familyName ?? ""}
                  maxLength={25}
                />
              </Field>
              <Field label={tr("Birthday")}>
                <input
                  name="birthDate"
                  type="date"
                  autoComplete="bday"
                  defaultValue={p?.birthDate?.slice(0, 10) ?? ""}
                  autoFocus={params.get("edit") === "birthday"}
                />
              </Field>
              <Field label={tr("Gender")}>
                <select
                  name="gender"
                  defaultValue={p?.gender ?? 0}
                  autoFocus={params.get("edit") === "gender"}
                >
                  <option value={0}>{tr("Prefer not to say")}</option>
                  <option value={1}>{tr("Male")}</option>
                  <option value={2}>{tr("Female")}</option>
                </select>
              </Field>
            </div>
            {p ? (
              <>
                <Field label={tr("Address")}>
                  <input
                    name="address"
                    autoComplete="street-address"
                    defaultValue={p.address ?? ""}
                    maxLength={500}
                  />
                </Field>
                <div className="form-grid">
                  <TimezoneField
                    initial={p.timeZoneId || me.account.timeZoneId}
                  />
                  <Field label={tr("Locale")}>
                    <input
                      name="locale"
                      defaultValue={p.locale ?? ""}
                      placeholder="en"
                      maxLength={10}
                    />
                  </Field>
                </div>
              </>
            ) : null}
            <div className="settings-card-footer">
              <span className="field-hint">
                {tr("Your profile is only used for your account.")}
              </span>
              <div className="settings-edit-actions">
                <Button
                  variant="secondary"
                  disabled={busy || avatarBusy}
                  onClick={() => {
                    setEditing(false);
                    setPicture(p?.picture ?? "");
                    setError(undefined);
                  }}
                >
                  {tr("Cancel")}
                </Button>
                <Button busy={busy || avatarBusy} type="submit">
                  {tr("Save profile")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <dl className="settings-readonly">
              {[
                [tr("First name"), p?.givenName],
                [tr("Last name"), p?.familyName],
                [tr("Birthday"), p?.birthDate?.slice(0, 10)],
                [
                  tr("Gender"),
                  p?.gender === 1
                    ? tr("Male")
                    : p?.gender === 2
                      ? tr("Female")
                      : tr("Prefer not to say"),
                ],
                [tr("Address"), p?.address],
                [tr("Timezone"), p?.timeZoneId || me.account.timeZoneId],
                [tr("Locale"), p?.locale],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || tr("Not provided")}</dd>
                </div>
              ))}
            </dl>
            <Button
              className="profile-edit-button"
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              {tr("Edit profile")}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
function AccountSettings({ me }: { me: Me }) {
  useLanguage();
  const [params] = useSearchParams();
  const linked = useQuery({
    queryKey: workspace.key("logins"),
    queryFn: () => account.logins(),
  });
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState("");
  const [unlink, setUnlink] = useState(false);
  const [editing, setEditing] = useState("");
  function edit(section: string) {
    setError(undefined);
    setEditing(section);
  }
  const cancel = (
    <Button variant="secondary" disabled={!!busy} onClick={() => edit("")}>
      {tr("Cancel")}
    </Button>
  );
  async function run(
    key: string,
    action: () => Promise<unknown>,
    message: string,
    signOut = false,
  ) {
    setBusy(key);
    setError(undefined);
    try {
      await action();
      setEditing("");
      toast.success(message);
      if (signOut) await auth.logout();
    } catch (error) {
      setError(error);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="settings-account settings-card">
      <ErrorBanner error={error} />
      <section className="account-section">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <Mail size={21} />
          </div>
          <div>
            <h2>{tr("Email address")}</h2>
          </div>
        </div>
        <div className="form-grid account-forms">
          {editing === "email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void run(
                  "email",
                  () => account.changeEmail(String(data.get("email"))),
                  tr("Check your new inbox to confirm this email change."),
                );
              }}
            >
              <Field label={tr("New email address")}>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={256}
                  autoFocus={params.get("edit") === "email"}
                  placeholder="you@example.com"
                />
              </Field>
              <Button variant="secondary" busy={busy === "email"} type="submit">
                {tr("Send confirmation link")}
              </Button>
              {cancel}
            </form>
          ) : (
            <div className="settings-view-field account-data-row">
              <div className="account-email-value">
                <span>{me.account.email}</span>
                <span className="secure-pill">
                  <CheckCircle2 size={13} />
                  {me.account.emailConfirmed
                    ? tr("Verified")
                    : tr("Not verified")}
                </span>
              </div>
              <Button
                variant="secondary"
                disabled={!!busy}
                onClick={() => edit("email")}
              >
                {tr("Change")}
              </Button>
            </div>
          )}
        </div>
      </section>
      <section className="account-section">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <Phone size={21} />
          </div>
          <div>
            <h2>{tr("Phone number")}</h2>
          </div>
        </div>
        <div className="form-grid account-forms">
          {editing === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void run(
                  "phone",
                  async () => {
                    const value = await account.phone(
                      String(data.get("phone")) || null,
                    );
                    cache.setQueryData<Me>(workspace.key("me"), {
                      ...me,
                      account: value,
                    });
                  },
                  tr("Phone number updated"),
                );
              }}
            >
              <Field label={tr("Phone number")}>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  defaultValue={me.account.phoneNumber ?? ""}
                  maxLength={32}
                />
              </Field>
              <Button variant="secondary" busy={busy === "phone"} type="submit">
                {tr("Save phone number")}
              </Button>
              {cancel}
            </form>
          ) : (
            <div className="settings-view-field account-data-row">
              <p>{me.account.phoneNumber || tr("Not provided")}</p>
              <Button
                variant="secondary"
                disabled={!!busy}
                onClick={() => edit("phone")}
              >
                {tr("Change")}
              </Button>
            </div>
          )}
        </div>
      </section>
      <section className="account-section">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <KeyRound size={21} />
          </div>
          <div>
            <h2>{tr("Password")}</h2>
          </div>
        </div>
        {editing !== "password" ? (
          <div className="settings-view-field account-data-row">
            {me.account.hasPassword ? (
              <p>{tr("A password is set for your account.")}</p>
            ) : null}
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() => edit("password")}
            >
              {me.account.hasPassword ? tr("Change") : tr("Set your password")}
            </Button>
          </div>
        ) : me.account.hasPassword ? (
          <form
            className="password-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (data.get("newPassword") !== data.get("confirm")) {
                setError(new Error(tr("Passwords do not match.")));
                return;
              }
              void run(
                "password",
                () =>
                  account.changePassword(
                    String(data.get("currentPassword")),
                    String(data.get("newPassword")),
                  ),
                tr("Password changed. Sign in again."),
                true,
              );
            }}
          >
            <div className="form-grid">
              <Field label={tr("Current password")}>
                <input
                  type="password"
                  autoComplete="current-password"
                  name="currentPassword"
                  required
                  maxLength={1024}
                  autoFocus={params.get("edit") === "password"}
                />
              </Field>
              <Field label={tr("New password")}>
                <input
                  type="password"
                  autoComplete="new-password"
                  name="newPassword"
                  required
                  minLength={8}
                  maxLength={1024}
                />
              </Field>
              <Field label={tr("Confirm new password")}>
                <input
                  type="password"
                  autoComplete="new-password"
                  name="confirm"
                  required
                  minLength={8}
                  maxLength={1024}
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              busy={busy === "password"}
              type="submit"
            >
              {tr("Change password")}
            </Button>
            {cancel}
          </form>
        ) : (
          <div>
            <Button
              variant="secondary"
              busy={busy === "password-email"}
              onClick={() =>
                void run(
                  "password-email",
                  () => account.passwordEmail(),
                  tr("Password setup link sent to your email."),
                )
              }
            >
              {tr("Send password setup link")}
            </Button>
            {cancel}
          </div>
        )}
      </section>
      <section className="account-section">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <Link2 size={21} />
          </div>
          <div>
            <h2>{tr("Connected accounts")}</h2>
          </div>
        </div>
        {linked.isPending ? (
          <Spinner />
        ) : linked.isError ? (
          <ErrorPanel
            error={linked.error}
            retry={() => void linked.refetch()}
          />
        ) : linked.data.some((l) => l.provider === "Google") ? (
          <div className="connected-provider">
            <div className="connected-provider-label">Google</div>
            <Button variant="secondary" onClick={() => setUnlink(true)}>
              <Unlink size={15} />
              {tr("Disconnect")}
            </Button>
          </div>
        ) : (
          <GoogleButton
            label="continue_with"
            onCredential={async (token) => {
              await account.link(token);
              toast.success(tr("Google account connected. Sign in again."));
              await auth.logout();
            }}
          />
        )}
      </section>
      {unlink ? (
        <ConfirmDialog
          title={tr("Disconnect Google?")}
          description={tr(
            "You need a password or another sign-in method before removing your last login option. You will need to sign in again.",
          )}
          confirmLabel={tr("Disconnect Google")}
          onClose={() => setUnlink(false)}
          onConfirm={async () => {
            await account.unlink();
            await auth.logout();
          }}
        />
      ) : null}
    </div>
  );
}
function Sessions() {
  useLanguage();
  const state = useAuth();
  const query = useInfiniteQuery({
    queryKey: workspace.key("sessions"),
    queryFn: ({ pageParam }) => account.sessions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
  });
  const [target, setTarget] = useState<
    { id: string; current: boolean } | "all"
  >();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section className="settings-card">
      <div className="settings-card-heading">
        <div className="settings-symbol">
          <Monitor size={21} />
        </div>
        <div>
          <h2>{tr("Where you’re signed in")}</h2>
          <p>
            {tr(
              "Review your active sessions and sign out the ones you no longer use.",
            )}
          </p>
        </div>
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Monitor}
          title={tr("No active sessions")}
          description={tr("New sign-ins will appear here.")}
        />
      ) : (
        <div className="session-list">
          {items.map((session) => (
            <div className="session-row" key={session.id}>
              <Monitor size={23} />
              <div>
                <strong>
                  {session.isCurrent
                    ? tr("This session")
                    : tr("Another session")}
                  {session.isCurrent ? (
                    <span className="secure-pill">{tr("Current")}</span>
                  ) : null}
                </strong>
                <span>
                  {tr("Signed in")}
                  {dateTime(session.createdAt)} ·{" "}
                  {new Date(session.expiresAt).getUTCFullYear() >= 9999
                    ? tr("No expiration")
                    : tr("Expires {0}", dateTime(session.expiresAt))}
                </span>
              </div>
              <IconButton
                icon={LogOut}
                label={
                  session.isCurrent
                    ? tr("Sign out this session")
                    : tr("Revoke session")
                }
                onClick={() =>
                  setTarget({ id: session.id, current: session.isCurrent })
                }
              />
            </div>
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <Button variant="ghost" onClick={() => void query.fetchNextPage()}>
          {tr("Load more sessions")}
        </Button>
      ) : null}
      <div className="settings-card-footer sessions-footer">
        <span className="field-hint">
          {tr("Revoking a session also ends its refreshed replacements.")}
        </span>
        <Button variant="secondary" onClick={() => setTarget("all")}>
          {tr("Sign out everywhere")}
        </Button>
      </div>
      {target ? (
        <ConfirmDialog
          title={
            target === "all"
              ? tr("Sign out everywhere?")
              : tr("Revoke this session?")
          }
          description={tr(
            "The selected session will stop working immediately. Your account data will be kept.",
          )}
          confirmLabel={tr("Sign out")}
          danger
          onClose={() => setTarget(undefined)}
          onConfirm={async () => {
            try {
              if (target === "all") await account.revokeAll();
              else await account.revoke(target.id);
              if (target === "all" || target.current) await auth.logout();
              else await query.refetch();
            } catch (error) {
              toast.error(errorMessage(error));
              throw error;
            }
          }}
        />
      ) : null}
    </section>
  );
}
