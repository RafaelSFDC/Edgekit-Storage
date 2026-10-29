//! EdgeKit Storage Client for Rust (Copy-Paste Snippet)
//! 
//! Copie este módulo para o seu projeto (ex: `src/storage.rs`).
//! Requer no seu `Cargo.toml`:
//! ```toml
//! [dependencies]
//! reqwest = { version = "0.12", features = ["multipart", "json"] }
//! serde = { version = "1.0", features = ["derive"] }
//! serde_json = "1.0"
//! tokio = { version = "1", features = ["full"] }
//! ```

use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Clone, Debug)]
pub struct EdgeKitStorage {
    base_url: String,
    api_key: String,
    client: reqwest::Client,
}

#[derive(Default, Debug)]
pub struct UploadOptions {
    pub folder: Option<String>,
    pub preserve_name: bool,
    pub custom_name: Option<String>,
    pub is_private: bool,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct StorageFile {
    pub key: String,
    pub url: String,
    pub size: u64,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    #[serde(rename = "originalName")]
    pub original_name: Option<String>,
    #[serde(rename = "isPrivate")]
    pub is_private: bool,
    #[serde(rename = "uploadedAt")]
    pub uploaded_at: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct SignedUrlResult {
    pub url: String,
    pub key: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
    #[serde(rename = "expiresInSeconds")]
    pub expires_in_seconds: u32,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ListResult {
    pub objects: Vec<StorageFile>,
    pub truncated: bool,
    pub cursor: Option<String>,
}

#[derive(Deserialize, Debug)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<ApiError>,
}

#[derive(Deserialize, Debug)]
struct ApiError {
    message: String,
}

impl EdgeKitStorage {
    pub fn new(base_url: &str, api_key: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.trim().to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// Envia bytes para o Cloudflare R2 via EdgeKit Storage.
    pub async fn upload(
        &self,
        filename: &str,
        bytes: Vec<u8>,
        options: UploadOptions,
    ) -> Result<StorageFile, Box<dyn Error + Send + Sync>> {
        let file_part = Part::bytes(bytes).file_name(filename.to_string());
        let mut form = Form::new().part("file", file_part);

        if let Some(folder) = options.folder {
            form = form.text("folder", folder);
        }
        if options.preserve_name {
            form = form.text("preserveName", "true");
        }
        if let Some(custom_name) = options.custom_name {
            form = form.text("customName", custom_name);
        }
        if options.is_private {
            form = form.text("private", "true");
        }

        let res = self
            .client
            .post(format!("{}/upload", self.base_url))
            .header("X-API-Key", &self.api_key)
            .multipart(form)
            .send()
            .await?;

        let api_res: ApiResponse<StorageFile> = res.json().await?;
        if !api_res.success {
            let msg = api_res
                .error
                .map(|e| e.message)
                .unwrap_or_else(|| "Upload failed".to_string());
            return Err(msg.into());
        }

        api_res.data.ok_or_else(|| "Missing response data".into())
    }

    /// Gera uma URL temporária assinada com HMAC para download seguro de arquivo privado.
    pub async fn get_signed_url(
        &self,
        key: &str,
        expires_in_seconds: u32,
    ) -> Result<SignedUrlResult, Box<dyn Error + Send + Sync>> {
        let payload = serde_json::json!({
            "key": key,
            "expiresInSeconds": expires_in_seconds
        });

        let res = self
            .client
            .post(format!("{}/api/signed-url", self.base_url))
            .header("X-API-Key", &self.api_key)
            .json(&payload)
            .send()
            .await?;

        let api_res: ApiResponse<SignedUrlResult> = res.json().await?;
        if !api_res.success {
            return Err("Failed generating signed URL".into());
        }

        api_res.data.ok_or_else(|| "Missing response data".into())
    }

    /// Exclui um único arquivo do bucket R2.
    pub async fn delete(&self, key: &str) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let clean_key = key.trim_start_matches('/');
        let res = self
            .client
            .delete(format!("{}/api/files/{}", self.base_url, clean_key))
            .header("X-API-Key", &self.api_key)
            .send()
            .await?;

        Ok(res.status().is_success())
    }

    /// Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote).
    pub async fn delete_many(&self, keys: &[&str]) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let payload = serde_json::json!({ "keys": keys });
        let res = self
            .client
            .post(format!("{}/api/files/batch-delete", self.base_url))
            .header("X-API-Key", &self.api_key)
            .json(&payload)
            .send()
            .await?;

        Ok(res.status().is_success())
    }

    /// Lista arquivos no bucket R2 com paginação.
    pub async fn list(
        &self,
        limit: Option<u32>,
        cursor: Option<&str>,
        prefix: Option<&str>,
    ) -> Result<ListResult, Box<dyn Error + Send + Sync>> {
        let mut query = Vec::new();
        if let Some(l) = limit {
            query.push(format!("limit={l}"));
        }
        if let Some(c) = cursor {
            query.push(format!("cursor={c}"));
        }
        if let Some(p) = prefix {
            query.push(format!("prefix={p}"));
        }

        let query_str = if query.is_empty() {
            String::new()
        } else {
            format!("?{}", query.join("&"))
        };

        let res = self
            .client
            .get(format!("{}/api/files{}", self.base_url, query_str))
            .header("X-API-Key", &self.api_key)
            .send()
            .await?;

        let api_res: ApiResponse<ListResult> = res.json().await?;
        api_res.data.ok_or_else(|| "Missing list response data".into())
    }
}
