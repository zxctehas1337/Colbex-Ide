use git2::{Repository, StatusOptions};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct GitFileStatus {
    path: String,
    status: String, // "modified", "new", "deleted", etc.
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GitInfo {
    branch: String,
    is_clean: bool,
    modified_files: usize,
    untracked_files: usize,
}

#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;
    let mut statuses = Vec::new();
    
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);

    for entry in repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?.iter() {
        let status = entry.status();
        let status_str = if status.is_wt_new() {
            "new"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_wt_deleted() {
            "deleted"
        } else {
            "unknown"
        };

        if let Some(path) = entry.path() {
            statuses.push(GitFileStatus {
                path: path.to_string(),
                status: status_str.to_string(),
            });
        }
    }

    Ok(statuses)
}

#[tauri::command]
pub fn git_info(path: String) -> Result<GitInfo, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;
    
    // Получаем текущую ветку
    let branch_name = match repo.head() {
        Ok(head) => {
            if let Some(name) = head.shorthand() {
                name.to_string()
            } else {
                "HEAD".to_string()
            }
        }
        Err(_) => "main".to_string(),
    };
    
    // Получаем статус
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    let mut modified_files = 0;
    let mut untracked_files = 0;
    
    for entry in statuses.iter() {
        let status = entry.status();
        if status.is_wt_new() {
            untracked_files += 1;
        } else if status.is_wt_modified() || status.is_wt_deleted() {
            modified_files += 1;
        }
    }
    
    let is_clean = modified_files == 0 && untracked_files == 0;
    
    Ok(GitInfo {
        branch: branch_name,
        is_clean,
        modified_files,
        untracked_files,
    })
}

#[tauri::command]
pub fn git_clone(url: String, path: String) -> Result<(), String> {
    Repository::clone(&url, &path).map_err(|e| e.to_string())?;
    Ok(())
}
