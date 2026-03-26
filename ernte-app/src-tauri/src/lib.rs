use std::fs;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn sync_history(md_content: &str, json_content: &str) -> Result<(), String> {
    let md_path = "../../HISTORIE.MD";
    let json_path = "../src/historie.json";
    
    fs::write(md_path, md_content).map_err(|e| e.to_string())?;
    fs::write(json_path, json_content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, sync_history])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
