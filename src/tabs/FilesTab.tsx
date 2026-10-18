import { File, FileCode, FileText, FolderOpen, Image, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { editorName, defaultEditorId, hasFolder, openEditor } from "../lib/actions";
import { api, errMsg } from "../lib/api";
import { formatBytes, joinPath, timeAgo } from "../lib/format";
import { useStore } from "../lib/store";
import type { FileEntry, Project } from "../lib/types";
import { Empty, Spinner } from "../components/ui";

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|rs|py|go|java|kt|swift|c|h|cpp|hpp|cs|rb|php|sh|ps1|sql|html|css|scss|vue|svelte|json|toml|ya?ml|xml|gradle)$/i;
const IMG = /\.(png|jpe?g|gif|svg|webp|ico|icns|bmp)$/i;
const DOC = /\.(md|mdx|txt|rst|pdf|docx?)$/i;

function icon(path: string) {
  if (CODE.test(path)) return <FileCode size={15} className="text-[var(--accent)]" />;
  if (IMG.test(path)) return <Image size={15} className="text-[var(--accent-2)]" />;
  if (DOC.test(path)) return <FileText size={15} className="text-[var(--warn)]" />;
  return <File size={15} className="text-[var(--fg-faint)]" />;
}

export default function FilesTab({ project: p }: { project: Project }) {
  const toast = useStore((s) => s.toast);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(300);
  const [indexing, setIndexing] = useState(false);
  const [indexed, setIndexed] = useState(false);

  const load = useCallback(async () => {
    const [f, n] = await Promise.all([api.files(p.id, query, limit), api.filesCount(p.id)]);
    setFiles(f);
    setTotal(n);
    return n;
  }, [p.id, query, limit]);

  const reindex = useCallback(async () => {
    setIndexing(true);
    try {
      const r = await api.indexFiles(p.id, p.path);
      if (r.truncated) toast({ kind: "info", title: "Large project", detail: `Indexed the first ${r.count.toLocaleString()} files.` });
      await load();
    } catch (e) {
      toast({ kind: "error", title: "Could not index files", detail: errMsg(e) });
    } finally {
      setIndexing(false);
      setIndexed(true);
    }
  }, [p.id, p.path, load, toast]);

  useEffect(() => {
    if (!hasFolder(p)) return;
    const t = setTimeout(() => {
      void load().then((n) => {
        if (n === 0 && !indexed && !indexing) void reindex();
      });
    }, 150);
    return () => clearTimeout(t);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasFolder(p)) {
    return <div className="glass"><Empty icon={<File size={30} />} title="This project has no folder">Edit the project and choose a folder to browse its files.</Empty></div>;
  }

  const editor = editorName(defaultEditorId(p));

  return (
    <div className="glass flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--line)] p-3">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--fg-faint)]" />
          <input className="input !pl-8" placeholder="Search files by name or folder" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(300); }} />
        </div>
        <span className="text-xs text-[var(--fg-faint)]">{total.toLocaleString()} files</span>
        <button className="btn" onClick={() => void reindex()} disabled={indexing}>
          {indexing ? <Spinner size={14} /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>
      {files.length === 0 ? (
        <Empty icon={indexing ? <Spinner size={28} /> : <Search size={28} />} title={indexing ? "Indexing…" : "No files found"}>
          {query ? "Nothing matches your search." : "Refresh to scan the project folder."}
        </Empty>
      ) : (
        <ul className="max-h-[calc(100vh-300px)] overflow-y-auto p-1.5">
          {files.map((f) => {
            const slash = f.relPath.lastIndexOf("/");
            const dir = slash >= 0 ? f.relPath.slice(0, slash + 1) : "";
            const name = slash >= 0 ? f.relPath.slice(slash + 1) : f.relPath;
            return (
              <li key={f.relPath}>
                <div
                  className="row-hover group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5"
                  onClick={() => void openEditor(p, undefined, f.relPath)}
                  title={`Open in ${editor}`}
                >
                  {icon(f.relPath)}
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    <span className="text-[var(--fg-faint)]">{dir}</span>
                    <span className="font-medium">{name}</span>
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-[var(--fg-faint)]">{formatBytes(f.size)}</span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-[var(--fg-faint)] md:block">{timeAgo(f.mtime)}</span>
                  <button
                    className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100"
                    aria-label="Reveal in file manager"
                    onClick={(e) => {
                      e.stopPropagation();
                      void api.reveal(joinPath(p.path, f.relPath));
                    }}
                  >
                    <FolderOpen size={14} />
                  </button>
                </div>
              </li>
            );
          })}
          {files.length >= limit && (
            <li className="p-2 text-center">
              <button className="btn btn-sm" onClick={() => setLimit((l) => l + 500)}>Show more</button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
