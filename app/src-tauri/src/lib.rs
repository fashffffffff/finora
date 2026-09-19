// Команды нативной оболочки: экспорт файлов, показ в Finder
// и локальная AI-модель (модуль ai).
// Вызываются из TypeScript только когда приложение запущено как
// нативное (в браузере их нет — там работает обычное скачивание,
// а чат отвечает правилами).

pub mod ai;

use std::path::PathBuf;

/// Сохранить файл экспорта в ~/Downloads и вернуть полный путь
#[tauri::command]
fn export_file(name: String, data: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "не найдена домашняя папка".to_string())?;
    let path = PathBuf::from(home).join("Downloads").join(&name);
    std::fs::write(&path, data.as_bytes()).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Показать файл в Finder (macOS)
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Полное удаление Finora с этого компьютера: данные, модели AI,
/// хранилища WebView и (опционально) сам .app — в Корзину.
/// Вызывается только явной кнопкой из настроек. Завершает приложение.
#[tauri::command]
fn full_wipe(app: tauri::AppHandle, trash_app: bool) -> Result<(), String> {
    use tauri::Manager;

    // 1. данные приложения: модели AI, локальные файлы
    if let Ok(data_dir) = app.path().app_data_dir() {
        let _ = std::fs::remove_dir_all(data_dir);
    }

    // 2. хранилища WebView (localStorage, кэши, HTTP-сессии)
    if let Ok(home) = std::env::var("HOME") {
        let id = "ru.finora.app";
        for sub in [
            format!("Library/WebKit/{id}"),
            format!("Library/Caches/{id}"),
            format!("Library/HTTPStorages/{id}"),
            format!("Library/Saved Application State/{id}.savedState"),
        ] {
            let _ = std::fs::remove_dir_all(std::path::PathBuf::from(&home).join(sub));
        }
    }

    // 3. сам .app — в Корзину через Finder (обратимо), только если это
    //    установленная копия, а не сборка из build-каталога
    if trash_app {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(bundle) = exe.ancestors().nth(2) {
                let is_installed = bundle
                    .extension()
                    .map(|e| e == "app")
                    .unwrap_or(false)
                    && !bundle.to_string_lossy().contains("/target/");
                if is_installed {
                    let script = format!(
                        "tell application \"Finder\" to delete POSIX file \"{}\"",
                        bundle.display()
                    );
                    let _ = std::process::Command::new("osascript")
                        .arg("-e")
                        .arg(&script)
                        .output();
                }
            }
        }
    }

    app.exit(0);
    #[allow(unreachable_code)]
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      export_file,
      reveal_in_finder,
      full_wipe,
      ai::ai_status,
      ai::ai_download_model,
      ai::ai_cancel_download,
      ai::ai_delete_model,
      ai::ai_chat,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application")
    .run(|_app, event| {
      // при закрытии выгружаем модель из памяти: Metal свежего llama.cpp
      // ассертится при выходе процесса, если ресурсы не освобождены
      if let tauri::RunEvent::Exit = event {
        ai::ai_shutdown();
      }
    });
}
