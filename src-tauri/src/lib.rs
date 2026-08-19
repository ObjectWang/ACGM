use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

const MAX_IMAGE_BYTES: u64 = 10 * 1024 * 1024;

/// Returns the directory containing the executable.
fn exe_dir() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    exe.parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "无法定位 exe 所在目录".to_string())
}

/// Initialize the database directly with rusqlite, ensuring tables exist
/// regardless of when the JS-side Database.load() is called.
fn init_database_schema(db_path: &Path) -> Result<(), String> {
    use rusqlite::Connection;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(include_str!("../migrations/20260819000000_init.sql"))
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../migrations/20260819000000_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[derive(serde::Serialize)]
struct ImageImport {
    file_path: String,
    thumb_path: String,
}

#[tauri::command]
fn get_data_dir(_app: AppHandle) -> Result<String, String> {
    exe_dir().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn get_db_url() -> Result<String, String> {
    exe_dir().map(|p| format!("sqlite:{}", p.join("acgm.db").display()))
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn import_image(
    _app: AppHandle,
    item_id: i64,
    source_path: String,
    is_cover: bool,
) -> Result<ImageImport, String> {
    let source = Path::new(&source_path);
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp") {
        return Err("仅支持 JPG / PNG / WebP 图片".into());
    }

    let meta = std::fs::metadata(source).map_err(|e| format!("无法读取图片: {e}"))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err("单张图片不能超过 10MB".into());
    }

    let data_dir = exe_dir()?;
    let item_dir = data_dir.join("images").join(item_id.to_string());
    std::fs::create_dir_all(&item_dir).map_err(|e| e.to_string())?;

    let stem = if is_cover {
        "cover".to_string()
    } else {
        let millis = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis();
        format!("shot_{millis}")
    };

    let file_name = format!("{stem}.{ext}");
    let dest = item_dir.join(&file_name);
    std::fs::copy(source, &dest).map_err(|e| format!("复制图片失败: {e}"))?;

    let img = image::ImageReader::open(&dest)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let thumb = if img.width() > 300 {
        img.thumbnail(300, u32::MAX).to_rgb8()
    } else {
        img.to_rgb8()
    };

    let thumb_name = format!("{stem}_thumb.jpg");
    let thumb_dest = item_dir.join(&thumb_name);
    thumb
        .save_with_format(&thumb_dest, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;

    Ok(ImageImport {
        file_path: format!("images/{item_id}/{file_name}"),
        thumb_path: format!("images/{item_id}/{thumb_name}"),
    })
}

#[tauri::command]
fn delete_item_images(_app: AppHandle, item_id: i64) -> Result<(), String> {
    let data_dir = exe_dir()?;
    let item_dir = data_dir.join("images").join(item_id.to_string());
    if item_dir.exists() {
        std::fs::remove_dir_all(&item_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_image_file(_app: AppHandle, rel_path: String) -> Result<(), String> {
    let normalized = rel_path.replace('\\', "/");
    if normalized.contains("..") || normalized.starts_with('/') {
        return Err("非法图片路径".into());
    }

    let data_dir = exe_dir()?;
    let target = data_dir.join(normalized);
    if target.exists() {
        std::fs::remove_file(&target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let dir = exe_dir().expect("无法定位 exe 所在目录");
    let db_url = format!("sqlite:{}", dir.join("acgm.db").display());
    let db_path = dir.join("acgm.db");

    // Create the database and run migrations immediately at startup.
    std::fs::create_dir_all(&dir).ok();
    init_database_schema(&db_path).expect("数据库初始化失败");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_url.as_str(), migrations())
                .build(),
        )
        .setup(move |app| {
            std::fs::create_dir_all(dir.join("images"))?;
            // Allow the webview to load images from the exe directory via the asset protocol.
            app.asset_protocol_scope()
                .allow_directory(&dir, true)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_data_dir,
            get_db_url,
            path_exists,
            import_image,
            delete_item_images,
            delete_image_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
