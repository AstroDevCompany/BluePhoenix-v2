import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleAlert, CircleCheck, Info, Loader2, X } from "lucide-react";
import { useStore } from "../lib/store";

// ---------- dropdown menu ----------

export interface MenuItem {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  header?: boolean;
}

export function Dropdown({
  children,
  items,
  align = "end",
  width = 230,
}: {
  children: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  width?: number;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<CSSProperties>({ visibility: "hidden" });
  const trigger = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!rect || !panel.current) return;
    const h = panel.current.offsetHeight;
    let top = rect.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - 6);
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    setPos({ top, left, width, visibility: "visible" });
  }, [rect, align, width]);

  useEffect(() => {
    if (!rect) return;
    const close = () => setRect(null);
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [rect]);

  const toggle = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setPos({ visibility: "hidden" });
    setRect((r) => (r ? null : trigger.current!.getBoundingClientRect()));
  };

  return (
    <>
      <span ref={trigger} onClick={toggle} className="inline-flex">
        {children}
      </span>
      {rect &&
        createPortal(
          <div
            ref={panel}
            className="glass-strong menu pop fixed z-[200] max-h-[70vh] overflow-y-auto"
            style={{ ...pos, minWidth: width }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it, i) =>
              it.separator ? (
                <div key={i} className="menu-sep" />
              ) : it.header ? (
                <div key={i} className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
                  {it.label}
                </div>
              ) : (
                <button
                  key={i}
                  className="menu-item"
                  disabled={it.disabled}
                  style={it.danger ? { color: "var(--bad)" } : undefined}
                  onClick={() => {
                    setRect(null);
                    it.onClick?.();
                  }}
                >
                  <span className="flex w-4 shrink-0 justify-center opacity-80">{it.icon}</span>
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.checked && <Check size={14} />}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Primary action with a drop-down arrow for alternatives. */
export function SplitButton({
  icon,
  label,
  onClick,
  items,
  disabled,
  primary,
  title,
}: {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  items: MenuItem[];
  disabled?: boolean;
  primary?: boolean;
  title?: string;
}) {
  const cls = primary ? "btn btn-primary" : "btn";
  return (
    <div className="flex min-w-0" onClick={(e) => e.stopPropagation()}>
      <button
        className={`${cls} min-w-0 rounded-r-none`}
        disabled={disabled}
        onClick={onClick}
        title={title}
        style={{ borderRight: "1px solid color-mix(in srgb, currentColor 18%, transparent)" }}
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
      <Dropdown items={items} align="end">
        <button className={`${cls} btn-icon w-7 rounded-l-none`} disabled={disabled || items.length === 0} aria-label="More options">
          <ChevronDown size={14} />
        </button>
      </Dropdown>
    </div>
  );
}

// ---------- modal ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-6"
      style={{ background: "rgba(10,14,30,0.35)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-strong pop flex max-h-full w-full flex-col" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- toasts ----------

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[300] flex w-[340px] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="glass-strong pop pointer-events-auto flex gap-3 p-3 pr-2">
          <div className="mt-0.5 shrink-0">
            {t.kind === "success" ? (
              <CircleCheck size={18} color="var(--ok)" />
            ) : t.kind === "error" ? (
              <CircleAlert size={18} color="var(--bad)" />
            ) : (
              <Info size={18} color="var(--info)" />
            )}
          </div>
          <div className="selectable min-w-0 flex-1">
            <div className="text-[13px] font-semibold">{t.title}</div>
            {t.detail && <div className="mt-0.5 max-h-28 overflow-y-auto text-xs break-words whitespace-pre-wrap text-[var(--fg-muted)]">{t.detail}</div>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- small pieces ----------

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />;
}

export function Pill({ children, color, title }: { children: ReactNode; color?: string; title?: string }) {
  return (
    <span className="pill" style={color ? ({ "--pill": color } as CSSProperties) : undefined} title={title}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} data-active={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--fg-faint)]">{hint}</p>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="text-[var(--fg-faint)]">{icon}</div>
      <div className="text-[15px] font-semibold">{title}</div>
      {children && <div className="max-w-sm text-[13px] text-[var(--fg-muted)]">{children}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-[var(--line)] bg-[var(--hover)] px-1.5 py-px font-sans text-[11px] text-[var(--fg-muted)]">
      {children}
    </kbd>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ background: checked ? "var(--accent)" : "var(--line)" }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

export function useConfirm() {
  // Lightweight in-app confirmation (native confirm() is blocked in some webviews).
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (message: string) => new Promise<boolean>((resolve) => setState({ message, resolve }));
  const node = (
    <Modal
      open={!!state}
      onClose={() => {
        state?.resolve(false);
        setState(null);
      }}
      title="Are you sure?"
      width={420}
      footer={
        <>
          <button
            className="btn"
            onClick={() => {
              state?.resolve(false);
              setState(null);
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              state?.resolve(true);
              setState(null);
            }}
          >
            Confirm
          </button>
        </>
      }
    >
      <p className="text-[13px] text-[var(--fg-muted)]">{state?.message}</p>
    </Modal>
  );
  return { confirm, node };
}

export function Github({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
