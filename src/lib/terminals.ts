import { listen } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { create } from "zustand";
import { api } from "./api";
import { isDark, onThemeChange } from "./theme";

interface Session {
  id: string;
  projectId: string;
  title: string;
  term: Terminal;
  fit: FitAddon;
  el: HTMLDivElement;
}

const sessions = new Map<string, Session>();

export interface TermMeta {
  id: string;
  projectId: string;
  title: string;
  exited: boolean;
}

interface TermStore {
  list: TermMeta[];
  active: Record<string, string | undefined>;
  setActive: (projectId: string, id: string) => void;
}

export const useTerms = create<TermStore>((set) => ({
  list: [],
  active: {},
  setActive: (projectId, id) => set((s) => ({ active: { ...s.active, [projectId]: id } })),
}));

function theme(dark: boolean) {
  return dark
    ? { background: "#00000000", foreground: "#e8ebf7", cursor: "#e8ebf7", selectionBackground: "#4f8cff55" }
    : { background: "#00000000", foreground: "#1b2236", cursor: "#1b2236", selectionBackground: "#4f8cff44" };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let listening = false;
async function ensureListeners() {
  if (listening) return;
  listening = true;
  await listen<{ id: string; data: string }>("pty-data", (e) => {
    sessions.get(e.payload.id)?.term.write(b64ToBytes(e.payload.data));
  });
  await listen<{ id: string }>("pty-exit", (e) => {
    const s = sessions.get(e.payload.id);
    s?.term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n");
    useTerms.setState((st) => ({ list: st.list.map((t) => (t.id === e.payload.id ? { ...t, exited: true } : t)) }));
  });
  onThemeChange((dark) => sessions.forEach((s) => (s.term.options.theme = theme(dark))));
}

export async function openSession(projectId: string, cwd: string, title: string, command?: string): Promise<string> {
  await ensureListeners();
  const term = new Terminal({
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: 13,
    cursorBlink: true,
    allowTransparency: true,
    scrollback: 5000,
    theme: theme(isDark()),
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  const el = document.createElement("div");
  el.style.height = "100%";
  term.open(el);
  const id = await api.ptyOpen(cwd, command, term.cols, term.rows);
  term.onData((d) => void api.ptyWrite(id, d).catch(() => undefined));
  term.onResize(({ cols, rows }) => void api.ptyResize(id, cols, rows).catch(() => undefined));
  sessions.set(id, { id, projectId, title, term, fit, el });
  useTerms.setState((st) => ({
    list: [...st.list, { id, projectId, title, exited: false }],
    active: { ...st.active, [projectId]: id },
  }));
  return id;
}

export function attachSession(id: string, container: HTMLElement): () => void {
  const s = sessions.get(id);
  if (!s) return () => undefined;
  container.appendChild(s.el);
  const doFit = () => {
    try {
      s.fit.fit();
    } catch {
      /* container not measurable yet */
    }
  };
  requestAnimationFrame(() => {
    doFit();
    s.term.focus();
  });
  const ro = new ResizeObserver(doFit);
  ro.observe(container);
  return () => {
    ro.disconnect();
    if (s.el.parentElement === container) container.removeChild(s.el);
  };
}

export async function closeSession(id: string) {
  const s = sessions.get(id);
  sessions.delete(id);
  s?.term.dispose();
  await api.ptyClose(id).catch(() => undefined);
  useTerms.setState((st) => {
    const list = st.list.filter((t) => t.id !== id);
    const active = { ...st.active };
    for (const [pid, aid] of Object.entries(active)) {
      if (aid === id) active[pid] = list.filter((t) => t.projectId === pid).at(-1)?.id;
    }
    return { list, active };
  });
}

export function closeProjectSessions(projectId: string) {
  useTerms
    .getState()
    .list.filter((t) => t.projectId === projectId)
    .forEach((t) => void closeSession(t.id));
}
