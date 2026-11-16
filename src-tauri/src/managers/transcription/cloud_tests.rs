use super::TranscriptionManager;
use crate::settings::CloudTranscribeProvider;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use std::time::{Duration, Instant};

fn provider(url: String) -> CloudTranscribeProvider {
    CloudTranscribeProvider {
        id: "test".into(),
        label: "Test".into(),
        base_url: url,
        api_key: "synthetic-cloud-key".into(),
        model: "test-whisper".into(),
        enabled: true,
    }
}

fn serve(replies: Vec<(u16, &'static str, &'static str)>) -> (String, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    listener.set_nonblocking(true).unwrap();
    let worker = thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(15);
        for (status, content_type, body) in replies {
            let mut socket = loop {
                match listener.accept() {
                    Ok((socket, _)) => break socket,
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(Instant::now() < deadline, "Cloud test server timed out");
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(_) => panic!("Cloud test server failed to accept"),
                }
            };
            socket
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            socket
                .set_write_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut request = Vec::new();
            let mut buffer = [0u8; 4096];
            loop {
                let count = socket.read(&mut buffer).unwrap();
                assert!(count > 0, "Cloud request was incomplete");
                request.extend_from_slice(&buffer[..count]);
                assert!(
                    request.len() < 100_000,
                    "Cloud request exceeded fixture limit"
                );
                if let Some(end) = request.windows(4).position(|v| v == b"\r\n\r\n") {
                    let header = String::from_utf8_lossy(&request[..end]).to_lowercase();
                    let length: usize = header
                        .lines()
                        .find_map(|line| {
                            line.strip_prefix("content-length:")
                                .map(|s| s.trim().parse().unwrap())
                        })
                        .unwrap();
                    if request.len() >= end + 4 + length {
                        assert!(header.starts_with("post /v1/audio/transcriptions "));
                        assert!(header.contains("authorization: bearer synthetic-cloud-key"));
                        assert!(header.contains("multipart/form-data"));
                        let payload = String::from_utf8_lossy(&request[end + 4..]);
                        assert!(payload.contains("test-whisper"));
                        assert!(payload.contains("name=\"language\""));
                        break;
                    }
                }
            }
            write!(socket, "HTTP/1.1 {status} Test\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
        }
    });
    (url, worker)
}

#[test]
fn cloud_http_retries_server_errors_and_sends_wav() {
    let (url, worker) = serve(vec![
        (500, "application/json", "synthetic-cloud-key"),
        (200, "application/json", r#"{"text":"hello"}"#),
    ]);
    let wav = TranscriptionManager::samples_to_wav_bytes(&[0.0; 160]).unwrap();
    assert!(wav.starts_with(b"RIFF"));
    let text =
        TranscriptionManager::transcribe_single_provider(&provider(url), Some("en"), &wav, 3, 2)
            .unwrap();
    assert_eq!(text, "hello");
    worker.join().unwrap();
}

#[test]
fn cloud_http_does_not_retry_auth_or_expose_response_body() {
    let (url, worker) = serve(vec![(401, "application/json", "synthetic-cloud-key")]);
    let error =
        TranscriptionManager::transcribe_single_provider(&provider(url), Some("en"), b"wav", 3, 3)
            .unwrap_err();
    let safe = !error.to_string().contains("synthetic-cloud-key");
    assert!(safe, "Cloud error leaked response content");
    worker.join().unwrap();
}

#[test]
fn cloud_http_rejects_json_without_transcription() {
    let (url, worker) = serve(vec![(200, "application/json", r#"{"error":"bad"}"#)]);
    assert!(TranscriptionManager::transcribe_single_provider(
        &provider(url),
        Some("en"),
        b"wav",
        3,
        1
    )
    .is_err());
    worker.join().unwrap();
}

#[test]
fn cloud_http_accepts_plain_text_response() {
    let (url, worker) = serve(vec![(200, "text/plain", "hello")]);
    let text =
        TranscriptionManager::transcribe_single_provider(&provider(url), Some("en"), b"wav", 3, 1)
            .unwrap();
    assert_eq!(text, "hello");
    worker.join().unwrap();
}
