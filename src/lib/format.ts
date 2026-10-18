import type { GitState, GitStatus } from "./types";

export function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return "never";
  const secs = Math.round((ts - now) / 1000);
  const abs = Math.abs(secs);
  if (abs < 45) return "just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (abs >= size) return rtf.format(Math.round(secs / size), unit);
  }
  return rtf.format(Math.round(secs / 60), "minute");
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(ts: number): string {
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  const k = dayKey(ts);
  if (k === today) return "Today";
  if (k === yesterday) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export interface BranchState {
  label: string;
  tone: "ok" | "info" | "warn" | "bad" | "muted";
}

export function branchState(s: GitStatus | null | undefined): BranchState {
  if (!s) return { label: "Checking…", tone: "muted" };
  const map: Record<GitState, () => BranchState> = {
    "no-repo": () => ({ label: "Not a git repo", tone: "muted" }),
    conflict: () => ({ label: `${s.conflicted} conflict${s.conflicted === 1 ? "" : "s"}`, tone: "bad" }),
    dirty: () => {
      const n = s.staged + s.unstaged + s.untracked;
      return { label: `${n} uncommitted change${n === 1 ? "" : "s"}`, tone: "warn" };
    },
    diverged: () => ({ label: `Diverged ↑${s.ahead} ↓${s.behind}`, tone: "bad" }),
    ahead: () => ({ label: `${s.ahead} to push`, tone: "info" }),
    behind: () => ({ label: `${s.behind} to pull`, tone: "warn" }),
    "no-upstream": () => ({ label: "No upstream", tone: "muted" }),
    clean: () => ({ label: "Up to date", tone: "ok" }),
  };
  return map[s.state]();
}

export function toneColor(tone: BranchState["tone"]): string {
  return { ok: "var(--ok)", info: "var(--info)", warn: "var(--warn)", bad: "var(--bad)", muted: "var(--fg-faint)" }[tone];
}

/** Extracts the first JSON object/array from an LLM answer (handles code fences and chatter). */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.search(/[[{]/);
    if (start < 0) continue;
    const open = c[start];
    const close = open === "{" ? "}" : "]";
    const end = c.lastIndexOf(close);
    if (end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1)) as T;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function joinPath(base: string, rel: string): string {
  return `${base.replace(/[\\/]+$/, "")}/${rel}`;
}
