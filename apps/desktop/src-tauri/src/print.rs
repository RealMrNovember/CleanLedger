use std::io::Write;
use std::time::Duration;

fn default_device_candidates() -> Vec<String> {
    #[cfg(target_os = "linux")]
    {
        return vec![
            "/dev/usb/lp0".into(),
            "/dev/usb/lp1".into(),
            "/dev/lp0".into(),
            "/dev/lp1".into(),
        ];
    }
    #[cfg(target_os = "macos")]
    {
        return vec![
            "/dev/cu.usbserial".into(),
            "/dev/cu.usbmodem".into(),
        ];
    }
    #[cfg(target_os = "windows")]
    {
        return vec!["COM1".into(), "COM3".into(), "COM4".into()];
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        vec![]
    }
}

fn write_via_serial(path: &str, data: &[u8]) -> Result<(), String> {
    let mut port = serialport::new(path, 9600)
        .timeout(Duration::from_secs(3))
        .open()
        .map_err(|e| format!("{path}: {e}"))?;
    port.write_all(data).map_err(|e| e.to_string())?;
    port.flush().map_err(|e| e.to_string())?;
    Ok(())
}

fn write_via_device_file(path: &str, data: &[u8]) -> Result<(), String> {
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .open(path)
        .map_err(|e| format!("{path}: {e}"))?;
    file.write_all(data).map_err(|e| e.to_string())?;
    file.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn print_escpos(data: Vec<u8>, port: Option<String>) -> Result<String, String> {
    if data.is_empty() {
        return Err("Bos yazdirma verisi.".into());
    }

    let mut candidates: Vec<String> = port
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .into_iter()
        .collect();
    if candidates.is_empty() {
        candidates = default_device_candidates();
    }

    let mut errors: Vec<String> = Vec::new();
    for path in candidates {
        if path.starts_with("/dev/") {
            if let Err(err) = write_via_device_file(&path, &data) {
                errors.push(err);
                continue;
            }
            return Ok(path);
        }
        if let Err(err) = write_via_serial(&path, &data) {
            errors.push(err);
            continue;
        }
        return Ok(path);
    }

    Err(if errors.is_empty() {
        "Termal yazici bulunamadi. Ayarlardan port yolunu girin.".into()
    } else {
        errors.join(" | ")
    })
}
