//! Installs the `bluephoenix` command so it works in any terminal.
//!
//! macOS / Linux: a tiny shell script in `~/.local/bin` that runs the app's executable with
//! `--cli`; if that folder is not on PATH, a marked block is added to the shell's startup file.
//! Windows: a console-subsystem copy of the app's executable in `%LOCALAPPDATA%\BluePhoenix\bin`
//! (the normal app is a GUI program and cannot print to a terminal), and that folder is added to
//! the user's PATH. Everything is per-user and needs no administrator rights.

#![cfg_attr(windows, allow(dead_code))]

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::db::{self, Db};
use crate::error::{err, AppError, Result};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    pub installed: bool,
    /// The installed command points at this copy of the app and is current.
    pub up_to_date: bool,
    pub path: Option<String>,
    /// A new terminal will find the command (its folder is on PATH).
    pub on_path: bool,
}

fn home() -> Result<PathBuf> {
    dirs::home_dir().ok_or_else(|| AppError::Msg("Could not find your home folder".into()))
}

fn bin_dir() -> Result<PathBuf> {
    if cfg!(windows) {
        Ok(dirs::data_local_dir().ok_or_else(|| AppError::Msg("Could not find the local app data folder".into()))?.join("BluePhoenix").join("bin"))
    } else {
        Ok(home()?.join(".local").join("bin"))
    }
}

fn shim_path() -> Result<PathBuf> {
    Ok(bin_dir()?.join(if cfg!(windows) { "bluephoenix.exe" } else { "bluephoenix" }))
}

/// True when this process is the installed Windows console copy (it always behaves as the CLI).
pub fn running_as_cli_copy() -> bool {
    if !cfg!(windows) {
        return false;
    }
    let (Ok(exe), Ok(dir)) = (std::env::current_exe(), bin_dir()) else { return false };
    exe.parent().is_some_and(|p| same_path(p, &dir))
}

fn same_path(a: &Path, b: &Path) -> bool {
    let norm = |p: &Path| p.to_string_lossy().trim_end_matches(['\\', '/']).to_lowercase();
    norm(a) == norm(b)
}

/// The executable the command should launch.
fn app_executable() -> Result<PathBuf> {
    let appimage = std::env::var_os("APPIMAGE").map(PathBuf::from).filter(|p| p.is_file());
    let exe = match appimage {
        Some(p) => p,
        None => std::env::current_exe()?,
    };
    let exe = std::fs::canonicalize(&exe).unwrap_or(exe);
    if exe.to_string_lossy().contains("AppTranslocation") {
        return err("BluePhoenix is running from a temporary location. Move it to your Applications folder, reopen it, and install the command line again.");
    }
    Ok(exe)
}

// ---------- shell startup block (macOS / Linux) ----------

const BLOCK_START: &str = "# >>> BluePhoenix CLI >>>";
const BLOCK_END: &str = "# <<< BluePhoenix CLI <<<";
const POSIX_PATH_LINE: &str = "export PATH=\"$HOME/.local/bin:$PATH\"";

/// `content` with the marked block appended, or `None` if it is already there.
fn with_block(content: &str, line: &str) -> Option<String> {
    if content.contains(BLOCK_START) {
        return None;
    }
    let gap = if content.is_empty() { "" } else if content.ends_with('\n') { "\n" } else { "\n\n" };
    Some(format!("{content}{gap}{BLOCK_START}\n{line}\n{BLOCK_END}\n"))
}

/// `content` without the marked block, or `None` if there is none.
fn without_block(content: &str) -> Option<String> {
    let start = content.find(BLOCK_START)?;
    let end = content[start..].find(BLOCK_END)? + start + BLOCK_END.len();
    let end = if content[end..].starts_with('\n') { end + 1 } else { end };
    // Also drop the blank line that `with_block` put in front of the block.
    let start = if content[..start].ends_with("\n\n") { start - 1 } else { start };
    Some(format!("{}{}", &content[..start], &content[end..]))
}

fn shell_name() -> String {
    std::env::var("SHELL").ok().and_then(|s| Path::new(&s).file_name().map(|n| n.to_string_lossy().to_string())).unwrap_or_default()
}

/// Startup file that should put `~/.local/bin` on PATH, with the line to put there.
fn startup_file() -> Result<(PathBuf, &'static str)> {
    let home = home()?;
    Ok(match shell_name().as_str() {
        "zsh" => (std::env::var_os("ZDOTDIR").map(PathBuf::from).unwrap_or(home).join(".zshrc"), POSIX_PATH_LINE),
        "bash" => (home.join(if cfg!(target_os = "macos") { ".bash_profile" } else { ".bashrc" }), POSIX_PATH_LINE),
        "fish" => (home.join(".config/fish/conf.d/bluephoenix.fish"), "fish_add_path -g $HOME/.local/bin"),
        _ => (home.join(".profile"), POSIX_PATH_LINE),
    })
}

/// Every file `uninstall` should clean, whatever shell was used at install time.
fn all_startup_files() -> Result<Vec<PathBuf>> {
    let home = home()?;
    let mut v = vec![home.join(".zshrc"), home.join(".bashrc"), home.join(".bash_profile"), home.join(".profile"), home.join(".config/fish/conf.d/bluephoenix.fish")];
    if let Some(z) = std::env::var_os("ZDOTDIR") {
        v.push(PathBuf::from(z).join(".zshrc"));
    }
    Ok(v)
}

#[cfg(unix)]
fn dir_on_path(dir: &Path) -> bool {
    std::env::var_os("PATH").is_some_and(|p| std::env::split_paths(&p).any(|e| same_path(&e, dir)))
}

// ---------- unix install ----------

#[cfg(unix)]
fn sh_quote(p: &Path) -> String {
    format!("'{}'", p.to_string_lossy().replace('\'', "'\\''"))
}

#[cfg(unix)]
fn shim_script(target: &Path) -> String {
    format!("#!/bin/sh\n# Managed by BluePhoenix (Settings > Command line). Safe to delete.\nexec {} --cli \"$@\"\n", sh_quote(target))
}

#[cfg(unix)]
fn status_impl() -> Result<CliStatus> {
    let shim = shim_path()?;
    let installed = shim.is_file();
    let up_to_date = installed && app_executable().ok().is_some_and(|t| std::fs::read_to_string(&shim).is_ok_and(|c| c == shim_script(&t)));
    let in_startup_file = startup_file().ok().is_some_and(|(f, _)| std::fs::read_to_string(f).is_ok_and(|c| c.contains(BLOCK_START)));
    Ok(CliStatus { installed, up_to_date, path: installed.then(|| shim.to_string_lossy().to_string()), on_path: dir_on_path(&bin_dir()?) || in_startup_file })
}

#[cfg(unix)]
fn install_impl() -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let target = app_executable()?;
    let dir = bin_dir()?;
    std::fs::create_dir_all(&dir)?;
    let shim = shim_path()?;
    let script = shim_script(&target);
    if std::fs::read_to_string(&shim).map_or(true, |c| c != script) {
        // Replace rather than overwrite, so a symlink left by an older install is not followed.
        let _ = std::fs::remove_file(&shim);
        std::fs::write(&shim, script)?;
    }
    std::fs::set_permissions(&shim, std::fs::Permissions::from_mode(0o755))?;

    if !dir_on_path(&dir) {
        let (file, line) = startup_file()?;
        let current = std::fs::read_to_string(&file).unwrap_or_default();
        if let Some(updated) = with_block(&current, line) {
            if let Some(parent) = file.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&file, updated)?;
        }
    }
    Ok(())
}

#[cfg(unix)]
fn uninstall_impl() -> Result<()> {
    let _ = std::fs::remove_file(shim_path()?);
    for file in all_startup_files()? {
        let Ok(content) = std::fs::read_to_string(&file) else { continue };
        if file.file_name().is_some_and(|n| n == "bluephoenix.fish") {
            if content.contains(BLOCK_START) {
                let _ = std::fs::remove_file(&file);
            }
        } else if let Some(cleaned) = without_block(&content) {
            std::fs::write(&file, cleaned)?;
        }
    }
    Ok(())
}

// ---------- windows install ----------

/// Flips the PE "subsystem" field from GUI (2) to console (3) so the copy can print to a terminal.
/// Returns false when `bytes` is not a PE image.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn pe_make_console(bytes: &mut [u8]) -> bool {
    let u32_at = |b: &[u8], o: usize| b.get(o..o + 4).map(|s| u32::from_le_bytes([s[0], s[1], s[2], s[3]]));
    let Some(pe) = u32_at(bytes, 0x3C).map(|v| v as usize) else { return false };
    if bytes.get(pe..pe + 4) != Some(b"PE\0\0") {
        return false;
    }
    // 4 bytes signature + 20 bytes COFF header, then the optional header; Subsystem sits at +68
    // in both PE32 and PE32+.
    let subsystem = pe + 24 + 68;
    match bytes.get_mut(subsystem..subsystem + 2) {
        Some(field) => {
            field.copy_from_slice(&3u16.to_le_bytes());
            true
        }
        None => false,
    }
}

#[cfg(windows)]
mod win {
    use std::io;

    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_EXPAND_SZ};
    use winreg::{RegKey, RegValue};

    fn env_key() -> io::Result<RegKey> {
        RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags("Environment", KEY_READ | KEY_WRITE)
    }

    fn decode(v: &RegValue) -> String {
        let units: Vec<u16> = v.bytes.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        String::from_utf16_lossy(&units).trim_end_matches('\0').to_string()
    }

    fn encode(s: &str) -> Vec<u8> {
        s.encode_utf16().chain(std::iter::once(0)).flat_map(u16::to_le_bytes).collect()
    }

    fn same(a: &str, b: &str) -> bool {
        a.trim().trim_end_matches('\\').eq_ignore_ascii_case(b.trim().trim_end_matches('\\'))
    }

    pub fn is_on_path(dir: &str) -> bool {
        env_key().and_then(|k| k.get_raw_value("Path")).is_ok_and(|v| decode(&v).split(';').any(|e| same(e, dir)))
    }

    /// Adds (`add`) or removes `dir` from the user's PATH, keeping the value's registry type.
    pub fn set_on_path(dir: &str, add: bool) -> io::Result<()> {
        let key = env_key()?;
        let (current, vtype) = match key.get_raw_value("Path") {
            Ok(v) => (decode(&v), v.vtype),
            Err(e) if e.kind() == io::ErrorKind::NotFound => (String::new(), REG_EXPAND_SZ),
            Err(e) => return Err(e),
        };
        let mut entries: Vec<&str> = current.split(';').filter(|e| !e.trim().is_empty()).collect();
        let present = entries.iter().any(|e| same(e, dir));
        if add == present {
            return Ok(());
        }
        if add {
            entries.push(dir);
        } else {
            entries.retain(|e| !same(e, dir));
        }
        key.set_raw_value("Path", &RegValue { vtype, bytes: encode(&entries.join(";")).into() })?;
        broadcast_environment_change();
        Ok(())
    }

    /// Tells Explorer and running shells to reload their environment, so new terminals see the change.
    fn broadcast_environment_change() {
        unsafe extern "system" {
            fn SendMessageTimeoutW(hwnd: isize, msg: u32, wparam: usize, lparam: *const u16, flags: u32, timeout: u32, result: *mut usize) -> isize;
        }
        const HWND_BROADCAST: isize = 0xFFFF;
        const WM_SETTINGCHANGE: u32 = 0x001A;
        const SMTO_ABORTIFHUNG: u32 = 0x0002;
        let param: Vec<u16> = "Environment".encode_utf16().chain(std::iter::once(0)).collect();
        let mut result = 0usize;
        // SAFETY: `param` is a NUL-terminated UTF-16 string that outlives the call.
        unsafe { SendMessageTimeoutW(HWND_BROADCAST, WM_SETTINGCHANGE, 0, param.as_ptr(), SMTO_ABORTIFHUNG, 3000, &mut result) };
    }
}

#[cfg(windows)]
fn stamp_path() -> Result<PathBuf> {
    Ok(bin_dir()?.join("bluephoenix.stamp"))
}

/// Identifies the app build the console copy was made from.
#[cfg(windows)]
fn stamp(source: &Path) -> Result<String> {
    Ok(format!("{}|{}", env!("CARGO_PKG_VERSION"), std::fs::metadata(source)?.len()))
}

#[cfg(windows)]
fn status_impl() -> Result<CliStatus> {
    let shim = shim_path()?;
    let installed = shim.is_file();
    let recorded = std::fs::read_to_string(stamp_path()?).ok();
    let up_to_date = installed && app_executable().ok().and_then(|t| stamp(&t).ok()).is_some_and(|want| recorded.as_deref() == Some(want.as_str()));
    let dir = bin_dir()?;
    Ok(CliStatus { installed, up_to_date, path: installed.then(|| shim.to_string_lossy().to_string()), on_path: win::is_on_path(&dir.to_string_lossy()) })
}

#[cfg(windows)]
fn install_impl() -> Result<()> {
    let source = app_executable()?;
    let dir = bin_dir()?;
    std::fs::create_dir_all(&dir)?;
    let shim = shim_path()?;
    let want = stamp(&source)?;
    if !(shim.is_file() && std::fs::read_to_string(stamp_path()?).is_ok_and(|s| s == want)) {
        let mut bytes = std::fs::read(&source)?;
        if !pe_make_console(&mut bytes) {
            return err("The BluePhoenix executable has an unexpected format");
        }
        let tmp = dir.join("bluephoenix.exe.new");
        std::fs::write(&tmp, bytes)?;
        if let Err(e) = std::fs::rename(&tmp, &shim) {
            let _ = std::fs::remove_file(&tmp);
            return err(format!("Could not replace the command ({e}). Close any terminal running bluephoenix and try again."));
        }
        std::fs::write(stamp_path()?, want)?;
    }
    win::set_on_path(&dir.to_string_lossy(), true)?;
    Ok(())
}

#[cfg(windows)]
fn uninstall_impl() -> Result<()> {
    let dir = bin_dir()?;
    win::set_on_path(&dir.to_string_lossy(), false)?;
    let _ = std::fs::remove_file(stamp_path()?);
    // A running console copy cannot be deleted, but it can be renamed out of the way.
    let shim = shim_path()?;
    if std::fs::remove_file(&shim).is_err() && shim.exists() {
        let _ = std::fs::rename(&shim, dir.join("bluephoenix.exe.old"));
    }
    Ok(())
}

// ---------- public API ----------

pub fn status() -> Result<CliStatus> {
    status_impl()
}

pub fn install() -> Result<CliStatus> {
    install_impl()?;
    status_impl()
}

pub fn uninstall() -> Result<CliStatus> {
    uninstall_impl()?;
    status_impl()
}

const AUTOINSTALL: &str = "cli.autoinstall";

/// Keeps the command current: installs it on first run and repairs it after the app moved or updated.
/// Does nothing once the user has removed it in Settings, and never in development builds.
pub fn ensure_installed(db: &Db) {
    if cfg!(debug_assertions) || db::setting(db, AUTOINSTALL).as_deref() == Some("false") {
        return;
    }
    if status().is_ok_and(|s| s.installed && s.up_to_date && s.on_path) {
        return;
    }
    let _ = install();
}

#[tauri::command]
pub async fn cli_status() -> Result<CliStatus> {
    status()
}

#[tauri::command]
pub async fn cli_install(db: tauri::State<'_, Db>) -> Result<CliStatus> {
    let s = tokio::task::spawn_blocking(install).await.map_err(|e| e.to_string())??;
    db::set_setting(&db, AUTOINSTALL, "true")?;
    Ok(s)
}

#[tauri::command]
pub async fn cli_uninstall(db: tauri::State<'_, Db>) -> Result<CliStatus> {
    let s = tokio::task::spawn_blocking(uninstall).await.map_err(|e| e.to_string())??;
    db::set_setting(&db, AUTOINSTALL, "false")?;
    Ok(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_and_removes_the_startup_block() {
        let original = "export FOO=1\n";
        let with = with_block(original, POSIX_PATH_LINE).unwrap();
        assert!(with.contains(BLOCK_START) && with.contains(POSIX_PATH_LINE));
        assert!(with_block(&with, POSIX_PATH_LINE).is_none(), "adding twice must be a no-op");
        assert_eq!(without_block(&with).unwrap(), original);
        assert!(without_block(original).is_none());
    }

    #[test]
    fn startup_block_handles_files_without_trailing_newline() {
        let with = with_block("alias a=b", POSIX_PATH_LINE).unwrap();
        assert!(with.starts_with("alias a=b\n\n# >>>"));
        assert_eq!(without_block(&with).unwrap(), "alias a=b\n");
        assert_eq!(without_block(&with_block("", POSIX_PATH_LINE).unwrap()).unwrap(), "");
    }

    #[cfg(unix)]
    #[test]
    fn shim_quotes_the_app_path() {
        let s = shim_script(Path::new("/Applications/Blue Phoenix's/BluePhoenix"));
        assert!(s.starts_with("#!/bin/sh\n"));
        assert!(s.contains(r#"exec '/Applications/Blue Phoenix'\''s/BluePhoenix' --cli "$@""#));
    }

    #[test]
    fn patches_the_pe_subsystem() {
        let mut img = vec![0u8; 0x200];
        img[0x3C] = 0x80; // e_lfanew
        img[0x80..0x84].copy_from_slice(b"PE\0\0");
        let subsystem = 0x80 + 24 + 68;
        img[subsystem] = 2;
        assert!(pe_make_console(&mut img));
        assert_eq!(&img[subsystem..subsystem + 2], &3u16.to_le_bytes());
        assert!(!pe_make_console(&mut vec![0u8; 16]), "not a PE image");
        let mut bad = img.clone();
        bad[0x80] = b'X';
        assert!(!pe_make_console(&mut bad));
    }
}
