use std::fs;

use tauri::Window;
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

use super::glob_utils::{build_globset, is_ignored_dir};
use super::search::{build_search_regex, preserve_case};
use super::types::*;

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            children: None,
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.cmp(&b.name)
        } else {
            b.is_dir.cmp(&a.is_dir)
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}


#[tauri::command]
pub fn get_asset_url(path: String) -> String {
    let normalized_path = path.replace("\\", "/");
    format!("asset://localhost/{}", normalized_path)
}

#[tauri::command]
pub async fn open_file_dialog(window: Window) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    window
        .dialog()
        .file()
        .add_filter("All Files", &["*"])
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| match p {
                tauri_plugin_dialog::FilePath::Path(path) => path.to_string_lossy().to_string(),
                tauri_plugin_dialog::FilePath::Url(url) => url.to_string(),
            }));
        });

    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_folder_dialog(window: Window) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    window.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| match p {
            tauri_plugin_dialog::FilePath::Path(path) => path.to_string_lossy().to_string(),
            tauri_plugin_dialog::FilePath::Url(url) => url.to_string(),
        }));
    });

    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_terminal() -> Result<(), String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "start", "cmd"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args(&["-e", "tell application \"Terminal\" to activate"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("gnome-terminal")
            .spawn()
            .or_else(|_| Command::new("xterm").spawn())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn search_in_files(
    root_path: String,
    options: SearchOptions,
) -> Result<Vec<SearchResult>, String> {
    let include_set = build_globset(&options.include_pattern)?;
    let exclude_set = build_globset(&options.exclude_pattern)?;
    let filter_set = build_globset(&options.filter_pattern)?;
    let re = build_search_regex(&options)?;

    let mut results: Vec<SearchResult> = Vec::new();

    for entry in WalkDir::new(&root_path).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        if path.iter().any(|c| is_ignored_dir(c)) {
            continue;
        }

        if let Some(ex) = &exclude_set {
            if ex.is_match(path) {
                continue;
            }
        }
        if let Some(inc) = &include_set {
            if !inc.is_match(path) {
                continue;
            }
        }
        if let Some(flt) = &filter_set {
            if !flt.is_match(path) {
                continue;
            }
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut matches: Vec<SearchMatch> = Vec::new();
        for (idx, line) in content.lines().enumerate() {
            for m in re.find_iter(line) {
                let line_text = if line.len() > 400 {
                    format!("{}...", &line[..400])
                } else {
                    line.to_string()
                };

                matches.push(SearchMatch {
                    line: (idx + 1) as u32,
                    char_start: m.start() as u32,
                    char_end: m.end() as u32,
                    line_text,
                });
            }
        }

        if !matches.is_empty() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            results.push(SearchResult {
                file: SearchFile {
                    name: file_name,
                    path: path.to_string_lossy().to_string(),
                },
                matches,
            });
        }
    }

    Ok(results)
}


#[tauri::command]
pub fn replace_all(
    root_path: String,
    options: SearchOptions,
    replace_query: String,
    preserve_case_flag: bool,
) -> Result<ReplaceAllResult, String> {
    let include_set = build_globset(&options.include_pattern)?;
    let exclude_set = build_globset(&options.exclude_pattern)?;
    let filter_set = build_globset(&options.filter_pattern)?;
    let re = build_search_regex(&options)?;

    let mut total_replacements: u64 = 0;
    let mut files_changed: u32 = 0;

    for entry in WalkDir::new(&root_path).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        if path.iter().any(|c| is_ignored_dir(c)) {
            continue;
        }

        if let Some(ex) = &exclude_set {
            if ex.is_match(path) {
                continue;
            }
        }
        if let Some(inc) = &include_set {
            if !inc.is_match(path) {
                continue;
            }
        }
        if let Some(flt) = &filter_set {
            if !flt.is_match(path) {
                continue;
            }
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut changed = false;
        let mut replacements_in_file: u64 = 0;

        let new_content = re
            .replace_all(&content, |caps: &regex::Captures| {
                replacements_in_file += 1;
                changed = true;
                let matched = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                if preserve_case_flag {
                    preserve_case(&replace_query, matched)
                } else {
                    replace_query.clone()
                }
            })
            .to_string();

        if changed {
            fs::write(path, new_content).map_err(|e| e.to_string())?;
            total_replacements += replacements_in_file;
            files_changed += 1;
        }
    }

    Ok(ReplaceAllResult {
        total_replacements,
        files_changed,
    })
}

#[tauri::command]
pub fn get_all_files(root_path: String) -> Result<Vec<SearchFile>, String> {
    let mut files: Vec<SearchFile> = Vec::new();

    for entry in WalkDir::new(&root_path).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        if path.iter().any(|c| is_ignored_dir(c)) {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();

        files.push(SearchFile {
            name: file_name,
            path: path.to_string_lossy().to_string(),
        });
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(files)
}
