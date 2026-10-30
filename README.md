# EdgeKit Storage (Cloudflare Workers + R2)

<p align="left">
  <b>🇺🇸 English</b> •
  <a href="README.pt-BR.md">🇧🇷 Português (Brasil)</a>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Egress](https://img.shields.io/badge/Bandwidth-Zero%20Egress%20Fee-emerald)](#)

An **open-source, serverless, and self-hosted alternative to Uploadthing and AWS S3**, built with **Hono** on **Cloudflare Workers** integrated with **Cloudflare R2**.

Designed with a dual purpose:
1. **Full-Featured Visual Dashboard** to manage your files in the cloud with dark mode, instant search, and drag-and-drop uploads.
2. **High-Performance External Microservice / API** for any existing application (whether in **Vercel, VPS, AWS, Next.js, Node, Laravel, Go, or Python**), featuring a zero-dependency shadcn-style TypeScript client.

---

## 🚀 Highlights

- ⚡ **1-Click Deploy**: Official Cloudflare Workers Deploy button or interactive setup via `pnpm run setup`.
- 💰 **Zero Egress Fees**: Cloudflare R2 does not charge egress transfer fees (free download bandwidth).
- 🔐 **HMAC-SHA256 Signed URLs**: Deliver temporary access links for private files (`storage.getSignedUrl(key, { expiresInSeconds })`) without exposing your master API Key.
- 🗑️ **Batch Delete**: Remove dozens or hundreds of files at once via the API or through multi-selection in the dashboard.
- 📄 **Cursor-Based Pagination**: Navigate thousands of files seamlessly with R2's native cursor and "Load More" functionality.
- 🌐 **Flexible CORS for External Apps**: Configure `ALLOWED_ORIGINS` to allow secure direct uploads from your frontend apps on Vercel or VPS.
- 🖥️ **Integrated Web Dashboard**: Built with **React 19 + Tailwind CSS**, served directly from the edge on the root route `/` with file previews, metrics, and ready-to-use snippets.
- 📦 **shadcn-Style Client Snippet (Zero NPM Dependencies)**: Copy [`snippets/storage.ts`](snippets/storage.ts) into your project (`lib/storage.ts`) and use TypeScript with native Fetch without installing third-party libraries.

---

## 🖥️ Integrated Web Dashboard

The project includes a modern web dashboard built with **React 19, Tailwind CSS, and Lucide Icons**, compiled and served automatically from Cloudflare Workers edge via **Static Assets**:

- 🔑 **Secure API Key Setup**: Intuitive modal with real-time connection verification and HttpOnly cookie session support.
- ☁️ **Drag & Drop Area**: Upload multiple files with live preview, per-file progress tracking, custom folder prefix, name preservation, and private file flags.
- 🖼️ **Interactive Gallery**: Grid or Table view mode, live search, folder filter, and MIME-type filter.
- 📋 **Preview & Snippet Modal**: Inspect file dimensions and metadata, copy direct URLs, generate signed URLs, or copy integration snippets in **HTML (`<img>`)**, **Markdown**, or **Next.js (`<Image />`)**.

---

## 📐 Architecture Overview

```
[Your External Backend / App]
          │
          ▼ (POST /upload with API Key)
[Hono Worker on Cloudflare]
          │
          ▼ (Stores object in R2)
[Cloudflare R2 Bucket]
          │
          ▼ (Returns direct URL: https://media.yourdomain.com/2026/10/hash.png)
[Your External Backend / App]
          │
          ▼
[Browsers / End Users] ──(Direct Access to R2 / CDN)──► [Cloudflare R2]
                         (Zero Worker invocation costs!)
```

---

## 🛠️ Prerequisites

- **Node.js** >= 18
- **pnpm** (or npm)
- A **Cloudflare** account with R2 enabled (free tier includes 10 GB of storage).

---

## ⚡ Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RafaelSFDC/Edgekit-Storage.git
   cd Edgekit-Storage
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure local environment variables:**
   Create `.dev.vars` (or run `pnpm setup`):
   ```ini
   API_KEY=my-secret-test-api-key
   PUBLIC_URL=http://localhost:8787/f
   ALLOWED_MIME_TYPES=image/*,application/pdf
   MAX_FILE_SIZE_MB=25
   ```

4. **Start the local dev server:**
   ```bash
   pnpm dev
   ```
   Wrangler will launch a local development server with an R2 emulator at `http://localhost:8787`.

5. **Run automated end-to-end tests:**
   ```bash
   pnpm test
   ```

---

## 🌐 Deploying to Cloudflare

### 1. Authenticate with Cloudflare CLI
```bash
pnpm wrangler login
```

### 2. Create the R2 Bucket
```bash
pnpm wrangler r2 bucket create cloudflare-storage-bucket
```

### 3. Set the Secret API Key
Define your secret API Key on Cloudflare servers:
```bash
pnpm wrangler secret put API_KEY
```
*(Enter your secure key when prompted)*

### 4. (Recommended) Configure Public Domain on R2
To serve public files directly without Worker invocations:
1. Go to **Cloudflare Dashboard** > **R2** > select `cloudflare-storage-bucket`.
2. Open the **Settings** tab > **Public Access**.
3. Choose either:
   - **Custom Domains**: Connect your custom domain/subdomain (e.g. `media.yourdomain.com`).
   - Or enable **R2.dev subdomain** (managed public URL, e.g. `https://pub-xxxxxx.r2.dev`).
4. Update `PUBLIC_URL` in `wrangler.jsonc` (or run `pnpm wrangler secret put PUBLIC_URL`):
   ```jsonc
   "vars": {
     "PUBLIC_URL": "https://media.yourdomain.com"
   }
   ```

### 5. Deploy to Production
```bash
pnpm deploy
```
Your serverless storage backend will be live in seconds! 🚀

---

## 📖 API Reference

### 1. Upload File
Uploads a file to R2 and returns its public or private URL.

- **Method**: `POST`
- **Route**: `/upload`
- **Headers**:
  - `X-API-Key: <your-api-key>` or `Authorization: Bearer <your-api-key>`
  - `Content-Type: multipart/form-data`
- **Form Data Fields (`multipart/form-data`)**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `file` (or `image`) | File | **Yes** | The binary file to upload |
  | `folder` | String | No | Target subfolder/prefix (e.g. `avatars`, `posts`) |
  | `preserveName` | Boolean | No | If `true`, preserves the original filename as suffix (`hash_filename.png`) |
  | `customName` | String | No | Exact manual key/name path |
  | `private` | Boolean | No | If `true`, marks file as private (accessible only with API Key or Signed URL) |

#### Example Success Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "key": "avatars/2026/10/a8Z9xQ2L_profile.webp",
    "url": "https://media.yourdomain.com/avatars/2026/10/a8Z9xQ2L_profile.webp",
    "size": 65420,
    "mimeType": "image/webp",
    "originalName": "profile.webp",
    "isPrivate": false,
    "uploadedAt": "2026-10-29T09:15:00.000Z"
  }
}
```

---

### 2. List Files
Lists files stored in the R2 bucket with cursor-based pagination.

- **Method**: `GET`
- **Route**: `/api/files`
- **Headers**: `X-API-Key: <your-api-key>`
- **Query Parameters**:
  - `limit`: Maximum items per page (default: 20, max: 100)
  - `cursor`: Pagination token for the next page
  - `prefix`: Filter by folder or prefix (e.g. `avatars/`)

#### Example Response:
```json
{
  "success": true,
  "data": {
    "objects": [
      {
        "key": "avatars/2026/10/a8Z9xQ2L_profile.webp",
        "size": 65420,
        "uploadedAt": "2026-10-29T09:15:00.000Z",
        "mimeType": "image/webp",
        "url": "https://media.yourdomain.com/avatars/2026/10/a8Z9xQ2L_profile.webp",
        "isPrivate": false
      }
    ],
    "truncated": false,
    "cursor": null
  }
}
```

---

### 3. Get File Metadata
- **Method**: `GET`
- **Route**: `/api/files/:key+/meta`
- **Headers**: `X-API-Key: <your-api-key>`

---

### 4. Delete File
Deletes a file from the R2 bucket.

- **Method**: `DELETE`
- **Route**: `/api/files/:key+`
- **Headers**: `X-API-Key: <your-api-key>`

#### Example Response:
```json
{
  "success": true,
  "data": {
    "message": "File deleted successfully",
    "key": "avatars/2026/10/a8Z9xQ2L_profile.webp"
  }
}
```

---

### 5. Private Files & Signed URLs
If you upload with `private=true`, the file is protected and cannot be accessed publicly.

Two secure access methods:
1. **Via Signed URL (Recommended for End Users)**:
   - Generate a temporary signed link via `POST /api/signed-url` (HMAC token + expiration).
   - Format: `https://your-api.com/private/file.pdf?token=...&expires=1740000000` (can be opened in any browser without leaking your master API Key).
2. **Via API Key (For Backend-to-Backend Access)**:
   - Request `GET /private/:key+` directly with `X-API-Key: <your-key>` header.

---

### 6. Generate Signed URL
Generates a temporary HMAC-SHA256 signed URL for a private file.

- **Method**: `POST`
- **Route**: `/api/signed-url`
- **Headers**: `X-API-Key: <your-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "key": "private/invoices/2026/receipt.pdf",
    "expiresInSeconds": 3600
  }
  ```

---

### 7. Batch Delete
Deletes multiple files in a single request.

- **Method**: `POST`
- **Route**: `/api/files/batch-delete`
- **Headers**: `X-API-Key: <your-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "keys": [
      "avatars/2026/10/photo1.png",
      "avatars/2026/10/photo2.png"
    ]
  }
  ```

---

### 8. Presigned Upload (Handshake for Direct Frontend Uploads)
Allows external backends to create a temporary, signed upload URL so browsers or frontend clients can upload large files directly to EdgeKit Storage without exposing the master `API_KEY` or exceeding serverless payload limits (e.g. Vercel 4.5MB limit).

#### Step 1: Backend generates the presigned URL
- **Method**: `POST`
- **Route**: `/api/upload/presigned` (or `/upload/presigned`)
- **Headers**: `X-API-Key: <your-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "filename": "video.mp4",
    "folder": "courses",
    "preserveName": true,
    "expiresInSeconds": 600
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "uploadUrl": "https://storage.yourdomain.com/upload/presigned/courses/2026/10/hash_video.mp4?token=...&expires=1730000000",
      "method": "PUT",
      "key": "courses/2026/10/hash_video.mp4",
      "url": "https://media.yourdomain.com/courses/2026/10/hash_video.mp4",
      "expiresAt": 1730000000,
      "expiresInSeconds": 600,
      "mimeType": "video/mp4",
      "maxSizeBytes": 26214400,
      "isPrivate": false
    }
  }
  ```

#### Step 2: Browser uploads directly to R2
```javascript
// On frontend browser:
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file // raw File or Blob
});
```

---

### 9. Force File Download (`Content-Disposition`)
To force a browser to download a file as an attachment instead of displaying it inline, append `?download=true`:
- Public: `https://storage.yourdomain.com/f/reports/annual.pdf?download=true`
- Private: `https://storage.yourdomain.com/private/reports/annual.pdf?token=...&expires=...&download=true`
- Custom filename: Append `&filename=relatorio_final.pdf` to override the downloaded file name.

---

## 📦 Ready-to-Use Snippets by Language (Copy-Paste)

Instead of requiring heavy third-party packages, copy native snippets directly into your projects:

| Language | File | Supported Frameworks & Runtimes |
| :--- | :--- | :--- |
| **TypeScript / JS** | [`snippets/storage.ts`](snippets/storage.ts) | Next.js (App Router / Server Actions), Remix, Astro, Node 18+, Bun |
| **Python** | [`snippets/storage.py`](snippets/storage.py) | FastAPI, Django, Flask, Celery |
| **PHP** | [`snippets/Storage.php`](snippets/Storage.php) | Laravel, Symfony, WordPress, PHP 8+ native |
| **Go** | [`snippets/storage.go`](snippets/storage.go) | Gin, Fiber, Chi, Go Standard Library |
| **C# (.NET)** | [`snippets/EdgeKitStorage.cs`](snippets/EdgeKitStorage.cs) | ASP.NET Core, Blazor, .NET 6/7/8+ native |
| **Java** | [`snippets/EdgeKitStorage.java`](snippets/EdgeKitStorage.java) | Spring Boot, Quarkus, Micronaut, Java 17+ native |
| **Rust** | [`snippets/storage.rs`](snippets/storage.rs) | Axum, Actix-web, Tauri, Tokio |
| **HTTP / cURL** | [`docs/integrations.md`](docs/integrations.md) | Shell, Postman, Webhooks, Scripts |

> 📖 **Full Integration Guide**: Check [`docs/integrations.md`](docs/integrations.md) for step-by-step tutorials with examples in Next.js, FastAPI, Laravel, ASP.NET Core, Spring Boot, Axum, and Go.

---

### Quick Example in TypeScript / Next.js

```typescript
// lib/storage.ts (or copy from snippets/storage.ts)
import { createStorageClient } from '@/lib/storage';

const storage = createStorageClient({
  baseUrl: process.env.EDGEKIT_STORAGE_URL!,
  apiKey: process.env.EDGEKIT_STORAGE_API_KEY!,
});

// 1. Upload file
const { url, key } = await storage.upload(file, { folder: 'avatars', preserveName: true });

// 2. Temporary signed URL for private file
const { url: signedUrl } = await storage.getSignedUrl('private/invoice.pdf', { expiresInSeconds: 3600 });
```

### Quick Example in cURL

```bash
curl -X POST "https://storage.yourdomain.com/upload" \
  -H "X-API-Key: your-api-key" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=gallery"
```

---

## ⚙️ Environment Variables & Configuration

| Variable | Type | Default | Description |
|---|---|---|---|
| `API_KEY` | Secret | *Required* | Master API Key for upload, listing, and deletion |
| `PUBLIC_URL` | String | `""` | R2 public domain (e.g. `https://media.yourdomain.com`). If empty, uses `/f/:key` Worker route |
| `ALLOWED_MIME_TYPES` | String | `image/*,application/pdf` | Comma-separated allowed MIME types (`*` allows all) |
| `MAX_FILE_SIZE_MB` | String | `25` | Maximum allowed file upload size in MB |
| `ENABLE_WORKER_FALLBACK_STREAM` | String | `true` | If `true`, serves `/f/:key` when no custom public domain is configured |
| `ALLOWED_ORIGINS` | String | `""` | Allowed CORS origins (e.g. `http://localhost:3000,https://app.com`). Empty allows direct requests |

---

## 📄 License

This project is open-source licensed under the [MIT License](LICENSE).
