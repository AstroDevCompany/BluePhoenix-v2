import { ArrowLeft, Code2, EllipsisVertical, GitBranch, LayoutDashboard, ListTodo, Play, ScrollText, Star, SquareTerminal, Timer, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { buildEditorMenu, buildProjectMenu } from "../components/projectMenu";
import { ProjectDialog } from "../components/ProjectDialog";
import { Dropdown, Empty, Pill, Spinner, SplitButton, useConfirm, type MenuItem } from "../components/ui";
import { defaultCommand, defaultEditorId, editorName, hasFolder, openEditor, removeProject, runCommand, toggleFavorite } from "../lib/actions";
import { api } from "../lib/api";
import { branchState, toneColor } from "../lib/format";
import { useStore } from "../lib/store";
import ChangelogTab from "../tabs/ChangelogTab";
import CommandsTab from "../tabs/CommandsTab";
import FilesTab from "../tabs/FilesTab";
import GitTab from "../tabs/GitTab";
import OverviewTab from "../tabs/OverviewTab";
import TerminalTab from "../tabs/TerminalTab";
import TimeTab from "../tabs/TimeTab";
import TodosTab from "../tabs/TodosTab";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "todos", label: "To-dos", icon: ListTodo },
  { id: "time", label: "Time", icon: Timer },
  { id: "commands", label: "Commands", icon: Play },
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
  { id: "files", label: "Files", icon: FileText },
  { id: "changelog", label: "Changelog", icon: ScrollText },
] as const;

export default function ProjectPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const ready = useStore((s) => s.ready);
  const status = useStore((s) => s.statuses[id]);
  const cmds = useStore((s) => s.commands[id]);
  const settings = useStore((s) => s.settings);
  const loadCommands = useStore((s) => s.loadCommands);
  const refreshStatus = useStore((s) => s.refreshStatus);
  const setSetting = useStore((s) => s.setSetting);
  const [editing, setEditing] = useState(false);
  const { confirm, node } = useConfirm();
  const tab = TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview";

  useEffect(() => {
    void loadCommands(id);
    void refreshStatus(id);
    void api.touchProject(id);
  }, [id, loadCommands, refreshStatus]);

  if (!ready) return null;
  if (!project) {
    return (
      <div className="glass mx-auto mt-16 max-w-md">
        <Empty icon={<Code2 size={30} />} title="Project not found">
          <button className="btn mt-2" onClick={() => nav("/")}>Back to dashboard</button>
        </Empty>
      </div>
    );
  }

  const p = project;
  const folder = hasFolder(p);
  const state = branchState(status);
  const list = cmds ?? [];
  const main = defaultCommand(p, list);
  const runIn = settings.runIn ?? "embedded";
  const commandItems: MenuItem[] = [
    { label: "Run command", header: true },
    ...list.map((c) => ({ label: c.label, icon: <Play size={14} />, checked: c.id === main?.id, onClick: () => void runCommand(p, c) })),
    { separator: true },
    { label: "Run in", header: true },
    { label: "Embedded terminal", checked: runIn === "embedded", onClick: () => void setSetting("runIn", "embedded") },
    { label: "System terminal", checked: runIn === "system", onClick: () => void setSetting("runIn", "system") },
    { separator: true },
    { label: "Manage commands…", onClick: () => setParams({ tab: "commands" }) },
  ];

  const askRemove = async () => {
    if (await confirm(`Remove “${p.name}” from BluePhoenix? Your files on disk are not touched.`)) {
      await removeProject(p);
      nav("/");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
        <button className="btn btn-icon" onClick={() => nav("/")} aria-label="Back to dashboard">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-[21px] font-bold tracking-tight">{p.name}</h1>
            <Pill>{p.kind}</Pill>
            {folder && status?.isRepo && (
              <>
                <span className="flex items-center gap-1 font-mono text-[13px] text-[var(--fg-muted)]">
                  <GitBranch size={14} /> {status.branch ?? status.head}
                </span>
                <Pill color={toneColor(state.tone)}>{state.label}</Pill>
              </>
            )}
            {status === undefined && folder && <Spinner size={14} />}
          </div>
          {p.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--fg-muted)]">{p.description}</p>}
        </div>
        <button className="btn btn-icon" aria-label="Favorite" onClick={() => void toggleFavorite(p)}>
          <Star size={16} fill={p.favorite ? "#f5b301" : "none"} color={p.favorite ? "#f5b301" : "currentColor"} />
        </button>
        <SplitButton icon={<Code2 size={14} />} label={`Open in ${editorName(defaultEditorId(p))}`} onClick={() => void openEditor(p)} items={buildEditorMenu(p)} disabled={!folder} />
        <SplitButton primary icon={<Play size={13} />} label={main?.label ?? "No commands"} onClick={() => main && void runCommand(p, main)} items={commandItems} disabled={!folder || !main} title={main?.command} />
        <Dropdown items={buildProjectMenu(p, { onRemove: () => void askRemove(), onEdit: () => setEditing(true) })}>
          <button className="btn btn-icon" aria-label="More actions"><EllipsisVertical size={16} /></button>
        </Dropdown>
      </div>

      <div className="flex gap-1 overflow-x-auto px-6 pb-3">
        {TABS.map((t) => (
          <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {tab === "overview" && <OverviewTab project={p} />}
        {tab === "git" && <GitTab project={p} />}
        {tab === "todos" && <TodosTab project={p} />}
        {tab === "time" && <TimeTab project={p} />}
        {tab === "commands" && <CommandsTab project={p} />}
        {tab === "terminal" && <TerminalTab project={p} />}
        {tab === "files" && <FilesTab project={p} />}
        {tab === "changelog" && <ChangelogTab project={p} />}
      </div>
      <ProjectDialog open={editing} onClose={() => setEditing(false)} editing={p} />
      {node}
    </div>
  );
}

