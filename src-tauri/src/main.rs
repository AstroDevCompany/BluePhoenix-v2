// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // `bluephoenix commit` / `bluephoenix add` run headless; anything else starts the app.
    if let Some(code) = bluephoenix_lib::cli::dispatch() {
        std::process::exit(code);
    }
    bluephoenix_lib::run()
}
