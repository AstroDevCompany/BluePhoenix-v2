use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::error::{err, Result};

struct Def {
    id: &'static str,
    name: &'static str,
    /// macOS application bundle name (without .app).
    mac: Option<&'static str>,
    /// Command line launchers (Windows / Linux, and macOS fallback).
    cli: &'static [&'static str],
    /// Windows install locations; %VAR% is expanded.
    win: &'static [&'static str],
    windows: bool,
    linux: bool,
}

const fn d(
    id: &'static str,
    name: &'static str,
    mac: Option<&'static str>,
    cli: &'static [&'static str],
    win: &'static [&'static str],
) -> Def {
    Def { id, name, mac, cli, win, windows: true, linux: true }
}

const EDITORS: &[Def] = &[
    d("vscode", "Visual Studio Code", Some("Visual Studio Code"), &["code"], &["%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\bin\\code.cmd"]),
    d("vscode-insiders", "VS Code Insiders", Some("Visual Studio Code - Insiders"), &["code-insiders"], &[]),
    d("cursor", "Cursor", Some("Cursor"), &["cursor"], &["%LOCALAPPDATA%\\Programs\\cursor\\resources\\app\\bin\\cursor.cmd"]),
    d("windsurf", "Windsurf", Some("Windsurf"), &["windsurf"], &[]),
    d("zed", "Zed", Some("Zed"), &["zed"], &[]),
    d("sublime", "Sublime Text", Some("Sublime Text"), &["subl"], &["%ProgramFiles%\\Sublime Text\\subl.exe"]),
    d("webstorm", "WebStorm", Some("WebStorm"), &["webstorm"], &[]),
    d("idea", "IntelliJ IDEA", Some("IntelliJ IDEA"), &["idea"], &[]),
    d("idea-ce", "IntelliJ IDEA CE", Some("IntelliJ IDEA CE"), &[], &[]),
    d("pycharm", "PyCharm", Some("PyCharm"), &["pycharm"], &[]),
    d("pycharm-ce", "PyCharm CE", Some("PyCharm CE"), &[], &[]),
    d("phpstorm", "PhpStorm", Some("PhpStorm"), &["phpstorm"], &[]),
    d("goland", "GoLand", Some("GoLand"), &["goland"], &[]),
    d("clion", "CLion", Some("CLion"), &["clion"], &[]),
    d("rustrover", "RustRover", Some("RustRover"), &["rustrover"], &[]),
    d("rider", "Rider", Some("Rider"), &["rider"], &[]),
    d("android-studio", "Android Studio", Some("Android Studio"), &["studio"], &[]),
    Def { id: "xcode", name: "Xcode", mac: Some("Xcode"), cli: &[], win: &[], windows: false, linux: false },
    Def { id: "nova", name: "Nova", mac: Some("Nova"), cli: &[], win: &[], windows: false, linux: false },
    Def { id: "bbedit", name: "BBEdit", mac: Some("BBEdit"), cli: &["bbedit"], win: &[], windows: false, linux: false },
    d("notepad++", "Notepad++", None, &["notepad++"], &["%ProgramFiles%\\Notepad++\\notepad++.exe"]),
];

const TERMINALS: &[Def] = &[
    Def { id: "terminal", name: "Terminal", mac: Some("Terminal"), cli: &[], win: &[], windows: false, linux: false },
    Def { id: "iterm", name: "iTerm", mac: Some("iTerm"), cli: &[], win: &[], windows: false, linux: false },
    Def { id: "warp", name: "Warp", mac: Some("Warp"), cli: &[], win: &[], windows: false, linux: false },
    Def { id: "ghostty", name: "Ghostty", mac: Some("Ghostty"), cli: &["ghostty"], win: &[], windows: false, linux: true },
    d("alacritty", "Alacritty", Some("Alacritty"), &["alacritty"], &[]),
    d("kitty", "kitty", Some("kitty"), &["kitty"], &[]),
    d("wezterm", "WezTerm", Some("WezTerm"), &["wezterm"], &["%ProgramFiles%\\WezTerm\\wezterm-gui.exe"]),
    Def { id: "wt", name: "Windows Terminal", mac: None, cli: &["wt"], win: &[], windows: true, linux: false },
    Def { id: "powershell", name: "PowerShell", mac: None, cli: &["pwsh", "powershell"], win: &[], windows: true, linux: false },
    Def { id: "cmd", name: "Command Prompt", mac: None, cli: &["cmd"], win: &[], windows: true, linux: false },
    Def { id: "gitbash", name: "Git Bash", mac: None, cli: &[], win: &["%ProgramFiles%\\Git\\git-bash.exe"], windows: true, linux: false },
    Def { id: "gnome-terminal", name: "GNOME Terminal", mac: None, cli: &["gnome-terminal"], win: &[], windows: false, linux: true },
    Def { id: "konsole", name: "Konsole", mac: None, cli: &["konsole"], win: &[], windows: false, linux: true },
    Def { id: "xfce4-terminal", name: "Xfce Terminal", mac: None, cli: &["xfce4-terminal"], win: &[], windows: false, linux: true },
    Def { id: "x-terminal-emulator", name: "System Terminal", mac: None, cli: &["x-terminal-emulator"], win: &[], windows: false, linux: true },
];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    pub installed: bool,
}

fn expand_env(s: &str) -> String {
    let mut out = s.to_string();
    for var in ["LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)", "APPDATA"] {
        if let Ok(v) = std::env::var(var) {
            out = out.replace(&format!("%{var}%"), &v);
        }
    }
    out
}

fn mac_app_path(name: &str) -> Option<PathBuf> {
    let mut dirs: Vec<PathBuf> = vec![
        "/Applications".into(),
        "/System/Applications".into(),
        "/System/Applications/Utilities".into(),
    ];
    if let Some(h) = dirs::home_dir() {
        dirs.push(h.join("Applications"));
    }
    dirs.into_iter().map(|d| d.join(format!("{name}.app"))).find(|p| p.exists())
}

fn find_cli(def: &Def) -> Option<PathBuf> {
    for c in def.cli {
        if let Ok(p) = which::which(c) {
            return Some(p);
        }
    }
    if cfg!(windows) {
        for w in def.win {
            let p = PathBuf::from(expand_env(w));
            if p.exists() {
                return Some(p);
            }
        }
    }
    None
}

fn is_available(def: &Def) -> bool {
    if cfg!(target_os = "macos") {
        def.mac.map(|m| mac_app_path(m).is_some()).unwrap_or(false) || (def.mac.is_some() && find_cli(def).is_some())
    } else if cfg!(windows) {
        def.windows && find_cli(def).is_some()
    } else {
        (def.linux || def.mac.is_none()) && find_cli(def).is_some()
    }
}

fn list(defs: &[Def]) -> Vec<AppInfo> {
    defs.iter()
        .filter(|d| is_available(d))
        .map(|d| AppInfo { id: d.id.into(), name: d.name.into(), installed: true })
        .collect()
}

#[tauri::command]
pub async fn list_editors() -> Vec<AppInfo> {
    list(EDITORS)
}

#[tauri::command]
pub async fn list_terminals() -> Vec<AppInfo> {
    list(TERMINALS)
}

fn spawn_detached(cmd: &mut Command) -> Result<()> {
    cmd.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    cmd.spawn().map_err(|e| format!("Could not launch: {e}"))?;
    Ok(())
}

fn command_for(path: &Path) -> Command {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if cfg!(windows) && (ext == "cmd" || ext == "bat") {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(path);
        c
    } else {
        Command::new(path)
    }
}

#[tauri::command]
pub async fn open_in_editor(app: AppHandle, editor: String, path: String) -> Result<()> {
    if editor == "system" || editor.is_empty() {
        app.opener().open_path(&path, None::<&str>).map_err(|e| e.to_string())?;
        return Ok(());
    }
    let def = EDITORS.iter().find(|d| d.id == editor).ok_or_else(|| format!("Unknown editor '{editor}'"))?;
    if cfg!(target_os = "macos") {
        if let Some(m) = def.mac {
            if mac_app_path(m).is_some() {
                return spawn_detached(Command::new("open").arg("-a").arg(m).arg(&path));
            }
        }
    }
    match find_cli(def) {
        Some(cli) => spawn_detached(command_for(&cli).arg(&path)),
        None => err(format!("{} is not installed", def.name)),
    }
}

fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

fn applescript_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tauri::command]
pub async fn open_in_terminal(terminal: String, path: String, command: Option<String>) -> Result<()> {
    let command = command.filter(|c| !c.trim().is_empty());
    let def = TERMINALS.iter().find(|d| d.id == terminal);
    let id = if terminal.is_empty() || terminal == "system" {
        if cfg!(target_os = "macos") {
            "terminal"
        } else if cfg!(windows) {
            if which::which("wt").is_ok() { "wt" } else { "powershell" }
        } else {
            "x-terminal-emulator"
        }
    } else {
        def.map(|d| d.id).ok_or_else(|| format!("Unknown terminal '{terminal}'"))?
    };

    #[cfg(target_os = "macos")]
    {
        let line = match &command {
            Some(c) => format!("cd {} && {}", shell_quote(&path), c),
            None => format!("cd {}", shell_quote(&path)),
        };
        match id {
            "terminal" => {
                let script = format!(
                    "tell application \"Terminal\"\nactivate\ndo script \"{}\"\nend tell",
                    applescript_escape(&line)
                );
                return spawn_detached(Command::new("osascript").arg("-e").arg(script));
            }
            "iterm" => {
                let script = format!(
                    "tell application \"iTerm\"\nactivate\nset w to (create window with default profile)\ntell current session of w to write text \"{}\"\nend tell",
                    applescript_escape(&line)
                );
                return spawn_detached(Command::new("osascript").arg("-e").arg(script));
            }
            other => {
                let name = TERMINALS.iter().find(|d| d.id == other).and_then(|d| d.mac).unwrap_or("Terminal");
                if command.is_some() {
                    // Run through a temporary .command script that the terminal app opens.
                    let script = std::env::temp_dir().join(format!("bluephoenix-{}.command", uuid::Uuid::new_v4()));
                    let body = format!("#!/bin/zsh -l\n{line}\nexec $SHELL -l\n");
                    std::fs::write(&script, body)?;
                    use std::os::unix::fs::PermissionsExt;
                    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755))?;
                    return spawn_detached(Command::new("open").arg("-a").arg(name).arg(&script));
                }
                return spawn_detached(Command::new("open").arg("-a").arg(name).arg(&path));
            }
        }
    }

    #[cfg(windows)]
    {
        let cmd_line = command.clone();
        return match id {
            "wt" => {
                let mut c = Command::new("wt");
                c.arg("-d").arg(&path);
                if let Some(cl) = cmd_line {
                    c.arg("cmd").arg("/K").arg(cl);
                }
                spawn_detached(&mut c)
            }
            "powershell" => {
                let exe = if which::which("pwsh").is_ok() { "pwsh" } else { "powershell" };
                let mut c = Command::new("cmd");
                c.args(["/C", "start", "", exe, "-NoExit", "-Command"]);
                let body = match cmd_line {
                    Some(cl) => format!("Set-Location -LiteralPath '{}'; {}", path.replace('\'', "''"), cl),
                    None => format!("Set-Location -LiteralPath '{}'", path.replace('\'', "''")),
                };
                c.arg(body);
                spawn_detached(&mut c)
            }
            "gitbash" => {
                let exe = find_cli(def.unwrap()).ok_or("Git Bash not found")?;
                let mut c = Command::new(exe);
                c.arg(format!("--cd={}", path));
                spawn_detached(&mut c)
            }
            _ => {
                let mut c = Command::new("cmd");
                c.args(["/C", "start", "", "cmd", "/K"]);
                let body = match cmd_line {
                    Some(cl) => format!("cd /d \"{}\" && {}", path, cl),
                    None => format!("cd /d \"{}\"", path),
                };
                c.arg(body);
                spawn_detached(&mut c)
            }
        };
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let bin = which::which(def.map(|d| d.cli[0]).unwrap_or("x-terminal-emulator"))
            .map_err(|_| "No supported terminal emulator found".to_string())?;
        let mut c = Command::new(bin);
        c.current_dir(&path);
        if let Some(cl) = command {
            let script = format!("{cl}; exec \"${{SHELL:-bash}}\"");
            match id {
                "gnome-terminal" | "x-terminal-emulator" | "xfce4-terminal" => {
                    c.arg("--").args(["bash", "-lc", &script])
                }
                _ => c.args(["-e", "bash", "-lc", &script]),
            };
        }
        return spawn_detached(&mut c);
    }

    #[allow(unreachable_code)]
    Ok(())
}

#[tauri::command]
pub async fn reveal_path(app: AppHandle, path: String) -> Result<()> {
    let p = Path::new(&path);
    if p.is_dir() {
        app.opener().open_path(&path, None::<&str>).map_err(|e| e.to_string())?;
    } else {
        app.opener().reveal_item_in_dir(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_url(app: AppHandle, url: String) -> Result<()> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return err("Only http(s) links can be opened");
    }
    app.opener().open_url(&url, None::<&str>).map_err(|e| e.to_string())?;
    Ok(())
}
