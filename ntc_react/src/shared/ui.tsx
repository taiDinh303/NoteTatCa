import { t as tr, useLanguage } from "./i18n";
import {
  Children,
  cloneElement,
  Component,
  isValidElement,
  useId,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ErrorInfo,
  ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { initials, validationMessage } from "./utils";
export function Avatar({
  name,
  picture,
  large = false,
}: {
  name: string;
  picture?: string | null;
  large?: boolean;
}) {
  useLanguage();
  const [failed, setFailed] = useState<string>();
  return (
    <span className={large ? "large-avatar" : "avatar"}>
      {(picture?.startsWith("https://") ||
        picture?.startsWith("data:image/png;base64,")) &&
      picture !== failed ? (
        <img
          src={picture}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(picture)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  useLanguage();
  return (
    <span className="brand">
      <span className="brand-mark">
        <FileText size={21} strokeWidth={2} />
      </span>
      {!compact && (
        <span>
          NoteTatCa<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
export function Button({
  children,
  variant = "primary",
  busy = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
}) {
  useLanguage();
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${className}`}
      aria-busy={busy || undefined}
    >
      {busy ? <LoaderCircle className="spin" size={16} /> : null}
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  useLanguage();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`icon-button ${active ? "active" : ""} ${className}`}
    >
      <Icon size={18} />
    </button>
  );
}
function associateField(
  children: ReactNode,
  id: string,
  description: string | undefined,
  invalid: boolean,
): ReactNode {
  let assigned = false;
  const associate = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (
        !isValidElement<{
          children?: ReactNode;
          id?: string;
          "aria-describedby"?: string;
          "aria-invalid"?: boolean;
        }>(child)
      )
        return child;
      if (
        !assigned &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
      ) {
        assigned = true;
        return cloneElement(child, {
          id,
          "aria-describedby": description,
          "aria-invalid": invalid || undefined,
        });
      }
      return child.props.children
        ? cloneElement(child, { children: associate(child.props.children) })
        : child;
    });
  return associate(children);
}
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  useLanguage();
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {associateField(
        children,
        id,
        hint || error ? `${id}-help` : undefined,
        !!error,
      )}
      {hint || error ? (
        <span id={`${id}-help`}>
          {hint ? <span className="field-hint">{hint}</span> : null}
          {error ? <span className="field-error">{error}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
export function Spinner({ label = tr("Loading…") }: { label?: string }) {
  useLanguage();
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={24} className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function ErrorBanner({ error }: { error: unknown }) {
  useLanguage();
  return error ? (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} />
      <span>{validationMessage(error)}</span>
    </div>
  ) : null;
}
export function ErrorPanel({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  useLanguage();
  return (
    <div className="error-panel">
      <ErrorBanner error={error} />
      {retry ? (
        <Button variant="secondary" onClick={retry}>
          {tr("Try again")}
        </Button>
      ) : null}
    </div>
  );
}
export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  useLanguage();
  return (
    <div className="empty-state">
      <div className="empty-art">
        <Icon size={34} strokeWidth={1.35} />
        <span />
        <span />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  useLanguage();
  return (
    <header className="page-heading">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children ? <div className="heading-actions">{children}</div> : null}
    </header>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  className = "",
  hideTitle = false,
  hideCloseButton = false,
  dismissOnOutside = false,
  style,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  hideTitle?: boolean;
  hideCloseButton?: boolean;
  dismissOnOutside?: boolean;
  style?: CSSProperties;
}) {
  useLanguage();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? "wide" : ""} ${className}`}
          style={style}
          onPointerDownOutside={(e) => {
            if (!dismissOnOutside) e.preventDefault();
          }}
        >
          <div className={hideTitle ? "modal-title-hidden" : "modal-header"}>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description
                className={description ? "modal-description" : "sr-only"}
              >
                {description ?? title}
              </Dialog.Description>
            </div>
            {!hideTitle && !hideCloseButton ? (
              <IconButton
                icon={X}
                label={tr("Close dialog")}
                onClick={onClose}
              />
            ) : null}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmDialog({
  title,
  description,
  confirmLabel = tr("Confirm"),
  onConfirm,
  onClose,
  danger = false,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown> | unknown;
  onClose: () => void;
  danger?: boolean;
}) {
  useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      description={description}
    >
      <div className="modal-body">
        <ErrorBanner error={error} />
      </div>
      <div className="modal-footer">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {tr("Cancel")}
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          busy={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            Promise.resolve()
              .then(onConfirm)
              .then(onClose)
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export interface MenuAction {
  label: string;
  action: () => void;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
}
export function ActionMenu({
  items,
  label = tr("More actions"),
  children,
}: {
  items: MenuAction[];
  label?: string;
  children?: ReactNode;
}) {
  useLanguage();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        {children ?? <IconButton icon={MoreHorizontal} label={label} />}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="dropdown" sideOffset={7} align="end">
          {items.map((item, i) => (
            <span key={item.label}>
              {item.separator && i > 0 ? (
                <Dropdown.Separator className="dropdown-separator" />
              ) : null}
              <Dropdown.Item
                className={`dropdown-item ${item.danger ? "danger-text" : ""}`}
                disabled={item.disabled}
                onSelect={item.action}
              >
                {item.icon ? (
                  <item.icon size={16} />
                ) : item.checked ? (
                  <Check size={16} />
                ) : (
                  <span className="menu-icon-space" />
                )}
                <span>{item.label}</span>
              </Dropdown.Item>
            </span>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function Select({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  useLanguage();
  return (
    <div className="select-wrap">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}
export function SkeletonCards() {
  useLanguage();
  return (
    <div className="note-grid" aria-label={tr("Loading notes")} role="status">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="note-skeleton">
          <div />
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Avoid logging private note payloads. */
  }
  render() {
    return this.state.error ? (
      <main className="crash-page">
        <Logo />
        <h1>{tr("Something didn’t load correctly.")}</h1>
        <p>
          {tr(
            "Your saved notes are still on the server. Reopen the app to try again.",
          )}
        </p>
        <Button onClick={() => location.assign("/notes")}>
          {tr("Reopen NoteTatCa")}
        </Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
