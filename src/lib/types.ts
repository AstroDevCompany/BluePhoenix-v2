export interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string;
  kind: string;
  favorite: boolean;
  githubUrl: string | null;
  websiteUrl: string | null;
  defaultEditor: string | null;
  defaultTerminal: string | null;
  defaultCommandId: string | null;
  lastOpened: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary extends Project {
  totalMinutes: number;
  openTodos: number;
  doneTodos: number;
  lastActivity: number;
}

export interface Command {
  id: string;
  projectId: string;
  label: string;
  command: string;
  cwd: string | null;
  source: "auto" | "manual" | "ai";
  sort: number;
}

export interface TodoPage {
  id: string;
  projectId: string;
  title: string;
  markdown: string;
  sort: number;
}

export type TodoStatus = "todo" | "doing" | "done";

export interface Todo {
  id: string;
  projectId: string;
  pageId: string | null;
  title: string;
  notes: string;
  status: TodoStatus;
  priority: number; // 0 none, 1 low, 2 medium, 3 high
  due: number | null;
  aiPrompt: string | null;
  sort: number;
  createdAt: number;
  completedAt: number | null;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  todoId: string | null;
  minutes: number;
  loggedAt: number;
  note: string | null;
}

export interface Change {
  path: string;
  index: string;
  worktree: string;
  untracked: boolean;
  conflicted: boolean;
}

export type GitState = "no-repo" | "conflict" | "dirty" | "diverged" | "ahead" | "behind" | "no-upstream" | "clean";

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  detached: boolean;
  head: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  changes: Change[];
  stashCount: number;
  lastCommitTs: number | null;
  lastCommitSubject: string | null;
  remoteUrl: string | null;
  state: GitState;
}

export interface Branch {
  name: string;
  current: boolean;
  remote: boolean;
  upstream: string | null;
  lastCommitTs: number | null;
  subject: string;
}

export interface Commit {
  hash: string;
  short: string;
  author: string;
  ts: number;
  subject: string;
  body: string;
}

export interface AppInfo {
  id: string;
  name: string;
  installed: boolean;
}

export interface DetectedCommand {
  label: string;
  command: string;
  source: string;
}

export interface Detected {
  name: string;
  kind: string;
  description: string | null;
  githubUrl: string | null;
  isGit: boolean;
  commands: DetectedCommand[];
}

export interface FileEntry {
  relPath: string;
  size: number;
  mtime: number;
}

export interface Provider {
  id: string;
  name: string;
  local: boolean;
  baseUrl: string;
  needsKey: boolean;
  protocol: "openai" | "anthropic";
}

export interface UpdateInfo {
  current: string;
  latest: string;
  available: boolean;
  downloadUrl: string | null;
}

export interface SystemInfo {
  platform: "macos" | "windows" | "linux";
  version: string;
  home: string | null;
}

export type Settings = Record<string, string>;

export interface SyncReport {
  pushed: number;
  pulled: number;
}

export interface SyncStatus {
  connected: boolean;
  host: string | null;
  lastSync: number | null;
  lastError: string | null;
}
