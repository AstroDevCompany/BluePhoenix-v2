import { Plus, SquareTerminal, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { hasFolder } from "../lib/actions";
import { attachSession, closeSession, openSession, useTerms } from "../lib/terminals";
import type { Project } from "../lib/types";
import { Empty } from "../components/ui";

export default function TerminalTab({ project: p }: { project: Project }) {
  const all = useTerms((s) => s.list);
  const activeId = useTerms((s) => s.active[p.id]);
  const setActive = useTerms((s) => s.setActive);
  const sessions = all.filter((t) => t.projectId === p.id);
  const active = sessions.find((s) => s.id === activeId) ?? sessions.at(-1);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !host.current) return;
    return attachSession(active.id, host.current);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasFolder(p)) {
    return (
      <div className="glass">
        <Empty icon={<SquareTerminal size={30} />} title="This project has no folder">Edit the project and choose a folder to use the terminal.</Empty>
      </div>
    );
  }

  const create = () => void openSession(p.id, p.path, `Terminal ${sessions.length + 1}`);

  return (
    <div className="glass flex h-[calc(100vh-250px)] min-h-[360px] flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-[var(--line)] p-1.5">
        {sessions.map((s) => (
          <div key={s.id} className="tab group !pr-1.5" data-active={s.id === active?.id} onClick={() => setActive(p.id, s.id)}>
            <SquareTerminal size={14} />
            <span className="max-w-[150px] truncate">{s.title}</span>
            {s.exited && <span className="text-[10px] text-[var(--fg-faint)]">exited</span>}
            <button
              className="btn btn-ghost btn-icon !h-5 !w-5 rounded-md"
              aria-label="Close terminal"
              onClick={(e) => {
                e.stopPropagation();
                void closeSession(s.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button className="btn btn-ghost btn-icon btn-sm" aria-label="New terminal" onClick={create}>
          <Plus size={15} />
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Empty icon={<SquareTerminal size={30} />} title="No terminal open">
            <button className="btn btn-primary mt-2" onClick={create}>
              <Plus size={14} /> New terminal
            </button>
          </Empty>
        </div>
      ) : (
        <div ref={host} className="min-h-0 flex-1 bg-[color-mix(in_srgb,var(--glass-strong)_40%,transparent)]" />
      )}
    </div>
  );
}
