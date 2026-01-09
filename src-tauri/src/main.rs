#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use std::sync::Mutex;
use lazy_static::lazy_static;

// global storage for the last sync menu item updater function
lazy_static! {
    static ref MENU_UPDATER: Mutex<Option<Box<dyn Fn(String) + Send>>> = Mutex::new(None);
}


#[tauri::command]
async fn update_tray_sync_time(_app_handle: tauri::AppHandle, time_str: String) -> Result<(), String> {
    // update the menu item via the updater closure
    if let Some(updater) = MENU_UPDATER.lock().expect("Failed to lock MENU_UPDATER").as_ref() {
        updater(time_str);
    }
    
    Ok(())
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                -- Accounts table
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    server_url TEXT NOT NULL,
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    server_type TEXT,
                    last_sync TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1
                );

                -- Calendars table
                CREATE TABLE IF NOT EXISTS calendars (
                    id TEXT PRIMARY KEY NOT NULL,
                    account_id TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    url TEXT NOT NULL,
                    ctag TEXT,
                    sync_token TEXT,
                    color TEXT,
                    icon TEXT,
                    supported_components TEXT,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
                );

                -- Tasks table
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    uid TEXT NOT NULL UNIQUE,
                    etag TEXT,
                    href TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    completed INTEGER NOT NULL DEFAULT 0,
                    completed_at TEXT,
                    tags TEXT,
                    category_id TEXT,
                    priority TEXT NOT NULL DEFAULT 'none',
                    start_date TEXT,
                    start_date_all_day INTEGER,
                    due_date TEXT,
                    due_date_all_day INTEGER,
                    created_at TEXT NOT NULL,
                    modified_at TEXT NOT NULL,
                    reminders TEXT,
                    subtasks TEXT NOT NULL DEFAULT '[]',
                    parent_uid TEXT,
                    is_collapsed INTEGER DEFAULT 0,
                    sort_order INTEGER NOT NULL,
                    account_id TEXT NOT NULL,
                    calendar_id TEXT NOT NULL,
                    synced INTEGER NOT NULL DEFAULT 0,
                    local_only INTEGER DEFAULT 0,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
                );

                -- Tags table
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    color TEXT NOT NULL,
                    icon TEXT
                );

                -- Pending deletions table
                CREATE TABLE IF NOT EXISTS pending_deletions (
                    uid TEXT PRIMARY KEY NOT NULL,
                    href TEXT NOT NULL,
                    account_id TEXT NOT NULL,
                    calendar_id TEXT NOT NULL
                );

                -- UI State table (single row)
                CREATE TABLE IF NOT EXISTS ui_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    active_account_id TEXT,
                    active_calendar_id TEXT,
                    active_tag_id TEXT,
                    selected_task_id TEXT,
                    search_query TEXT NOT NULL DEFAULT '',
                    sort_mode TEXT NOT NULL DEFAULT 'manual',
                    sort_direction TEXT NOT NULL DEFAULT 'asc',
                    show_completed_tasks INTEGER NOT NULL DEFAULT 1,
                    is_editor_open INTEGER NOT NULL DEFAULT 0
                );

                -- Insert default UI state row
                INSERT OR IGNORE INTO ui_state (id) VALUES (1);

                -- Indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_tasks_calendar_id ON tasks(calendar_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_parent_uid ON tasks(parent_uid);
                CREATE INDEX IF NOT EXISTS idx_tasks_uid ON tasks(uid);
                CREATE INDEX IF NOT EXISTS idx_calendars_account_id ON calendars(account_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "make_task_account_calendar_nullable",
            sql: r#"
                -- Create new tasks table with nullable account_id and calendar_id
                CREATE TABLE tasks_new (
                    id TEXT PRIMARY KEY NOT NULL,
                    uid TEXT NOT NULL UNIQUE,
                    etag TEXT,
                    href TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    completed INTEGER NOT NULL DEFAULT 0,
                    completed_at TEXT,
                    tags TEXT,
                    category_id TEXT,
                    priority TEXT NOT NULL DEFAULT 'none',
                    start_date TEXT,
                    start_date_all_day INTEGER,
                    due_date TEXT,
                    due_date_all_day INTEGER,
                    created_at TEXT NOT NULL,
                    modified_at TEXT NOT NULL,
                    reminders TEXT,
                    subtasks TEXT NOT NULL DEFAULT '[]',
                    parent_uid TEXT,
                    is_collapsed INTEGER DEFAULT 0,
                    sort_order INTEGER NOT NULL,
                    account_id TEXT,
                    calendar_id TEXT,
                    synced INTEGER NOT NULL DEFAULT 0,
                    local_only INTEGER DEFAULT 0,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
                );

                -- Copy data from old table to new table
                INSERT INTO tasks_new SELECT * FROM tasks;

                -- Drop old table
                DROP TABLE tasks;

                -- Rename new table to tasks
                ALTER TABLE tasks_new RENAME TO tasks;

                -- Recreate indexes
                CREATE INDEX idx_tasks_calendar_id ON tasks(calendar_id);
                CREATE INDEX idx_tasks_account_id ON tasks(account_id);
                CREATE INDEX idx_tasks_parent_uid ON tasks(parent_uid);
                CREATE INDEX idx_tasks_uid ON tasks(uid);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_url_field_to_tasks",
            sql: r#"
                -- Add URL field for RFC 7986 support
                ALTER TABLE tasks ADD COLUMN url TEXT;
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            Builder::default()
                .add_migrations("sqlite:caldav-tasks.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![update_tray_sync_time])
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            
            let separator_item1 = PredefinedMenuItem::separator(app)?;
            
            let last_sync_item = MenuItem::with_id(app, "last_sync", "Last sync: Never", false, None::<&str>)?;
            let sync_item = MenuItem::with_id(app, "sync", "Sync Now", true, None::<&str>)?;
            
            // store a closure that can update this item
            // cloning is required to capture menuitem reference. oh well
            let item_clone = last_sync_item.clone();
            *MENU_UPDATER.lock().expect("Failed to lock MENU_UPDATER") = Some(Box::new(move |text: String| {
                let _ = item_clone.set_text(&text);
            }));
            
            let separator_item2 = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            // build the tray menu
            let menu = Menu::with_items(app, &[&show_item, &separator_item1, &last_sync_item, &sync_item, &separator_item2, &quit_item])?;
            // create tray icon
            let _tray = TrayIconBuilder::new()
                // unfortunately cloning is also required here due to the API ☹️
                // Image<'_> as opposed to &Image<'_>
                // ugh
                .icon(app.default_window_icon().expect("No default window icon found").clone())
                .menu(&menu)
                .tooltip("caldav-tasks")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            
                            // on macOS, restore the dock icon when showing the window
                            #[cfg(target_os = "macos")]
                            {
                                let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                            }
                        }
                    }
                    "sync" => {
                        // emit event to frontend to trigger sync
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("tray-sync", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|_tray, event| {
                    // on macOS, clicking the tray icon shows the menu (handled automatically)
                    // on other platforms, we could add custom behavior here if needed... hm
                    if let TrayIconEvent::Click { .. } = event {
                        // menu is shown automatically on click for macOS
                        // for other platforms, you could manually show the window here if desired
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // hide window instead of closing when X is clicked
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
                
                // on macOS, hide the dock icon when the window is hidden
                #[cfg(target_os = "macos")]
                {
                    let _ = window.app_handle().set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            // handle app reactivation (e.g., from Spotlight, Dock, Cmd+Tab)
            if let RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    
                    // restore the dock icon
                    #[cfg(target_os = "macos")]
                    {
                        let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);
                    }
                }
            }
        });
}
