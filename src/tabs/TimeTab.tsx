import { Clock, Plus, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { logTime } from "../lib/actions";
import { api, errMsg } from "../lib/api";
import { dayKey, dayLabel, formatMinutes } from "../lib/format";
import { useStore } from "../lib/store";
import type { Project, TimeEntry, Todo } from "../lib/types";
import { Empty } from "../components/ui";

const QUICK: [number, string][] = [
  [10, "10 min"],
  [15, "15 min"],
  [30, "30 min"],
  [45, "45 min"],
  [60, "1 hour"],
  [120, "2 hours"],
  [180, "3 hours"],
  [240, "4 hours"],
  [480, "8 hours"],
];

function localInputValue(ts: number): string {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export default function TimeTab({ project: p }: { project: Project }) {
  const toast = useStore((s) => s.toast);
  const loadProjects = useStore((s) => s.loadProjects);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [note, setNote] = useState("");
  const [todoId, setTodoId] = useState("");
  const [manual, setManual] = useState(false);
  const [when, setWhen] = useState(localInputValue(Date.now()));
  const [h, setH] = useState("");
  const [m, setM] = useState("");

  const reload = useCallback(async () => {
    const [e, t] = await Promise.all([api.time(p.id), api.todos(p.id)]);
    setEntries(e);
    setTodos(t);
  }, [p.id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function add(minutes: number) {
    if (minutes <= 0) return;
    try {
      const at = manual ? new Date(when).getTime() : Date.now();
      await logTime(p, minutes, note, todoId || null, at);
      await reload();
      toast({ kind: "success", title: `Logged ${formatMinutes(minutes)}`, detail: note || undefined });
      setNote("");
    } catch (e) {
      toast({ kind: "error", title: "Could not log time", detail: errMsg(e) });
    }
  }

  const stats = useMemo(() => {
    const today = dayKey(Date.now());
    const weekAgo = Date.now() - 7 * 86400000;
    const days = new Map<string, number>();
    let total = 0, todayM = 0, week = 0;
    for (const e of entries) {
      total += e.minutes;
      const k = dayKey(e.loggedAt);
      days.set(k, (days.get(k) ?? 0) + e.minutes);
      if (k === today) todayM += e.minutes;
      if (e.loggedAt >= weekAgo) week += e.minutes;
    }
    const bars = Array.from({ length: 14 }, (_, i) => {
      const ts = Date.now() - (13 - i) * 86400000;
      return { key: dayKey(ts), label: new Date(ts).toLocaleDateString(undefined, { weekday: "narrow" }), minutes: days.get(dayKey(ts)) ?? 0 };
    });
    return { total, todayM, week, bars, max: Math.max(60, ...bars.map((b) => b.minutes)), activeDays: days.size };
  }, [entries]);

  const grouped = useMemo(() => {
    const g = new Map<string, TimeEntry[]>();
    for (const e of entries) {
      const k = dayKey(e.loggedAt);
      g.set(k, [...(g.get(k) ?? []), e]);
    }
    return [...g.entries()];
  }, [entries]);

  const todoTitle = (id: string | null) => todos.find((t) => t.id === id)?.title;

  async function remove(e: TimeEntry) {
    await api.deleteTime(e.id);
    await Promise.all([reload(), loadProjects()]);
    toast({ kind: "info", title: `Removed ${formatMinutes(e.minutes)}` });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-4">
        <div className="glass p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Log time</h3>
          <div className="flex flex-wrap gap-2">
            {QUICK.map(([min, label]) => (
              <button key={min} className="btn" onClick={() => void add(min)}>
                <Plus size={13} /> {label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <input className="input" placeholder="What did you work on? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <select className="input" value={todoId} onChange={(e) => setTodoId(e.target.value)}>
              <option value="">Whole project</option>
              {todos.filter((t) => t.status !== "done").map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input className="input !w-20" inputMode="numeric" placeholder="hours" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ""))} />
            <input className="input !w-20" inputMode="numeric" placeholder="min" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, ""))} />
            <button
              className="btn btn-primary"
              disabled={!(Number(h) * 60 + Number(m) > 0)}
              onClick={async () => {
                await add(Number(h) * 60 + Number(m));
                setH("");
                setM("");
              }}
            >
              Add custom
            </button>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-[var(--fg-muted)]">
              <input type="checkbox" checked={manual} onChange={(e) => { setManual(e.target.checked); setWhen(localInputValue(Date.now())); }} />
              Set date &amp; time
            </label>
            {manual && <input type="datetime-local" className="input !w-52" value={when} onChange={(e) => setWhen(e.target.value)} />}
          </div>
        </div>

        <div className="glass p-4">
          <h3 className="mb-2 text-[13px] font-semibold">History</h3>
          {entries.length === 0 ? (
            <Empty icon={<Clock size={28} />} title="No time logged yet">Use the buttons above to track your work.</Empty>
          ) : (
            <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
              {grouped.map(([k, list]) => (
                <div key={k}>
                  <div className="mb-1 flex items-baseline justify-between px-1 text-xs font-semibold text-[var(--fg-muted)]">
                    <span>{dayLabel(list[0].loggedAt)}</span>
                    <span>{formatMinutes(list.reduce((a, e) => a + e.minutes, 0))}</span>
                  </div>
                  {list.map((e) => (
                    <div key={e.id} className="row-hover group flex items-center gap-3 rounded-lg px-2 py-1.5 text-[13px]">
                      <span className="w-[76px] shrink-0 whitespace-nowrap font-mono text-xs text-[var(--fg-faint)]">
                        {new Date(e.loggedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="w-16 shrink-0 font-semibold">{formatMinutes(e.minutes)}</span>
                      <span className="min-w-0 flex-1 truncate text-[var(--fg-muted)]">
                        {todoTitle(e.todoId) && <span className="pill mr-2">{todoTitle(e.todoId)}</span>}
                        {e.note}
                      </span>
                      <button className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100" aria-label="Delete entry" onClick={() => void remove(e)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Today", stats.todayM],
            ["7 days", stats.week],
            ["Total", stats.total],
          ].map(([l, v]) => (
            <div key={l as string} className="glass p-3">
              <div className="text-xs font-semibold text-[var(--fg-muted)]">{l}</div>
              <div className="mt-1 text-lg font-bold">{formatMinutes(v as number)}</div>
            </div>
          ))}
        </div>
        <div className="glass p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Last 14 days</h3>
          <div className="flex h-32 items-end gap-1.5">
            {stats.bars.map((b) => (
              <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${b.key}: ${formatMinutes(b.minutes)}`}>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max(b.minutes ? 4 : 0, (b.minutes / stats.max) * 100)}%`,
                    background: "linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 50%, var(--accent-2)))",
                    opacity: b.minutes ? 1 : 0.2,
                  }}
                />
                <span className="text-[10px] text-[var(--fg-faint)]">{b.label}</span>
              </div>
            ))}
          </div>
          {stats.activeDays > 0 && (
            <p className="mt-3 text-xs text-[var(--fg-faint)]">
              Average on active days: {formatMinutes(Math.round(stats.total / stats.activeDays))}
            </p>
          )}
        </div>
        <p className="flex items-center gap-1.5 px-1 text-xs text-[var(--fg-faint)]">
          <Undo2 size={12} /> Logged by mistake? Hover an entry and delete it.
        </p>
      </div>
    </div>
  );
}
