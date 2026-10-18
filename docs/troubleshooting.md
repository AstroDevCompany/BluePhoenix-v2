# Troubleshooting and FAQ

## "git was not found"

Install Git from [git-scm.com](https://git-scm.com) (on Mac, run `xcode-select --install`), then restart BluePhoenix.

## Push or pull fails with an authentication error

BluePhoenix uses your normal git sign-in and cannot show a password prompt. Make sure the same command works in your terminal. Set up an SSH key or a credential helper, then try again.

## My editor is not in the list

BluePhoenix lists editors it can find. On Windows and Linux the editor's command (for example `code`) must be on your PATH; in VS Code run **Shell Command: Install 'code' command in PATH**. On Mac, make sure the app is in **Applications**. You can always use **System default app**.

## Commands cannot find `node`, `cargo`, `pnpm` …

Commands run in a login shell, so they see the same tools as your terminal. If one is missing, check that it works in a new terminal window.

## The AI says "Could not reach Ollama" or similar

Start the app (Ollama, LM Studio) first, check the address in **Settings → AI**, and press **Test**.

## "Could not store the secret" (Linux)

API keys need a Secret Service such as GNOME Keyring or KWallet running. Install and unlock one, or use a local model.

## The window looks flat on Linux

The frosted-glass effect needs support from the operating system. On Linux BluePhoenix uses a solid gradient instead.

## Where is my data?

In BluePhoenix's data folder (`~/Library/Application Support/com.astrodev.bluephoenix` on Mac, `%APPDATA%\com.astrodev.bluephoenix` on Windows, `~/.local/share/com.astrodev.bluephoenix` on Linux). API keys and your sync database address are in the system keychain.

## Does removing a project delete files?

No. It only removes BluePhoenix's records for that project.
