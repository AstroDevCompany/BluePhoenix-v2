import { Pencil, Play, Plus, ScanSearch, Sparkles, Star, Terminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { scanCommands } from "../lib/ai";
import { runCommand } from "../lib/actions";
import { api, errMsg, uid } from "../lib/api";
import { useStore } from "../lib/store";
import type { Command, DetectedCommand, Project } from "../lib/types";
import { Empty, Field, Modal, Spinner, useConfirm } from "../components/ui";

export default function CommandsTab({ project: p }: { project: Project }) {
  const toast = useStore((s) => s.toast);
  const loadCommands = useStore((s) => s.loadCommands);
  const loadProjects = useStore((s) => s.loadProjects);
  const [cmds, setCmds] = useState<Command[]>([]);
  const [edit, setEdit] = useState<Command | null>(null);
  const [busy, setBusy] = useState<"detect" | "ai" | null>(null);
  const [found, setFound] = useState<DetectedCommand[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { confirm, node } = useConfirm();

  const reload = useCallback(async () => {
    setCmds(await loadCommands(p.id));
  }, [p.id, loadCommands]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function importCommands(list: DetectedCommand[]) {
    const known = new Set(cmds.map((c) => c.command));
    let sort = cmds.length;
    let n = 0;
    for (const c of list) {
      if (known.has(c.command)) continue;
      await api.saveCommand({ id: uid(), projectId: p.id, label: c.label, command: c.command, cwd: null, source: c.source === "ai" ? "ai" : "auto", sort: sort++ });
      n++;
    }
    await reload();
    return n;
  }

  async function detect() {
    setBusy("detect");
    try {
      const d = await api.detect(p.path);
      const n = await importCommands(d.commands);
      toast({ kind: n ? "success" : "info", title: n ? `Added ${n} detected command${n === 1 ? "" : "s"}` : "No new commands found" });
    } catch (e) {
      toast({ kind: "error", title: "Detection failed", detail: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function ai() {
    setBusy("ai");
    try {
      const list = (await scanCommands(p.path)).filter((c) => !cmds.some((x) => x.command === c.command));
      if (list.length === 0) toast({ kind: "info", title: "AI found nothing new" });
      else {
        setFound(list);
        setPicked(new Set(list.map((c) => c.command)));
      }
    } catch (e) {
      toast({ kind: "error", title: "AI scan failed", detail: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!edit || !edit.label.trim() || !edit.command.trim()) return;
    await api.saveCommand({ ...edit, label: edit.label.trim(), command: edit.command.trim(), cwd: edit.cwd?.trim() || null });
    setEdit(null);
    await reload();
  }

  const makeDefault = async (c: Command) => {
    await api.saveProject({ ...p, defaultCommandId: c.id });
    await loadProjects();
    toast({ kind: "success", title: `“${c.label}” is now the main action` });
  };

  const hasFolder = p.path.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), projectId: p.id, label: "", command: "", cwd: null, source: "manual", sort: cmds.length })}>
          <Plus size={14} /> Add command
        </button>
        <button className="btn" onClick={detect} disabled={!hasFolder || !!busy}>
          {busy === "detect" ? <Spinner size={14} /> : <ScanSearch size={14} />} Detect from project
        </button>
        <button className="btn" onClick={ai} disabled={!hasFolder || !!busy}>
          {busy === "ai" ? <Spinner size={14} /> : <Sparkles size={14} />} Scan with AI
        </button>
      </div>

      <div className="glass overflow-hidden">
        {cmds.length === 0 ? (
          <Empty icon={<Terminal size={30} />} title="No commands yet">
            Add commands to build, test or start this project with one click. BluePhoenix can detect them automatically.
          </Empty>
        ) : (
          <ul className="p-1.5">
            {cmds.map((c) => (
              <li key={c.id} className="row-hover group flex items-center gap-3 rounded-xl px-3 py-2">
                <button className="btn btn-ghost btn-icon btn-sm" aria-label="Make main action" title="Use as the main action on the dashboard" onClick={() => void makeDefault(c)}>
                  <Star size={14} fill={p.defaultCommandId === c.id ? "#f5b301" : "none"} color={p.defaultCommandId === c.id ? "#f5b301" : "currentColor"} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium">
                    {c.label}
                    {c.source === "ai" && <Sparkles size={12} className="text-[var(--accent)]" aria-label="Found by AI" />}
                  </div>
                  <code className="selectable block truncate font-mono text-xs text-[var(--fg-muted)]">{c.command}</code>
                </div>
                <button className="btn btn-sm" onClick={() => void runCommand(p, c, "embedded")}>
                  <Play size={12} /> Run
                </button>
                <button className="btn btn-sm" onClick={() => void runCommand(p, c, "system")} title="Run in the system terminal">
                  <Terminal size={12} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" aria-label="Edit" onClick={() => setEdit(c)}>
                  <Pencil size={13} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  aria-label="Delete"
                  onClick={async () => {
                    if (await confirm(`Delete the command “${c.label}”?`)) {
                      await api.deleteCommand(c.id);
                      await reload();
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={cmds.some((c) => c.id === edit?.id) ? "Edit command" : "Add command"}
        footer={
          <>
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => void saveEdit()} disabled={!edit?.label.trim() || !edit?.command.trim()}>Save</button>
          </>
        }
      >
        {edit && (
          <div className="flex flex-col gap-3">
            <Field label="Name"><input className="input" autoFocus value={edit.label} placeholder="Build release" onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></Field>
            <Field label="Command"><input className="input font-mono" value={edit.command} placeholder="pnpm tauri build" onChange={(e) => setEdit({ ...edit, command: e.target.value })} /></Field>
            <Field label="Sub-folder (optional)" hint="Run from a folder inside the project, for example “backend”."><input className="input" value={edit.cwd ?? ""} onChange={(e) => setEdit({ ...edit, cwd: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!found}
        onClose={() => setFound(null)}
        title="Commands found by AI"
        width={640}
        footer={
          <>
            <button className="btn" onClick={() => setFound(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={picked.size === 0}
              onClick={async () => {
                const n = await importCommands((found ?? []).filter((c) => picked.has(c.command)));
                setFound(null);
                toast({ kind: "success", title: `Imported ${n} command${n === 1 ? "" : "s"}` });
              }}
            >
              Import {picked.size}
            </button>
          </>
        }
      >
        <p className="mb-2 text-xs text-[var(--fg-muted)]">AI can be wrong. Check each command before importing.</p>
        <div className="max-h-[50vh] overflow-y-auto">
          {(found ?? []).map((c) => (
            <label key={c.command} className="row-hover flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5">
              <input
                type="checkbox"
                checked={picked.has(c.command)}
                onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.command); else n.delete(c.command); return n; })}
              />
              <span className="w-40 shrink-0 truncate text-[13px]">{c.label}</span>
              <code className="selectable truncate font-mono text-xs text-[var(--fg-muted)]">{c.command}</code>
            </label>
          ))}
        </div>
      </Modal>
      {node}
    </div>
  );
}
