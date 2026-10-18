# Editors, terminals and commands

## Open a project in an editor

The **Open in …** button opens the folder in your default editor. Use the arrow next to it for others. BluePhoenix finds what is installed: Visual Studio Code (and Insiders), Cursor, Windsurf, Zed, Sublime Text, the JetBrains IDEs (WebStorm, IntelliJ IDEA, PyCharm, PhpStorm, GoLand, CLion, RustRover, Rider), Android Studio, Xcode, Nova, BBEdit and Notepad++. **System default app** uses whatever your computer would use to open the folder.

Choose your global default in **Settings → Editors & terminals**. A single project can override it in **Edit project…**.

## Terminals

From the arrow menu or the **⋯** menu you can open the project in:

- the **embedded terminal** inside BluePhoenix (the **Terminal** tab), with several tabs per project, or
- your **system terminal**: Terminal, iTerm, Warp, Ghostty, Alacritty, kitty, WezTerm on Mac; Windows Terminal, PowerShell, Command Prompt, Git Bash on Windows; GNOME Terminal, Konsole and others on Linux.

Embedded terminals keep running while you switch tabs or projects. Close one with its **×**.

## Commands

Commands are saved shell commands for a project, such as *build*, *dev server* or *run tests*.

### Where they come from

- **Detected automatically** when you add the project, and again any time with **Detect from project**.
- **Scan with AI** reads the repository and proposes more. You review them before importing.
- **Add command** to write your own. An optional sub-folder runs the command from inside the project (for example `backend`).

### Running them

- On the **Commands** tab, **Run** starts a command in the embedded terminal. The small terminal button runs it in your system terminal instead.
- On the dashboard card and project header, the blue button runs the **main command**. Pick another from its arrow. Set the main command with the **star** on the Commands tab.
- **Settings → Run commands in** chooses embedded or system terminal for these buttons.
