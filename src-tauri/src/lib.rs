use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{
    Builder as ShortcutBuilder, GlobalShortcutExt, ShortcutState,
};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_tasks_tags",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_recurrence",
            sql: include_str!("../migrations/002_add_recurrence.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_focus",
            sql: include_str!("../migrations/003_add_focus.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_schedule_mode",
            sql: include_str!("../migrations/004_add_schedule_mode.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[tauri::command]
fn set_tray_title(app: AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(title));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(ShortcutBuilder::new().build())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:flowtask.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![set_tray_title])
        .setup(|app| {
            // 全局快捷键：Ctrl+Shift+T 唤起窗口并触发快速新建。
            app.global_shortcut().on_shortcut(
                "ctrl+shift+t",
                |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.emit("shortcuts://quick-add", ());
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                },
            )?;

            // 系统托盘 + 右键菜单。
            let toggle = MenuItem::with_id(app, "toggle", "显示 / 隐藏", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出 FlowTask", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&toggle, &sep, &quit])?;

            let mut tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            let _tray = tray.build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
