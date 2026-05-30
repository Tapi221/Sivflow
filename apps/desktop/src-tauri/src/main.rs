use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use url::Url;

const DESKTOP_OAUTH_HOST: &str = "127.0.0.1";
const DESKTOP_OAUTH_PORT: u16 = 42813;
const DESKTOP_OAUTH_PATH: &str = "/";
const DESKTOP_GOOGLE_OAUTH_REDIRECT_URI: &str = "http://127.0.0.1:42813";
const GOOGLE_AUTH_EXCHANGE_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const MAX_DESKTOP_IMPORT_FILE_BYTES: u64 = 128 * 1024 * 1024;
const SUPPORTED_IMPORT_FILE_EXTENSIONS: [&str; 2] = ["mfdeck", "mfcard"];

#[derive(Default)]
struct AuthLoopbackState {
    pending_url: Mutex<Option<String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthCodeExchangeInput {
    client_id: String,
    code: String,
    code_verifier: String,
    redirect_uri: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreRefreshTokenInput {
    account_id: String,
    refresh_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthExchangeResult {
    access_token: Option<String>,
    id_token: Option<String>,
    scope: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DesktopOauthCallbackPayload {
    url: String,
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopImportFileReadResult {
    path: String,
    name: String,
    size: u64,
    data: Vec<u8>,
}

#[derive(Serialize, Clone)]
struct DesktopImportFileOpenPayload {
    paths: Vec<String>,
}

#[derive(Deserialize)]
struct GoogleTokenResponse {
    access_token: Option<String>,
    id_token: Option<String>,
    scope: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

fn can_open_external(raw_url: &str) -> bool {
    Url::parse(raw_url)
        .map(|url| matches!(url.scheme(), "http" | "https" | "mailto"))
        .unwrap_or(false)
}

fn normalize_desktop_import_file_path(raw_file_path: &str) -> Result<PathBuf, String> {
    let trimmed = raw_file_path.trim().trim_matches('"');

    if trimmed.is_empty() || trimmed.starts_with("--") {
        return Err("Unsupported import file path".to_string());
    }

    let path = if trimmed.starts_with("file://") {
        Url::parse(trimmed)
            .map_err(|_| "Unsupported import file URL".to_string())?
            .to_file_path()
            .map_err(|_| "Unsupported import file URL".to_string())?
    } else {
        PathBuf::from(trimmed)
    };

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "Unsupported import file extension".to_string())?;

    if !SUPPORTED_IMPORT_FILE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Unsupported import file extension".to_string());
    }

    let canonical = path
        .canonicalize()
        .map_err(|_| "Import file does not exist".to_string())?;
    let metadata = fs::metadata(&canonical).map_err(|_| "Import file does not exist".to_string())?;

    if !metadata.is_file() {
        return Err("Import path is not a file".to_string());
    }

    Ok(canonical)
}

fn collect_desktop_import_file_paths(values: Vec<String>) -> Vec<String> {
    let mut paths = Vec::new();

    for value in values {
        if let Ok(path) = normalize_desktop_import_file_path(&value) {
            let path_string = path.to_string_lossy().to_string();
            if !paths.contains(&path_string) {
                paths.push(path_string);
            }
        }
    }

    paths
}

fn parse_callback_payload(raw_url: &str) -> Result<DesktopOauthCallbackPayload, String> {
    let parsed = Url::parse(raw_url).map_err(|_| "Invalid callback URL".to_string())?;
    let code = parsed.query_pairs().find(|(key, _)| key == "code").map(|(_, value)| value.to_string());
    let state = parsed.query_pairs().find(|(key, _)| key == "state").map(|(_, value)| value.to_string());
    let error = parsed.query_pairs().find(|(key, _)| key == "error").map(|(_, value)| value.to_string());
    let error_description = parsed.query_pairs().find(|(key, _)| key == "error_description").map(|(_, value)| value.to_string());

    Ok(DesktopOauthCallbackPayload {
        url: raw_url.to_string(),
        code,
        state,
        error,
        error_description,
    })
}

fn handle_loopback_client(mut stream: TcpStream, app_handle: AppHandle) -> Result<(), String> {
    let mut buffer = [0; 2048];
    let size = stream.read(&mut buffer).map_err(|error| error.to_string())?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    let first_line = request.lines().next().ok_or_else(|| "Invalid OAuth callback request".to_string())?;
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or_default();

    if method != "GET" {
        let _ = stream.write_all(b"HTTP/1.1 405 Method Not Allowed\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 18\r\n\r\nMethod not allowed");
        return Ok(());
    }

    let raw_url = format!("{}{}", DESKTOP_GOOGLE_OAUTH_REDIRECT_URI, target);
    let request_url = Url::parse(&raw_url).map_err(|_| "Invalid OAuth callback URL".to_string())?;

    if request_url.path() != DESKTOP_OAUTH_PATH {
        let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 9\r\n\r\nNot found");
        return Ok(());
    }

    {
        let state = app_handle.state::<AuthLoopbackState>();
        let mut pending_url = state.pending_url.lock().map_err(|_| "OAuth state lock failed".to_string())?;
        *pending_url = Some(raw_url.clone());
    }

    let payload = parse_callback_payload(&raw_url)?;
    app_handle.emit("oauth:callback", payload).map_err(|error| error.to_string())?;

    let body = "<!doctype html><html><body><h1>ログイン完了。アプリに戻ってください。</h1></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
        body.as_bytes().len(),
        body,
    );
    stream.write_all(response.as_bytes()).map_err(|error| error.to_string())?;

    Ok(())
}

fn ensure_auth_loopback_redirect(authorize_url: &str) -> Result<(), String> {
    let parsed = Url::parse(authorize_url).map_err(|_| "Invalid authorize URL".to_string())?;
    let redirect_uri = parsed
        .query_pairs()
        .find(|(key, _)| key == "redirect_uri")
        .map(|(_, value)| value.to_string())
        .ok_or_else(|| "Auth redirect URI is missing".to_string())?;

    if redirect_uri != DESKTOP_GOOGLE_OAUTH_REDIRECT_URI {
        return Err(format!(
            "Auth redirect URI mismatch. expected={}, actual={}",
            DESKTOP_GOOGLE_OAUTH_REDIRECT_URI, redirect_uri,
        ));
    }

    Ok(())
}

fn credential_entry(account_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new("sivflow-google-oauth", account_id).map_err(|error| error.to_string())
}

async fn exchange_auth_code(input: AuthCodeExchangeInput) -> Result<AuthExchangeResult, String> {
    let request_body = HashMap::from([
        ("client_id".to_string(), input.client_id),
        ("code".to_string(), input.code),
        ("code_verifier".to_string(), input.code_verifier),
        ("grant_type".to_string(), "authorization_code".to_string()),
        ("redirect_uri".to_string(), input.redirect_uri),
    ]);

    let payload = Client::new()
        .post(GOOGLE_AUTH_EXCHANGE_ENDPOINT)
        .form(&request_body)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .json::<GoogleTokenResponse>()
        .await
        .map_err(|error| error.to_string())?;

    if let Some(error) = payload.error {
        return Err(payload.error_description.unwrap_or(error));
    }

    Ok(AuthExchangeResult {
        access_token: payload.access_token,
        id_token: payload.id_token,
        scope: payload.scope,
    })
}

#[tauri::command]
fn app_get_version(app_handle: AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[tauri::command]
fn shell_open_external(url: String) -> Result<(), String> {
    if !can_open_external(&url) {
        return Err("Blocked non-external URL".to_string());
    }

    webbrowser::open(&url).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn desktop_import_read_file(file_path: String) -> Result<DesktopImportFileReadResult, String> {
    let normalized_path = normalize_desktop_import_file_path(&file_path)?;
    let metadata = fs::metadata(&normalized_path).map_err(|error| error.to_string())?;

    if metadata.len() > MAX_DESKTOP_IMPORT_FILE_BYTES {
        return Err("Import file is too large".to_string());
    }

    let data = fs::read(&normalized_path).map_err(|error| error.to_string())?;
    let name = normalized_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Import file name is invalid".to_string())?
        .to_string();

    Ok(DesktopImportFileReadResult {
        path: normalized_path.to_string_lossy().to_string(),
        name,
        size: metadata.len(),
        data,
    })
}

#[tauri::command]
fn desktop_import_select_files() -> Vec<String> {
    let files = rfd::FileDialog::new()
        .set_title("MFDeck / MFCard を選択")
        .add_filter("Sivflow Files", &["mfdeck", "mfcard"])
        .add_filter("MFDeck", &["mfdeck"])
        .add_filter("MFCard", &["mfcard"])
        .pick_files()
        .unwrap_or_default();

    collect_desktop_import_file_paths(
        files
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect(),
    )
}

#[tauri::command]
fn oauth_start(authorize_url: String, app_handle: AppHandle) -> Result<(), String> {
    ensure_auth_loopback_redirect(&authorize_url)?;
    let listener = TcpListener::bind((DESKTOP_OAUTH_HOST, DESKTOP_OAUTH_PORT)).map_err(|error| error.to_string())?;
    let app_handle_for_thread = app_handle.clone();

    std::thread::spawn(move || {
        if let Ok((stream, _)) = listener.accept() {
            let _ = handle_loopback_client(stream, app_handle_for_thread);
        }
    });

    shell_open_external(authorize_url)
}

#[tauri::command]
fn oauth_cancel(state: State<AuthLoopbackState>) -> Result<(), String> {
    let mut pending_url = state.pending_url.lock().map_err(|_| "OAuth state lock failed".to_string())?;
    *pending_url = None;
    Ok(())
}

#[tauri::command]
async fn oauth_exchange_id_token(input: AuthCodeExchangeInput) -> Result<String, String> {
    let payload = exchange_auth_code(input).await?;
    payload.id_token.ok_or_else(|| "Google auth exchange did not return id credential".to_string())
}

#[tauri::command]
fn oauth_store_refresh_token(input: StoreRefreshTokenInput) -> Result<(), String> {
    credential_entry(&input.account_id)?.set_password(&input.refresh_token).map_err(|error| error.to_string())
}

#[tauri::command]
fn oauth_read_refresh_token(account_id: String) -> Result<Option<String>, String> {
    match credential_entry(&account_id)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn oauth_delete_refresh_token(account_id: String) -> Result<(), String> {
    match credential_entry(&account_id)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn window_minimize(app_handle: AppHandle) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window is not available".to_string())?;
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_maximize_toggle(app_handle: AppHandle) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window is not available".to_string())?;

    if window.is_maximized().map_err(|error| error.to_string())? {
        window.unmaximize().map_err(|error| error.to_string())?;
        window.emit("window:maximizedState", false).map_err(|error| error.to_string())?;
    } else {
        window.maximize().map_err(|error| error.to_string())?;
        window.emit("window:maximizedState", true).map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn window_close(app_handle: AppHandle) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window is not available".to_string())?;
    window.close().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_is_maximized(app_handle: AppHandle) -> Result<bool, String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window is not available".to_string())?;
    window.is_maximized().map_err(|error| error.to_string())
}

fn emit_desktop_import_files(app_handle: &AppHandle, values: Vec<String>) {
    let paths = collect_desktop_import_file_paths(values);

    if paths.is_empty() {
        return;
    }

    let _ = app_handle.emit("desktop:importFile:open", DesktopImportFileOpenPayload { paths });
}

fn main() {
    tauri::Builder::default()
        .manage(AuthLoopbackState::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            emit_desktop_import_files(&app_handle, std::env::args().collect());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_get_version,
            shell_open_external,
            desktop_import_read_file,
            desktop_import_select_files,
            oauth_start,
            oauth_cancel,
            oauth_exchange_id_token,
            oauth_store_refresh_token,
            oauth_read_refresh_token,
            oauth_delete_refresh_token,
            window_minimize,
            window_maximize_toggle,
            window_close,
            window_is_maximized,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
