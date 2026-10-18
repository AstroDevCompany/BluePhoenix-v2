import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openExternal } from "../lib/actions";
import { useIsDark } from "../lib/theme";

export function MarkdownView({ text, empty }: { text: string; empty?: string }) {
  if (!text.trim()) return <p className="text-[13px] text-[var(--fg-faint)]">{empty ?? "Nothing here yet."}</p>;
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                openExternal(href);
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

type Mode = "edit" | "preview" | "split";

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 160,
  initialMode = "edit",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  initialMode?: Mode;
}) {
  const dark = useIsDark();
  const [mode, setMode] = useState<Mode>(initialMode);
  const editor = (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={dark ? "dark" : "light"}
      placeholder={placeholder}
      minHeight={`${minHeight}px`}
      basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
      extensions={[markdown({ codeLanguages: languages }), EditorView.lineWrapping]}
      className="selectable"
    />
  );
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--glass-strong)_55%,transparent)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-2 py-1.5">
        <span className="px-1 text-xs text-[var(--fg-faint)]">Markdown</span>
        <div className="segmented !p-[2px]">
          {(["edit", "split", "preview"] as Mode[]).map((m) => (
            <button key={m} data-active={mode === m} onClick={() => setMode(m)} style={{ height: 24, fontSize: 12 }}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className={mode === "split" ? "grid grid-cols-2 divide-x divide-[var(--line)]" : ""}>
        {mode !== "preview" && <div className="min-w-0">{editor}</div>}
        {mode !== "edit" && (
          <div className="min-w-0 p-3" style={{ minHeight }}>
            <MarkdownView text={value} empty="Nothing to preview." />
          </div>
        )}
      </div>
    </div>
  );
}
