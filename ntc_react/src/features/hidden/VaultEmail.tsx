import { useMe } from "../../shared/hooks";

export function VaultEmail() {
  const me = useMe();
  const email = me.data?.account.email;
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const visible = at > 1 ? email.slice(0, Math.floor(at / 2)) : "";
  return <p className="vault-email">{visible + "****" + email.slice(at)}</p>;
}
