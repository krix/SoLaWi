use std::fs;

use tauri_plugin_dialog::DialogExt;

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
fn sync_history(year: &str, md_content: &str, json_content: &str) -> Result<(), String> {
    // Files are stored in the project root (one level above ernte-app)
    // Relative to src-tauri: ../../
    let md_path = format!("../../HISTORIE-{}.MD", year);
    let json_path = format!("../../historie-{}.json", year);
    
    fs::write(md_path, md_content).map_err(|e| e.to_string())?;
    fs::write(json_path, json_content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn load_history(year: &str) -> Result<String, String> {
    let json_path = format!("../../historie-{}.json", year);
    if !std::path::Path::new(&json_path).exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(json_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_history_years() -> Result<Vec<String>, String> {
    let mut years = Vec::new();
    let root = "../../";
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
    
    for year in years {
        let json_path = format!("../../historie-{}.json", year);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, sync_history, load_history, list_history_years, save_csv_file, load_all_history])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
