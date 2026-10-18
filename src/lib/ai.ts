import { api } from "./api";
import { extractJson } from "./format";
import type { Commit, DetectedCommand, Project, Todo } from "./types";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}\n… (truncated)` : s);

export async function generateCommitMessage(path: string): Promise<string> {
  let diff = await api.gitDiff(path, true);
  if (!diff.trim()) diff = await api.gitDiff(path, false);
  if (!diff.trim()) throw "There are no changes to describe. Stage or edit some files first.";
  const out = await api.aiComplete(
    "You write concise git commit messages in the Conventional Commits style. Reply with ONLY the commit message: a subject line of at most 72 characters, then optionally a blank line and a short bullet list body. No code fences, no quotes.",
    `Write a commit message for this diff:\n\n${clip(diff, 24000)}`,
    600,
  );
  return out.replace(/^```\w*\n?|```$/g, "").trim();
}

export interface Prioritized {
  id: string;
  priority: number;
  reason: string;
}

export async function prioritizeTodos(project: Project, todos: Todo[]): Promise<Prioritized[]> {
  const open = todos.filter((t) => t.status !== "done");
  if (open.length === 0) throw "There are no open to-dos to prioritize.";
  const list = open.map((t) => ({ id: t.id, title: t.title, notes: t.notes.slice(0, 300), status: t.status }));
  const out = await api.aiComplete(
    'You are a pragmatic engineering lead. Prioritize the to-dos for a software project. Reply with ONLY JSON: {"order":[{"id":"<id>","priority":<0-3>,"reason":"<max 12 words>"}]}. The array must contain every given id exactly once, most important first. priority: 3 = urgent/blocking, 2 = important, 1 = nice to have, 0 = someday.',
    `Project: ${project.name} (${project.kind})\n${project.description ?? ""}\n\nTo-dos:\n${JSON.stringify(list, null, 1)}`,
    2000,
    true,
  );
  const parsed = extractJson<{ order: Prioritized[] }>(out);
  const order = parsed?.order;
  if (!Array.isArray(order)) throw "The model did not return a usable ordering. Try again or pick a stronger model.";
  const known = new Set(open.map((t) => t.id));
  const seen = new Set<string>();
  const result: Prioritized[] = [];
  for (const o of order) {
    if (known.has(o.id) && !seen.has(o.id)) {
      seen.add(o.id);
      result.push({ id: o.id, priority: Math.max(0, Math.min(3, Math.round(Number(o.priority) || 0))), reason: String(o.reason ?? "") });
    }
  }
  // Anything the model forgot goes last, unchanged.
  for (const t of open) if (!seen.has(t.id)) result.push({ id: t.id, priority: t.priority, reason: "" });
  return result;
}

export async function generateTodoPrompt(project: Project, todo: Todo, extraContext?: string): Promise<string> {
  return (
    await api.aiComplete(
      "You turn a to-do item into a precise, ready-to-paste prompt for an AI coding assistant (like Claude Code or Cursor). Include: goal, relevant context, concrete steps, constraints, and how to verify the result. Be specific, avoid filler. Reply with ONLY the prompt text in Markdown.",
      `Project: ${project.name} (${project.kind})\n${project.description ?? ""}\n\nTo-do: ${todo.title}\n${todo.notes ? `Notes:\n${todo.notes}\n` : ""}${extraContext ? `\nRepository overview:\n${clip(extraContext, 6000)}` : ""}`,
      1500,
    )
  ).trim();
}

function commitsToText(commits: Commit[]): string {
  return commits.map((c) => `- ${c.short} ${c.subject}${c.body ? `\n  ${c.body.replace(/\n/g, "\n  ")}` : ""}`).join("\n");
}

export async function generateChangelog(project: Project, commits: Commit[], title: string): Promise<string> {
  if (commits.length === 0) throw "There are no commits in this range.";
  return (
    await api.aiComplete(
      "You write user-facing release notes in the Keep a Changelog format. Group changes under Added, Changed, Fixed, Removed (omit empty groups). Merge duplicates, drop noise like merge commits and typo fixes, and write in plain language. Reply with ONLY Markdown, starting with a level-2 heading.",
      `Project: ${project.name}\nRelease heading: ${title}\n\nCommits:\n${clip(commitsToText(commits), 24000)}`,
      2500,
    )
  ).trim();
}

export async function summarizeChanges(project: Project, commits: Commit[]): Promise<string> {
  if (commits.length === 0) throw "There are no commits in this range.";
  return (
    await api.aiComplete(
      "You summarize software changes for a busy reader in 3-6 short bullet points, then a one-sentence overall takeaway. Reply in Markdown.",
      `Project: ${project.name}\n\nCommits:\n${clip(commitsToText(commits), 24000)}`,
      1200,
    )
  ).trim();
}

export async function generatePrDescription(project: Project, commits: Commit[], diffStat: string): Promise<string> {
  return (
    await api.aiComplete(
      "You write clear pull request descriptions in Markdown with sections: Summary, Changes, Testing notes. Be concise.",
      `Project: ${project.name}\n\nCommits:\n${clip(commitsToText(commits), 12000)}\n\nDiff stat:\n${clip(diffStat, 4000)}`,
      1500,
    )
  ).trim();
}

export async function scanCommands(path: string): Promise<DetectedCommand[]> {
  const snapshot = await api.snapshot(path);
  const out = await api.aiComplete(
    'You analyze a code repository and list the shell commands a developer would run: install, dev server, build, test, lint, format, release, etc. Use ONLY tools and scripts that really exist in the files shown. Reply with ONLY JSON: {"commands":[{"label":"<short name>","command":"<exact shell command>"}]} with at most 20 entries.',
    clip(snapshot, 14000),
    1500,
    true,
  );
  const parsed = extractJson<{ commands: { label: string; command: string }[] }>(out);
  if (!parsed || !Array.isArray(parsed.commands)) throw "The model did not return a usable list of commands.";
  return parsed.commands
    .filter((c) => c && typeof c.command === "string" && c.command.trim())
    .map((c) => ({ label: String(c.label || c.command).slice(0, 60), command: c.command.trim(), source: "ai" }));
}
