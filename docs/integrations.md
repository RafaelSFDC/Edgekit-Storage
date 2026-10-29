# 🔌 Multi-Language Integration Guide — EdgeKit Storage

<p align="left">
  <b>🇺🇸 English</b> •
  <a href="integrations.pt-BR.md">🇧🇷 Português (Brasil)</a>
</p>

**EdgeKit Storage** is designed to act as a language-agnostic upload and media storage microservice. If you already have an application running on **Vercel, AWS, VPS, Fly.io, or Hetzner**, you can integrate with it without installing heavy third-party SDKs.

---

## 📑 Table of Contents
- [REST API Overview](#-rest-api-overview)
- [1. TypeScript & Next.js (App Router / Server Actions)](#1-typescript--nextjs)
- [2. Python (FastAPI / Django / Flask)](#2-python-fastapi--django--flask)
- [3. PHP & Laravel](#3-php--laravel)
- [4. Go (Golang)](#4-go-golang)
- [5. C# (.NET 8+ / ASP.NET Core)](#5-c-net-8--aspnet-core)
- [6. Java (Spring Boot / Java 17+)](#6-java-spring-boot--java-17)
- [7. Rust (Axum / Actix-web)](#7-rust-axum--actix-web)
- [8. cURL & Command Line](#8-curl--command-line)
- [🔒 Private Files Best Practices](#-private-files-best-practices)

---

## 📡 REST API Overview

All authenticated requests require the `X-API-Key` or `Authorization: Bearer <key>` header.

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Upload a file (`multipart/form-data`) | `X-API-Key` |
| `POST` | `/api/signed-url` | Generate temporary HMAC signed URL | `X-API-Key` |
| `GET` | `/api/files` | List files with `cursor` pagination | `X-API-Key` |
| `GET` | `/api/files/:key/meta` | Get file metadata (HEAD) | `X-API-Key` |
| `DELETE` | `/api/files/:key` | Delete a single file | `X-API-Key` |
| `POST` | `/api/files/batch-delete` | Delete multiple files in batch | `X-API-Key` |
| `GET` | `/f/:key` | Public direct file delivery | *Public (CDN)* |
| `GET` | `/private/:key` | Access private file | `X-API-Key` or `?token=&expires=` |

---

## 1. TypeScript & Next.js

Use the zero-dependency snippet [`snippets/storage.ts`](../snippets/storage.ts). Copy it to `lib/storage.ts`.

### Next.js Example (Server Action):
```typescript
// app/actions/upload.ts
'use server';

import { createStorageClient } from '@/lib/storage';

const storage = createStorageClient({
  baseUrl: process.env.EDGEKIT_STORAGE_URL!,
  apiKey: process.env.EDGEKIT_STORAGE_API_KEY!,
});

export async function handleAvatarUpload(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const result = await storage.upload(file, {
    folder: 'users/avatars',
    preserveName: true,
  });

  return { url: result.url, key: result.key };
}
```

---

## 2. Python (FastAPI / Django / Flask)

Use the snippet [`snippets/storage.py`](../snippets/storage.py). Copy it to `app/services/storage.py`.

### FastAPI Example:
```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from app.services.storage import EdgeKitStorage
import os

app = FastAPI()
storage = EdgeKitStorage(
    base_url=os.getenv("EDGEKIT_STORAGE_URL", "https://storage.yourdomain.com"),
    api_key=os.getenv("EDGEKIT_STORAGE_API_KEY", "")
)

@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    content = await file.read()
    try:
        result = storage.upload(
            file=content,
            filename=file.filename,
            folder="products",
            preserve_name=True
        )
        return {"url": result["url"], "key": result["key"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download-receipt/{key:path}")
def get_private_receipt(key: str):
    # Generate 30-minute temporary signed link
    signed = storage.get_signed_url(key, expires_in_seconds=1800)
    return {"downloadUrl": signed["url"]}
```

---

## 3. PHP & Laravel

Use the snippet [`snippets/Storage.php`](../snippets/Storage.php). Save to `app/Services/EdgeKitStorage.php`.

### Laravel Controller Example:
```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\EdgeKitStorage;

class MediaController extends Controller
{
    private EdgeKitStorage $storage;

    public function __construct()
    {
        $this->storage = new EdgeKitStorage(
            config('services.edgekit.url'),
            config('services.edgekit.key')
        );
    }

    public function upload(Request $request)
    {
        $request->validate([
            'document' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('document');

        // Upload temporary file to EdgeKit Storage
        $result = $this->storage->upload($file->getRealPath(), [
            'folder' => 'documents/' . auth()->id(),
            'preserveName' => true,
            'private' => true, // Protected file
        ]);

        return response()->json([
            'success' => true,
            'key' => $result['key'],
        ]);
    }

    public function downloadLink(string $key)
    {
        // Return 1-hour temporary signed link for client
        $signed = $this->storage->getSignedUrl($key, 3600);
        return response()->json(['url' => $signed['url']]);
    }
}
```

---

## 4. Go (Golang)

Use the snippet [`snippets/storage.go`](../snippets/storage.go). Copy to your package `pkg/storage`.

### Standard HTTP Example:
```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"myapp/pkg/storage"
)

func main() {
	client := edgekit.NewClient(
		os.Getenv("EDGEKIT_STORAGE_URL"),
		os.Getenv("EDGEKIT_STORAGE_API_KEY"),
	)

	http.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		res, err := client.Upload(context.Background(), header.Filename, file, &edgekit.UploadOptions{
			Folder:       "backups",
			PreserveName: true,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"url":"%s","key":"%s"}`, res.URL, res.Key)
	})

	http.ListenAndServe(":8080", nil)
}
```

---

## 5. C# (.NET 8+ / ASP.NET Core)

Use the zero-dependency snippet [`snippets/EdgeKitStorage.cs`](../snippets/EdgeKitStorage.cs). Save to `Services/EdgeKitStorageClient.cs`.

### ASP.NET Core Minimal API Example:
```csharp
using EdgeKit.Storage;

var builder = WebApplication.CreateBuilder(args);

// Register EdgeKit storage client in DI container
builder.Services.AddSingleton(new EdgeKitStorageClient(
    baseUrl: builder.Configuration["EdgeKit:Url"]!,
    apiKey: builder.Configuration["EdgeKit:ApiKey"]!
));

var app = builder.Build();

app.MapPost("/upload", async (IFormFile file, EdgeKitStorageClient storage) =>
{
    await using var stream = file.OpenReadStream();
    var result = await storage.UploadAsync(stream, file.FileName, new UploadOptions
    {
        Folder = "documents",
        PreserveName = true
    });

    return Results.Ok(new { result.Url, result.Key });
});

app.MapGet("/receipt/{key}", async (string key, EdgeKitStorageClient storage) =>
{
    // Generate 1-hour temporary signed link
    var signed = await storage.GetSignedUrlAsync(key, expiresInSeconds: 3600);
    return Results.Ok(new { downloadUrl = signed.Url });
});

app.Run();
```

---

## 6. Java (Spring Boot / Java 17+)

Use the zero-dependency snippet [`snippets/EdgeKitStorage.java`](../snippets/EdgeKitStorage.java). Save to `src/main/java/edgekit/storage/EdgeKitStorage.java`.

### Spring Boot Controller Example:
```java
package com.example.demo;

import edgekit.storage.EdgeKitStorage;
import edgekit.storage.EdgeKitStorage.UploadOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final EdgeKitStorage storage;

    public FileController(
            @Value("${edgekit.url}") String url,
            @Value("${edgekit.apiKey}") String apiKey) {
        this.storage = new EdgeKitStorage(url, apiKey);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws Exception {
        String result = storage.upload(
                file.getBytes(),
                file.getOriginalFilename(),
                UploadOptions.builder().folder("attachments").preserveName(true)
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/private-link")
    public ResponseEntity<?> getLink(@RequestParam("key") String key) throws Exception {
        String signedJson = storage.getSignedUrl(key, 3600);
        return ResponseEntity.ok(signedJson);
    }
}
```

---

## 7. Rust (Axum / Actix-web)

Use the snippet [`snippets/storage.rs`](../snippets/storage.rs). Save to `src/storage.rs`.

### Axum Example:
```rust
use axum::{
    extract::{Multipart, State},
    response::Json,
    routing::post,
    Router,
};
use std::sync::Arc;

mod storage;
use storage::{EdgeKitStorage, UploadOptions};

#[tokio::main]
async fn main() {
    let client = Arc::new(EdgeKitStorage::new(
        "https://storage.yourdomain.com",
        "your-secret-api-key",
    ));

    let app = Router::new()
        .route("/upload", post(upload_handler))
        .with_state(client);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn upload_handler(
    State(storage): State<Arc<EdgeKitStorage>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, String> {
    while let Some(field) = multipart.next_field().await.map_err(|e| e.to_string())? {
        let name = field.file_name().unwrap_or("file.bin").to_string();
        let data = field.bytes().await.map_err(|e| e.to_string())?;

        let res = storage
            .upload(
                &name,
                data.to_vec(),
                UploadOptions {
                    folder: Some("uploads".to_string()),
                    preserve_name: true,
                    ..Default::default()
                },
            )
            .await
            .map_err(|e| e.to_string())?;

        return Ok(Json(serde_json::json!({ "url": res.url, "key": res.key })));
    }

    Err("No file uploaded".to_string())
}
```

---

## 8. cURL & Command Line

### 1. Upload File:
```bash
curl -X POST "https://storage.yourdomain.com/upload" \
  -H "X-API-Key: your-secret-api-key" \
  -F "file=@./image.jpg" \
  -F "folder=gallery" \
  -F "preserveName=true"
```

### 2. Generate Signed URL for Private File:
```bash
curl -X POST "https://storage.yourdomain.com/api/signed-url" \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"key": "private/invoices/123.pdf", "expiresInSeconds": 3600}'
```

### 3. Batch Delete Multiple Files:
```bash
curl -X POST "https://storage.yourdomain.com/api/files/batch-delete" \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"keys": ["gallery/photo1.png", "gallery/photo2.png"]}'
```

---

## 🔒 Private Files Best Practices

1. **Never expose your `API_KEY` to client-side browsers or frontends.**
2. To display private files or permit downloads, have your backend call `getSignedUrl(key, 3600)` and hand only the temporary URL to the user.
3. If the signature token expires or is modified, Cloudflare Worker instantly rejects the request with `403 Forbidden`.
