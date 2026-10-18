import { describe, expect, it } from "vitest";
import { branchState, extractJson, formatMinutes, joinPath } from "./format";
import type { GitStatus } from "./types";

const base: GitStatus = {
  isRepo: true, branch: "main", detached: false, head: "abc", upstream: "origin/main", ahead: 0, behind: 0,
  staged: 0, unstaged: 0, untracked: 0, conflicted: 0, changes: [], stashCount: 0, lastCommitTs: null,
  lastCommitSubject: null, remoteUrl: null, state: "clean",
};

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(150)).toBe("2h 30m");
  });
});

describe("branchState", () => {
  it("describes states", () => {
    expect(branchState(base).label).toBe("Up to date");
    expect(branchState({ ...base, state: "ahead", ahead: 2 }).label).toBe("2 to push");
    expect(branchState({ ...base, state: "dirty", unstaged: 1, untracked: 2 }).label).toBe("3 uncommitted changes");
    expect(branchState({ ...base, state: "diverged", ahead: 1, behind: 2 }).tone).toBe("bad");
    expect(branchState(null).tone).toBe("muted");
  });
});

describe("extractJson", () => {
  it("parses fenced and chatty output", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here: [1,2,3] done')).toEqual([1, 2, 3]);
    expect(extractJson("nothing")).toBeNull();
  });
});

describe("joinPath", () => {
  it("joins without double slashes", () => {
    expect(joinPath("/a/b/", "c/d.ts")).toBe("/a/b/c/d.ts");
  });
});
