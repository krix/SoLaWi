use std::fs;
use std::path::{Path, PathBuf};

use tauri_plugin_dialog::DialogExt;

/// Checks whether a directory contains any history or master-data files.
fn contains_data_files(dir: &Path) -> bool {
    fs::read_dir(dir)
        .map(|entries| {
            entries.filter_map(|e| e.ok()).any(|e| {
                let name = e.file_name().into_string().unwrap_or_default();
                (name.starts_with("historie-") && name.ends_with(".json"))
                    || name == "stammdaten.json"
            })
        })
        .unwrap_or(false)
}

/// Resolves the data directory by searching upwards from the executable
/// (handles dev-mode where the exe is inside target/debug/) and also
/// checks the current working directory and Linux resource paths.
/// Prefers the highest-level (outermost) directory that contains data
/// files so that in dev-mode the workspace root is chosen over
/// target/debug/ which may only hold a partial copy.
/// Falls back to the exe directory for fresh installs.
fn get_base_path() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    // Walk upwards from exe directory and remember every directory that
    // contains data files.  The last (= highest / outermost) match wins.
    let mut best_match: Option<PathBuf> = None;
    let mut candidate = exe_dir.clone();
    for _ in 0..6 {
        if contains_data_files(&candidate) {
            best_match = Some(candidate.clone());
        }
        match candidate.parent() {
            Some(parent) => candidate = parent.to_path_buf(),
            None => break,
        }
    }

    if let Some(path) = best_match {
        return path;
    }

    // Also check current working directory and its parent
    if let Ok(cwd) = std::env::current_dir() {
        if contains_data_files(&cwd) {
            return cwd;
        }
        if let Some(parent) = cwd.parent() {
            if contains_data_files(&parent.to_path_buf()) {
                return parent.to_path_buf();
            }
        }
    }

    // Linux .deb: resources are at /usr/lib/<identifier>/
    #[cfg(target_os = "linux")]
    {
        let linux_resource_dir = PathBuf::from("/usr/lib/com.solawi.ernte");
        if contains_data_files(&linux_resource_dir) {
            return linux_resource_dir;
        }
    }

    // Fallback: exe directory (fresh install, no existing data)
    exe_dir
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_csv_file(handle: tauri::AppHandle, content: String, default_name: String) -> Result<(), String> {
    let path = handle.dialog()
        .file()
        .set_file_name(default_name)
        .add_filter("CSV", &["csv"])
        .set_title("CSV Export Speichern")
        .blocking_save_file();
    
    if let Some(p) = path {
        let p_buf: std::path::PathBuf = p.into_path().map_err(|e| e.to_string())?;
        fs::write(p_buf, content).map_err(|e: std::io::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn sync_history(year: &str, json_content: &str) -> Result<(), String> {
    let base = get_base_path();
    let json_path = base.join(format!("historie-{}.json", year));
    
    fs::write(json_path, json_content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn load_history(year: &str) -> Result<String, String> {
    let json_path = get_base_path().join(format!("historie-{}.json", year));
    if !json_path.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(json_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_history_years() -> Result<Vec<String>, String> {
    let mut years = Vec::new();
    let root = get_base_path();
    let paths = fs::read_dir(root).map_err(|e| e.to_string())?;

    for path in paths {
        if let Ok(entry) = path {
            let filename = entry.file_name().into_string().unwrap_or_default();
            if filename.starts_with("historie-") && filename.ends_with(".json") {
                let year = filename
                    .replace("historie-", "")
                    .replace(".json", "");
                years.push(year);
            }
        }
    }
    years.sort();
    years.reverse(); // Newest first
    Ok(years)
}

#[tauri::command]
fn load_all_history() -> Result<String, String> {
    let years = list_history_years()?;
    let mut all_data = Vec::new();
    let base = get_base_path();
    
    for year in years {
        let json_path = base.join(format!("historie-{}.json", year));
        if let Ok(content) = fs::read_to_string(json_path) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(arr) = parsed.as_array() {
                    all_data.extend(arr.clone());
                }
            }
        }
    }
    
    serde_json::to_string(&all_data).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_master_data(articles_json: &str, depots_json: &str) -> Result<(), String> {
    let base = get_base_path();
    let json_path = base.join("stammdaten.json");
    
    let combined = serde_json::json!({
        "articles": serde_json::from_str::<serde_json::Value>(articles_json).unwrap_or_default(),
        "depots": serde_json::from_str::<serde_json::Value>(depots_json).unwrap_or_default()
    });
    
    fs::write(json_path, combined.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_master_data() -> Result<String, String> {
    let json_path = get_base_path().join("stammdaten.json");
    if !json_path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(json_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, sync_history, load_history, list_history_years, save_csv_file, load_all_history, save_master_data, load_master_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
