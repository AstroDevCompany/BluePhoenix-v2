mod ai;
mod db;
mod detect;
mod error;
mod files;
mod git;
mod launch;
mod pty;
mod sync;
mod updater;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    platform: &'static str,
    version: String,
    home: Option<String>,
}

#[tauri::command]
fn system_info(app: tauri::AppHandle) -> SystemInfo {
    SystemInfo {
        platform: updater::platform_key(),
        version: app.package_info().version.to_string(),
        home: dirs::home_dir().map(|p| p.to_string_lossy().to_string()),
    }
}

/// GUI apps on macOS/Linux start with a minimal PATH; ask the user's login shell for the real one
/// so git, node, cargo and editor CLIs are found.
#[cfg(unix)]
fn fix_path_env() {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let out = std::process::Command::new(shell)
        .args(["-ilc", "printf '__BP__%s__BP__' \"$PATH\""])
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .output();
    if let Ok(o) = out {
        let text = String::from_utf8_lossy(&o.stdout);
        if let Some(path) = text.split("__BP__").nth(1) {
            if !path.is_empty() {
                // SAFETY: called once at startup before any other threads are spawned.
                unsafe { std::env::set_var("PATH", path) };
            }
        }
    }
}

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    let mut b = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("BluePhoenix")
        .inner_size(1280.0, 820.0)
        .min_inner_size(980.0, 620.0)
        .center()
        // Lets HTML5 drag & drop (to-do reordering) work on Windows.
        .disable_drag_drop_handler()
        .transparent(!cfg!(target_os = "linux"));

    #[cfg(target_os = "macos")]
    {
        b = b
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(tauri::LogicalPosition::new(20.0, 28.0));
    }
    #[cfg(not(target_os = "macos"))]
    {
        b = b.decorations(false);
    }

    let window = b.build()?;

    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, Some(12.0));
    }
    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::{apply_acrylic, apply_mica};
        if apply_mica(&window, None).is_err() {
            let _ = apply_acrylic(&window, Some((18, 18, 28, 120)));
        }
    }
    #[cfg(debug_assertions)]
    if let Ok(path) = std::env::var("BP_DEV_EVAL_FILE") {
        let w = window.clone();
        std::thread::spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_millis(400));
            if let Ok(js) = std::fs::read_to_string(&path) {
                if !js.trim().is_empty() {
                    let _ = std::fs::write(&path, "");
                    let _ = w.eval(&js);
                }
            }
        });
    }
    let _ = &window;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(unix)]
    fix_path_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::PtyState::default())
        .manage(ai::LlamaState::default())
        .manage(sync::SyncGuard::default())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db = db::Db::open(&dir.join("bluephoenix.db"))?;
            app.manage(db);
            build_main_window(app)?;
            sync::start_background(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            system_info,
            // data
            db::projects_list,
            db::project_save,
            db::project_touch,
            db::project_remove,
            db::commands_list,
            db::command_save,
            db::command_delete,
            db::pages_list,
            db::page_save,
            db::page_delete,
            db::todos_list,
            db::todo_save,
            db::todos_save_many,
            db::todo_delete,
            db::time_list,
            db::time_save,
            db::time_delete,
            db::settings_get_all,
            db::settings_set,
            // git
            git::git_status,
            git::git_branches,
            git::git_tags,
            git::git_log,
            git::git_diff,
            git::git_show,
            git::git_fetch,
            git::git_pull,
            git::git_push,
            git::git_stash,
            git::git_stash_apply,
            git::git_stash_list,
            git::git_checkout,
            git::git_create_branch,
            git::git_delete_branch,
            git::git_merge,
            git::git_merge_abort,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
            git::git_init,
            // launch
            launch::list_editors,
            launch::list_terminals,
            launch::open_in_editor,
            launch::open_in_terminal,
            launch::reveal_path,
            launch::open_url,
            // terminal
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            // detection + files
            detect::detect_project,
            detect::project_snapshot,
            files::files_index,
            files::files_list,
            files::files_count,
            // ai
            ai::ai_providers,
            ai::ai_models,
            ai::ai_complete,
            ai::secret_set,
            ai::secret_has,
            ai::llama_start,
            ai::llama_stop,
            // sync
            sync::sync_test,
            sync::sync_connect,
            sync::sync_now,
            sync::sync_disconnect,
            sync::sync_status,
            // updater
            updater::check_update,
            updater::download_update,
            updater::install_update,
            updater::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BluePhoenix");
}
