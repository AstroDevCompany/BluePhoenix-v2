# Getting started

## Install

Download the installer for your computer from the BluePhoenix releases page and run it.

| System | File | Notes |
| --- | --- | --- |
| macOS | `BluePhoenix_x.y.z.dmg` | Open the disk image and drag **BluePhoenix** into **Applications**. |
| Windows | `BluePhoenix_x.y.z_x64-setup.exe` or `.msi` | Run the installer. It installs for your user account, no administrator rights needed for the `.exe`. |
| Linux | `.AppImage` or `.deb` | Make the AppImage executable and run it, or install the `.deb`. |

### First launch warnings

BluePhoenix builds are not yet signed with a paid developer certificate, so your system may warn you the first time:

- **macOS:** if you see "BluePhoenix can't be opened", right-click the app, choose **Open**, then confirm. Or go to **System Settings → Privacy & Security** and click **Open Anyway**.
- **Windows:** if SmartScreen appears, click **More info → Run anyway**.

### What you need

- **Git** installed, to see branches and run git actions. Get it from [git-scm.com](https://git-scm.com).
- Optional: an editor such as VS Code, and an AI provider if you want AI features (see [AI features](ai.md)).

## Add your first project

1. Click **Add your first project** on the empty dashboard (or **Add project** at the top right).
2. Choose the project's folder.
3. BluePhoenix detects the project type, the GitHub address and the commands it can run (for example `pnpm run dev`, `cargo build`, `make test`). Untick anything you do not want.
4. Click **Add project**.

You land on the project page. Go back to the [dashboard](dashboard.md) to see the project card.

Projects that are not code, such as a university course, work too: choose **Track something without a folder**. You still get to-dos, notes and time tracking.

## The window

The top bar is yours to drag. It holds the **Dashboard** and **Settings** links, the update notice when a new version is available, and the search box that opens the [command palette](command-palette.md) (`⌘K` on Mac, `Ctrl+K` on Windows and Linux).

BluePhoenix follows your system's light or dark appearance. You can change that in [Settings](settings.md).
