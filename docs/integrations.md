# 🔌 Guia de Integração Multi-Linguagem — EdgeKit Storage

O **EdgeKit Storage** foi projetado para atuar como um microsserviço de upload e armazenamento de mídia agnóstico a linguagens. Se você já possui uma aplicação rodando em **Vercel, AWS, VPS, Fly.io ou Hetzner**, pode utilizá-lo sem instalar SDKs pesados.

---

## 📑 Índice
- [Visão Geral da API REST](#-visão-geral-da-api-rest)
- [1. TypeScript & Next.js (App Router / Server Actions)](#1-typescript--nextjs)
- [2. Python (FastAPI / Django / Flask)](#2-python-fastapi--django--flask)
- [3. PHP & Laravel](#3-php--laravel)
- [4. Go (Golang)](#4-go-golang)
- [5. C# (.NET 8+ / ASP.NET Core)](#5-c-net-8--aspnet-core)
- [6. Java (Spring Boot / Java 17+)](#6-java-spring-boot--java-17)
- [7. Rust (Axum / Actix-web)](#7-rust-axum--actix-web)
- [8. cURL & Linha de Comando](#8-curl--linha-de-comando)
- [🔒 Melhores Práticas com Arquivos Privados](#-melhores-práticas-com-arquivos-privados)

---

## 📡 Visão Geral da API REST

Todas as requisições autenticadas exigem o cabeçalho `X-API-Key` ou `Authorization: Bearer <key>`.

| Método | Rota | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `POST` | `/upload` | Envia um arquivo (`multipart/form-data`) | `X-API-Key` |
| `POST` | `/api/signed-url` | Gera URL temporária assinada com HMAC | `X-API-Key` |
| `GET` | `/api/files` | Lista arquivos com paginação por `cursor` | `X-API-Key` |
| `GET` | `/api/files/:key/meta` | Retorna metadados do arquivo (HEAD) | `X-API-Key` |
| `DELETE` | `/api/files/:key` | Exclui um arquivo do bucket | `X-API-Key` |
| `POST` | `/api/files/batch-delete` | Exclui múltiplos arquivos em lote | `X-API-Key` |
| `GET` | `/f/:key` | Acesso público direto ao arquivo | *Pública (CDN)* |
| `GET` | `/private/:key` | Acesso a arquivo privado | `X-API-Key` ou `?token=&expires=` |

---

## 1. TypeScript & Next.js

Utilize o snippet zero-dependências [`snippets/storage.ts`](../snippets/storage.ts). Copie-o para `lib/storage.ts`.

### Exemplo em Next.js (Server Action):
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
  if (!file) throw new Error('Nenhum arquivo enviado');

  const result = await storage.upload(file, {
    folder: 'usuarios/avatars',
    preserveName: true,
  });

  return { url: result.url, key: result.key };
}
```

---

## 2. Python (FastAPI / Django / Flask)

Utilize o snippet [`snippets/storage.py`](../snippets/storage.py). Copie-o para `app/services/storage.py`.

### Exemplo em FastAPI:
```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from app.services.storage import EdgeKitStorage
import os

app = FastAPI()
storage = EdgeKitStorage(
    base_url=os.getenv("EDGEKIT_STORAGE_URL", "https://storage.seudominio.com"),
    api_key=os.getenv("EDGEKIT_STORAGE_API_KEY", "")
)

@app.post("/upload-foto")
async def upload_foto(file: UploadFile = File(...)):
    content = await file.read()
    try:
        resultado = storage.upload(
            file=content,
            filename=file.filename,
            folder="produtos",
            preserve_name=True
        )
        return {"url": resultado["url"], "key": resultado["key"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download-recibo/{key:path}")
def get_recibo_privado(key: str):
    # Gera link temporário de 30 minutos para o usuário baixar
    signed = storage.get_signed_url(key, expires_in_seconds=1800)
    return {"downloadUrl": signed["url"]}
```

---

## 3. PHP & Laravel

Utilize o snippet [`snippets/Storage.php`](../snippets/Storage.php). Salve em `app/Services/EdgeKitStorage.php`.

### Exemplo em um Controller do Laravel:
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
            'documento' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('documento');

        // Envia o arquivo temporário do Laravel para o EdgeKit
        $resultado = $this->storage->upload($file->getRealPath(), [
            'folder' => 'documentos/' . auth()->id(),
            'preserveName' => true,
            'private' => true, // Salva protegido
        ]);

        return response()->json([
            'sucesso' => true,
            'key' => $resultado['key'],
        ]);
    }

    public function downloadLink(string $key)
    {
        // Retorna link temporário de 1h para o usuário final
        $signed = $this->storage->getSignedUrl($key, 3600);
        return response()->json(['url' => $signed['url']]);
    }
}
```

---

## 4. Go (Golang)

Utilize o snippet [`snippets/storage.go`](../snippets/storage.go). Copie para o seu pacote `pkg/storage`.

### Exemplo com HTTP nativo:
```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"meuapp/pkg/storage"
)

func main() {
	client := edgekit.NewClient(
		os.Getenv("EDGEKIT_STORAGE_URL"),
		os.Getenv("EDGEKIT_STORAGE_API_KEY"),
	)

	http.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		file, header, err := r.FormFile("arquivo")
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

---

## 5. C# (.NET 8+ / ASP.NET Core)

Utilize o snippet zero-dependências [`snippets/EdgeKitStorage.cs`](../snippets/EdgeKitStorage.cs). Salve em `Services/EdgeKitStorageClient.cs`.

### Exemplo em um Minimal API ou Controller do ASP.NET Core:
```csharp
using EdgeKit.Storage;

var builder = WebApplication.CreateBuilder(args);

// Registra o cliente EdgeKit no container de injeção de dependência
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
        Folder = "documentos",
        PreserveName = true
    });

    return Results.Ok(new { result.Url, result.Key });
});

app.MapGet("/recibo/{key}", async (string key, EdgeKitStorageClient storage) =>
{
    // Gera link temporário de 1 hora
    var signed = await storage.GetSignedUrlAsync(key, expiresInSeconds: 3600);
    return Results.Ok(new { downloadUrl = signed.Url });
});

app.Run();
```

---

## 6. Java (Spring Boot / Java 17+)

Utilize o snippet zero-dependências [`snippets/EdgeKitStorage.java`](../snippets/EdgeKitStorage.java). Salve em `src/main/java/edgekit/storage/EdgeKitStorage.java`.

### Exemplo em um Controller do Spring Boot:
```java
package com.exemplo.demo;

import edgekit.storage.EdgeKitStorage;
import edgekit.storage.EdgeKitStorage.UploadOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/arquivos")
public class ArquivoController {

    private final EdgeKitStorage storage;

    public ArquivoController(
            @Value("${edgekit.url}") String url,
            @Value("${edgekit.apiKey}") String apiKey) {
        this.storage = new EdgeKitStorage(url, apiKey);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("arquivo") MultipartFile file) throws Exception {
        String resultado = storage.upload(
                file.getBytes(),
                file.getOriginalFilename(),
                UploadOptions.builder().folder("anexos").preserveName(true)
        );
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/link-privado")
    public ResponseEntity<?> getLink(@RequestParam("key") String key) throws Exception {
        String signedJson = storage.getSignedUrl(key, 3600);
        return ResponseEntity.ok(signedJson);
    }
}
```

---

## 7. Rust (Axum / Actix-web)

Utilize o snippet [`snippets/storage.rs`](../snippets/storage.rs). Salve em `src/storage.rs`.

### Exemplo com Axum:
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
        "https://storage.seudominio.com",
        "sua-chave-secreta",
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

    Err("Nenhum arquivo enviado".to_string())
}
```

---

## 8. cURL & Linha de Comando

### 1. Upload de Arquivo:
```bash
curl -X POST "https://storage.seudominio.com/upload" \
  -H "X-API-Key: sua-chave-secreta" \
  -F "file=@./imagem.jpg" \
  -F "folder=galeria" \
  -F "preserveName=true"
```

### 2. Gerar Signed URL para Arquivo Privado:
```bash
curl -X POST "https://storage.seudominio.com/api/signed-url" \
  -H "X-API-Key: sua-chave-secreta" \
  -H "Content-Type: application/json" \
  -d '{"key": "private/faturas/123.pdf", "expiresInSeconds": 3600}'
```

### 3. Excluir Múltiplos Arquivos em Lote:
```bash
curl -X POST "https://storage.seudominio.com/api/files/batch-delete" \
  -H "X-API-Key: sua-chave-secreta" \
  -H "Content-Type: application/json" \
  -d '{"keys": ["galeria/foto1.png", "galeria/foto2.png"]}'
```

---

## 🔒 Melhores Práticas com Arquivos Privados

1. **Nunca envie sua `API_KEY` para o frontend/navegador do cliente.**
2. Para exibir imagens ou permitir download de contratos privados, seu backend deve chamar `getSignedUrl(key, 3600)` e entregar apenas a URL assinada resultante.
3. Se o token expirar ou for adulterado, o Cloudflare Worker rejeita instantaneamente a requisição com código `403 Forbidden`.
