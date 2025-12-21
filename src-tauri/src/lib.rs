mod fs;
mod git_commands;
mod ports;
mod problems;
mod terminal;

use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(terminal::default_terminal_sessions())
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.create_overlay_titlebar().unwrap();

            #[cfg(target_os = "macos")]
            {
                main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
                main_window.make_transparent().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs::read_dir,
            fs::read_file,
            fs::read_file_binary,
            fs::get_asset_url,
            fs::write_file,
            fs::open_file_dialog,
            fs::open_folder_dialog,
            fs::open_terminal,
            fs::search_in_files,
            fs::replace_all,
            fs::get_all_files,
            git_commands::git_status,
            git_commands::git_info,
            git_commands::git_clone,
            terminal::create_terminal,
            terminal::write_terminal,
            terminal::resize_terminal,
            terminal::close_terminal,
            terminal::get_terminal_info,
            ports::get_listening_ports,
            problems::get_problems
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
