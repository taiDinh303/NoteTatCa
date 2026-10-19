import { useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  KeyRound,
  Link2,
  LogOut,
  Monitor,
  ShieldCheck,
  Unlink,
  UserRound,
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
  PageHeading,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { GoogleButton } from "../auth/GoogleButton";
function SettingsNav({ base }: { base: string }) {
  return (
    <nav className="settings-tabs" aria-label="Settings">
      <NavLink to={base + "/profile"}>Profile</NavLink>
      <NavLink to={base + "/account"}>Account & security</NavLink>
      <NavLink to={base + "/sessions"}>Active sessions</NavLink>
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
  const me = useMe();
  return (
    <>
      <PageHeading
        eyebrow={
          administration ? "YOUR ADMIN ACCOUNT" : "MAKE YOURSELF AT HOME"
        }
        title="Settings"
        description={
          administration
            ? "Manage your administrator profile, security and active sessions."
            : "A few details that make this space yours."
        }
      />
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
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const p = me.profile;
  const [picture, setPicture] = useState(p?.picture ?? "");
  return (
    <div className="settings-columns">
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
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
              toast.success("Profile updated");
            })
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <UserRound size={21} />
          </div>
          <div>
            <h2>Personal details</h2>
            <p>A name, a face, a little about you.</p>
          </div>
        </div>
        <ErrorBanner error={error} />
        <div className="form-grid">
          <Field label="First name">
            <input
              name="givenName"
              autoComplete="given-name"
              defaultValue={p?.givenName ?? ""}
              autoFocus={params.get("edit") === "name"}
              maxLength={25}
              required
            />
          </Field>
          <Field label="Last name">
            <input
              name="familyName"
              autoComplete="family-name"
              defaultValue={p?.familyName ?? ""}
              maxLength={25}
            />
          </Field>
          <Field label="Birthday">
            <input
              name="birthDate"
              type="date"
              autoComplete="bday"
              defaultValue={p?.birthDate?.slice(0, 10) ?? ""}
              autoFocus={params.get("edit") === "birthday"}
            />
          </Field>
          <Field label="Gender">
            <select
              name="gender"
              defaultValue={p?.gender ?? 0}
              autoFocus={params.get("edit") === "gender"}
            >
              <option value={0}>Prefer not to say</option>
              <option value={1}>Male</option>
              <option value={2}>Female</option>
            </select>
          </Field>
        </div>
        {p ? (
          <>
            <Field label="Profile picture URL" hint="Optional HTTPS image URL.">
              <input
                type="url"
                value={picture}
                onChange={(e) => setPicture(e.target.value)}
                placeholder="https://"
                maxLength={2048}
              />
            </Field>
            <Field label="Address">
              <input
                name="address"
                autoComplete="street-address"
                defaultValue={p.address ?? ""}
                maxLength={500}
              />
            </Field>
            <div className="form-grid">
              <Field label="Timezone">
                <input
                  name="timeZoneId"
                  defaultValue={p.timeZoneId || "Asia/Ho_Chi_Minh"}
                  required
                  maxLength={100}
                  list="profile-zones"
                />
                <datalist id="profile-zones">
                  <option>Asia/Ho_Chi_Minh</option>
                  <option>UTC</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                </datalist>
              </Field>
              <Field label="Locale">
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
            Your profile is only used for your account.
          </span>
          <Button busy={busy} type="submit">
            Save profile
          </Button>
        </div>
      </form>
      <aside>
        <div className="profile-summary settings-card">
          <Avatar
            large
            name={p?.fullName || me.account.userName}
            picture={picture}
          />
          <h3>{p?.fullName || "Your profile"}</h3>
          <p>{me.account.email}</p>
          <span className="secure-pill">
            <ShieldCheck size={13} />
            Private account
          </span>
        </div>
        <div className="settings-tip">
          <span>✧</span>
          <h3>On your time.</h3>
          <p>Your timezone keeps recurring reminders in step with your day.</p>
        </div>
      </aside>
    </div>
  );
}
function AccountSettings({ me }: { me: Me }) {
  const [params] = useSearchParams();
  const linked = useQuery({
    queryKey: workspace.key("logins"),
    queryFn: () => account.logins(),
  });
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState("");
  const [unlink, setUnlink] = useState(false);
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
      toast.success(message);
      if (signOut) await auth.logout();
    } catch (error) {
      setError(error);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="settings-stack">
      <ErrorBanner error={error} />
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h2>Account details</h2>
            <p>Keep your contact details up to date.</p>
          </div>
        </div>
        <div className="account-email">
          <div>
            <span className="field-label">Current email</span>
            <strong>{me.account.email}</strong>
          </div>
          <span className="secure-pill">
            <CheckCircle2 size={13} />
            {me.account.emailConfirmed ? "Verified" : "Not verified"}
          </span>
        </div>
        <div className="form-grid account-forms">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(
                "email",
                () => account.changeEmail(String(data.get("email"))),
                "Check your new inbox to confirm this email change.",
              );
            }}
          >
            <Field label="New email address">
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
              Send confirmation link
            </Button>
          </form>
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
                "Phone number updated",
              );
            }}
          >
            <Field label="Phone number">
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                defaultValue={me.account.phoneNumber ?? ""}
                maxLength={32}
              />
            </Field>
            <Button variant="secondary" busy={busy === "phone"} type="submit">
              Save phone number
            </Button>
          </form>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <KeyRound size={21} />
          </div>
          <div>
            <h2>Password</h2>
            <p>
              {me.account.hasPassword
                ? "Change your password to keep your account secure."
                : "Set a password to add another sign-in method."}
            </p>
          </div>
        </div>
        {me.account.hasPassword ? (
          <form
            className="password-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (data.get("newPassword") !== data.get("confirm")) {
                setError(new Error("Passwords do not match."));
                return;
              }
              void run(
                "password",
                () =>
                  account.changePassword(
                    String(data.get("currentPassword")),
                    String(data.get("newPassword")),
                  ),
                "Password changed. Sign in again.",
                true,
              );
            }}
          >
            <div className="form-grid">
              <Field label="Current password">
                <input
                  type="password"
                  autoComplete="current-password"
                  name="currentPassword"
                  required
                  maxLength={1024}
                  autoFocus={params.get("edit") === "password"}
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  autoComplete="new-password"
                  name="newPassword"
                  required
                  minLength={8}
                  maxLength={1024}
                />
              </Field>
              <Field label="Confirm new password">
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
              Change password
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            busy={busy === "password-email"}
            onClick={() =>
              void run(
                "password-email",
                () => account.passwordEmail(),
                "Password setup link sent to your email.",
              )
            }
          >
            Send password setup link
          </Button>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-card-heading">
          <div className="settings-symbol">
            <Link2 size={21} />
          </div>
          <div>
            <h2>Connected accounts</h2>
            <p>Choose how you sign in.</p>
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
            <span className="google-g">G</span>
            <div>
              <strong>Google</strong>
              <span>Connected</span>
            </div>
            <Button variant="secondary" onClick={() => setUnlink(true)}>
              <Unlink size={15} />
              Disconnect
            </Button>
          </div>
        ) : (
          <GoogleButton
            label="continue_with"
            onCredential={async (token) => {
              await account.link(token);
              toast.success("Google account connected. Sign in again.");
              await auth.logout();
            }}
          />
        )}
      </section>
      {unlink ? (
        <ConfirmDialog
          title="Disconnect Google?"
          description="You need a password or another sign-in method before removing your last login option. You will need to sign in again."
          confirmLabel="Disconnect Google"
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
          <h2>Where you’re signed in</h2>
          <p>
            Review your active sessions and sign out the ones you no longer use.
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
          title="No active sessions"
          description="New sign-ins will appear here."
        />
      ) : (
        <div className="session-list">
          {items.map((session) => (
            <div className="session-row" key={session.id}>
              <Monitor size={23} />
              <div>
                <strong>
                  {session.isCurrent ? "This session" : "Another session"}
                  {session.isCurrent ? (
                    <span className="secure-pill">Current</span>
                  ) : null}
                </strong>
                <span>
                  Signed in {dateTime(session.createdAt)} · Expires{" "}
                  {dateTime(session.expiresAt)}
                </span>
              </div>
              <IconButton
                icon={LogOut}
                label={
                  session.isCurrent ? "Sign out this session" : "Revoke session"
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
          Load more sessions
        </Button>
      ) : null}
      <div className="settings-card-footer">
        <span className="field-hint">
          Revoking a session also ends its refreshed replacements.
        </span>
        <Button variant="secondary" onClick={() => setTarget("all")}>
          Sign out everywhere
        </Button>
      </div>
      {target ? (
        <ConfirmDialog
          title={
            target === "all" ? "Sign out everywhere?" : "Revoke this session?"
          }
          description="The selected session will stop working immediately. Your account data will be kept."
          confirmLabel="Sign out"
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
