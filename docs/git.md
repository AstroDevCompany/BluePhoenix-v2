# Git

BluePhoenix uses the `git` program installed on your computer, so your existing sign-in (SSH keys, credential helper) just works. BluePhoenix never asks for your password; if git needs one it will show an error instead of waiting.

## Quick actions

Available from the dashboard card **⋯** menu, the project page, and the [command palette](command-palette.md):

| Action | What it does |
| --- | --- |
| **Fetch** | Downloads new commits from every remote without changing your files. Refreshes the "to pull" count. |
| **Pull** | Fetches and merges the remote branch into your current branch. |
| **Push** | Uploads your commits. If the branch has no upstream yet, it is created on `origin`. |
| **Stash changes** | Puts your uncommitted work (including new files) aside. |
| **Apply last stash** | Brings the most recent stash back. |

A toast in the corner shows the result or the exact git error.

## The Git tab

Open a project and choose **Git**.

### Changes

- Every changed file is listed with a letter: **M** modified, **A** added, **D** deleted, **R** renamed, **?** new, **U** conflict.
- Tick the box to stage a file, untick to unstage. **Stage all** and **Unstage all** do it in bulk.
- Click a file name to see its diff.
- Write a message and press **Commit**, or **Commit & push**. Press **Generate** to let [AI](ai.md) write the message from your staged changes.

### Branches

- See local and remote branches with their last commit.
- **Create & switch** makes a new branch from where you are.
- **Switch** checks out a branch (remote branches get a local tracking copy).
- **More → Merge … into current** merges a branch into the one you are on. If it conflicts, resolve the files in your editor, or use **Abort merge**.
- **More → Delete branch** removes a local branch.

### History

The latest commits. Click one to see its full change. **Load more** goes further back.

### Stashes

Create a stash or apply the latest one, and see the full stash list.

## Not a git repository?

The Overview and Git tabs offer **git init** for folders that are not under git yet.
