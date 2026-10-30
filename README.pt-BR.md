# EdgeKit Storage (Cloudflare Workers + R2)

<p align="left">
  <a href="README.md">🇺🇸 English</a> •
  <b>🇧🇷 Português (Brasil)</b>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Egress](https://img.shields.io/badge/Bandwidth-Zero%20Egress%20Fee-emerald)](#)

Uma **alternativa open-source, serverless e self-hosted ao Uploadthing e AWS S3**, desenvolvida com **Hono** no **Cloudflare Workers** integrado ao **Cloudflare R2**. 

Projetada com dupla finalidade:
1. **Dashboard visual completa** para gerenciar seus arquivos na nuvem com tema escuro, busca e drag-and-drop.
2. **Microsserviço / API externa de alta performance** para qualquer aplicação existente (seja em **Vercel, VPS, AWS, Next.js, Node, Laravel, Go ou Python**), com um cliente TypeScript estilo shadcn de zero dependências.

---

## 🚀 Destaques

- ⚡ **Deploy em 1 Clique**: Botão oficial Cloudflare Workers Deploy ou configuração via `pnpm run setup`.
- 💰 **Zero Egress Fee**: O Cloudflare R2 não cobra taxa de transferência de saída (bandwidth de download gratuita).
- 🔐 **URLs Assinadas com HMAC-SHA256**: Entregue links temporários para arquivos privados (`storage.getSignedUrl(key, { expiresInSeconds })`) sem expor sua API Key mestra.
- 🗑️ **Deleção em Lote (Batch Delete)**: Exclua dezenas ou centenas de arquivos de uma só vez via API ou com seleção múltipla na dashboard.
- 📄 **Paginação Real por Cursor**: Navegue por milhares de arquivos com cursor nativo do R2 e botão "Carregar mais".
- 🌐 **CORS Flexível para Apps Externos**: Configure `ALLOWED_ORIGINS` para permitir uploads diretos a partir do seu app na Vercel ou VPS com segurança.
- 🖥️ **Dashboard Web Integrada**: Interface em **React 19 + Tailwind CSS** servida diretamente pela Cloudflare na rota raiz `/` com pré-visualizações, métricas e snippets prontos.
- 📦 **Snippet estilo shadcn (Zero Dependências NPM)**: Copie [`snippets/storage.ts`](snippets/storage.ts) para o seu app (`lib/storage.ts`) e use TypeScript com Fetch nativo sem instalar bibliotecas pesadas de terceiros.

---

## 🖥️ Dashboard Web Integrada

O projeto conta com uma interface moderna construída em **React 19, Tailwind CSS e Lucide Icons**, compilada e servida automaticamente na borda pelo Cloudflare Workers via **Static Assets**:

- 🔑 **Configuração Segura de API Key**: Modal intuitivo com teste de conexão em tempo real e armazenamento no `localStorage`.
- ☁️ **Área de Drag & Drop**: Arraste múltiplos arquivos com preview, barra de progresso individual e opções de pasta, preservação de nome e arquivo privado.
- 🖼️ **Galeria Interativa**: Visualização em Grade ou Tabela, busca em tempo real, filtro por pasta e formato.
- 📋 **Modal de Detalhes & Snippets**: Clique em qualquer arquivo para ver dimensões, metadados e copiar snippets prontos em **HTML (`<img>`)**, **Markdown** ou **Next.js (`<Image />`)**.

---

## 📐 Como Funciona a Arquitetura

```
[Seu Backend Externo]
        │
        ▼ (POST /upload com API Key)
[Hono Worker na Cloudflare]
        │
        ▼ (Salva objeto no R2)
[Cloudflare R2 Bucket]
        │
        ▼ (Retorna URL direta: https://media.seusite.com/2026/10/hash.png)
[Seu Backend Externo]
        │
        ▼
[Navegadores / Usuários Finais] ──(Acesso Direto ao R2 / CDN)──► [Cloudflare R2]
                                (Zero requisições no Worker!)
```

---

## 🛠️ Pré-requisitos

- **Node.js** >= 18
- **pnpm** (ou npm)
- Conta na **Cloudflare** com R2 ativado (plano gratuito inclui 10 GB de armazenamento).

---

## ⚡ Instalação e Desenvolvimento Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/RafaelSFDC/Edgekit-Storage.git
   cd Edgekit-Storage
   ```

2. **Instale as dependências:**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis locais:**
   Crie o arquivo `.dev.vars` (já incluso no `.gitignore`):
   ```ini
   API_KEY=minha-chave-secreta-de-teste
   PUBLIC_URL=http://localhost:8787/f
   ALLOWED_MIME_TYPES=image/*,application/pdf
   MAX_FILE_SIZE_MB=25
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   pnpm dev
   ```
   O Wrangler iniciará um ambiente simulado local com emulador de R2 em `http://localhost:8787`.

5. **Executar testes automatizados ponta a ponta:**
   ```bash
   pnpm test
   ```

---

## 🌐 Publicação na Cloudflare (Deploy)

### 1. Fazer login na Cloudflare CLI
```bash
pnpm wrangler login
```

### 2. Criar o Bucket R2
```bash
pnpm wrangler r2 bucket create cloudflare-storage-bucket
```

### 3. Configurar a Secret de API Key
Defina sua chave de API secreta nos servidores da Cloudflare:
```bash
pnpm wrangler secret put API_KEY
```
*(Digite sua chave segura quando solicitado)*

### 4. (Recomendado) Configurar Domínio Público no R2
Para que os arquivos públicos não consumam execuções de Worker:
1. Acesse o **Cloudflare Dashboard** > **R2** > selecione seu bucket `cloudflare-storage-bucket`.
2. Vá na aba **Settings** > **Public Access**.
3. Escolha uma das opções:
   - **Custom Domains**: Conecte seu subdomínio (ex: `media.seusite.com`).
   - Ou ative **R2.dev subdomain** (URL pública fornecida pela Cloudflare, ex: `https://pub-xxxxxx.r2.dev`).
4. Atualize o valor de `PUBLIC_URL` no `wrangler.jsonc` (ou via `pnpm wrangler secret put PUBLIC_URL`):
   ```jsonc
   "vars": {
     "PUBLIC_URL": "https://media.seusite.com"
   }
   ```

### 5. Fazer Deploy
```bash
pnpm deploy
```
Seu backend estará no ar em segundos! 🚀

---

## 📖 Referência da API

### 1. Upload de Arquivo
Salva um arquivo no bucket R2 e retorna a URL pública ou privada.

- **Método**: `POST`
- **Rota**: `/upload`
- **Headers**:
  - `X-API-Key: <sua-api-key>` ou `Authorization: Bearer <sua-api-key>`
  - `Content-Type: multipart/form-data`
- **Campos do Formulário (`multipart/form-data`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  |---|---|---|---|
  | `file` (ou `image`) | File | **Sim** | O arquivo binário a ser enviado |
  | `folder` | String | Não | Subpasta/prefixo (ex: `avatars`, `posts`) |
  | `preserveName` | Boolean | Não | Se `true`, mantém o nome original no sufixo (ex: `hash_original.png`) |
  | `customName` | String | Não | Define um caminho/nome exato manual |
  | `private` | Boolean | Não | Se `true`, salva como arquivo privado acessível apenas com API Key |

#### Exemplo de Resposta de Sucesso (`201 Created`):
```json
{
  "success": true,
  "data": {
    "key": "avatars/2026/10/a8Z9xQ2L_perfil.webp",
    "url": "https://media.seusite.com/avatars/2026/10/a8Z9xQ2L_perfil.webp",
    "size": 65420,
    "mimeType": "image/webp",
    "originalName": "perfil.webp",
    "isPrivate": false,
    "uploadedAt": "2026-10-29T09:15:00.000Z"
  }
}
```

---

### 2. Listar Arquivos
Lista arquivos salvos no bucket R2 com paginação.

- **Método**: `GET`
- **Rota**: `/api/files`
- **Headers**: `X-API-Key: <sua-api-key>`
- **Query Params**:
  - `limit`: Quantidade máxima (padrão: 20, máx: 100)
  - `cursor`: Token de paginação para a próxima página
  - `prefix`: Filtrar por pasta ou prefixo (ex: `avatars/`)

#### Exemplo de Resposta:
```json
{
  "success": true,
  "data": {
    "objects": [
      {
        "key": "avatars/2026/10/a8Z9xQ2L_perfil.webp",
        "size": 65420,
        "uploadedAt": "2026-10-29T09:15:00.000Z",
        "mimeType": "image/webp",
        "url": "https://media.seusite.com/avatars/2026/10/a8Z9xQ2L_perfil.webp",
        "isPrivate": false
      }
    ],
    "truncated": false,
    "cursor": null
  }
}
```

---

### 3. Obter Metadados do Arquivo
- **Método**: `GET`
- **Rota**: `/api/files/:key+/meta`
- **Headers**: `X-API-Key: <sua-api-key>`

---

### 4. Deletar Arquivo
Remove um arquivo do bucket R2.

- **Método**: `DELETE`
- **Rota**: `/api/files/:key+`
- **Headers**: `X-API-Key: <sua-api-key>`

#### Exemplo de Resposta:
```json
{
  "success": true,
  "data": {
    "message": "File deleted successfully",
    "key": "avatars/2026/10/a8Z9xQ2L_perfil.webp"
  }
}
```

---

### 5. Acesso a Arquivos Privados & URLs Assinadas
Se você realizou o upload com `private=true`, o arquivo fica protegido e não pode ser acessado publicamente.

Existem duas maneiras seguras de acessar:
1. **Via URL Assinada (Recomendado para Usuários Finais)**:
   - Gere uma URL temporária via `POST /api/signed-url` (com token HMAC e expiração).
   - O link retornado tem o formato `https://sua-api.com/private/arquivo.pdf?token=...&expires=1740000000` e pode ser aberto no navegador sem expor sua API Key.
2. **Via API Key (Para Seus Próprios Servidores)**:
   - Requisição direta `GET /private/:key+` enviando o header `X-API-Key: <sua-chave>`.

---

### 6. Gerar URL Assinada (Signed URL)
Gera uma URL temporária com assinatura criptográfica HMAC-SHA256 para permitir que clientes baixem um arquivo privado.

- **Método**: `POST`
- **Rota**: `/api/signed-url`
- **Headers**: `X-API-Key: <sua-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "key": "private/faturas/2026/recibo.pdf",
    "expiresInSeconds": 3600
  }
  ```

---

### 7. Deleção em Lote (Batch Delete)
Remove dezenas ou centenas de arquivos do bucket R2 em uma única chamada.

- **Método**: `POST`
- **Rota**: `/api/files/batch-delete`
- **Headers**: `X-API-Key: <sua-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "keys": [
      "avatars/2026/10/foto1.png",
      "avatars/2026/10/foto2.png"
    ]
  }
  ```

---

### 8. Upload Pré-Assinado (Handshake para Upload Direto do Frontend)
Permite que seu backend (ex: Next.js na Vercel) gere uma URL temporária assinada com HMAC-SHA256 para que o navegador do usuário final faça o upload do arquivo diretamente para o EdgeKit Storage / R2.

Isso elimina o limite de 4,5 MB da Vercel/Serverless, economiza a banda do seu servidor e **não expõe sua `API_KEY` mestra**.

#### Passo 1: Seu backend gera a URL temporária
- **Método**: `POST`
- **Rota**: `/api/upload/presigned` (ou `/upload/presigned`)
- **Headers**: `X-API-Key: <sua-api-key>`, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "filename": "video.mp4",
    "folder": "aulas",
    "preserveName": true,
    "expiresInSeconds": 600
  }
  ```
- **Retorno (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "uploadUrl": "https://storage.seudominio.com/upload/presigned/aulas/2026/10/hash_video.mp4?token=...&expires=1730000000",
      "method": "PUT",
      "key": "aulas/2026/10/hash_video.mp4",
      "url": "https://media.seudominio.com/aulas/2026/10/hash_video.mp4",
      "expiresAt": 1730000000,
      "expiresInSeconds": 600,
      "mimeType": "video/mp4",
      "maxSizeBytes": 26214400,
      "isPrivate": false
    }
  }
  ```

#### Passo 2: O navegador do usuário envia os bytes diretamente
```javascript
// No frontend (React, Vue, mobile, etc.):
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file // File ou Blob binário
});
```

---

---

### 10. Upload de Variantes Pré-Redimensionadas (Sharp / Pillow / Background)
Se você não deseja pagar pelos planos da Cloudflare para processar imagens, seu backend (Node.js com `sharp`, Python com `Pillow`, etc.) pode redimensionar as imagens localmente e enviá-las agrupadas para o EdgeKit Storage.

O EdgeKit salva todas as variantes no bucket R2 com sufixos padronizados (`_thumb`, `_medium`, etc.) e retorna um mapa consolidado com a URL de cada variante:

#### Exemplo com FormData / cURL:
Campos adicionais com o prefixo `variant_<nome>` (ex: `variant_thumb`, `variant_medium`):
```bash
curl -X POST "https://storage.seudominio.com/upload" \
  -H "X-API-Key: sua-api-key" \
  -F "file=@avatar.png" \
  -F "variant_thumb=@avatar_thumb.webp" \
  -F "variant_medium=@avatar_medium.webp" \
  -F "folder=usuarios"
```

#### Retorno consolidado com as variantes:
```json
{
  "success": true,
  "data": {
    "key": "usuarios/2026/10/hash_avatar.png",
    "url": "https://media.seudominio.com/usuarios/2026/10/hash_avatar.png",
    "size": 524288,
    "mimeType": "image/png",
    "variants": {
      "thumb": {
        "key": "usuarios/2026/10/hash_avatar_thumb.webp",
        "url": "https://media.seudominio.com/usuarios/2026/10/hash_avatar_thumb.webp",
        "size": 14200,
        "mimeType": "image/webp"
      },
      "medium": {
        "key": "usuarios/2026/10/hash_avatar_medium.webp",
        "url": "https://media.seudominio.com/usuarios/2026/10/hash_avatar_medium.webp",
        "size": 68400,
        "mimeType": "image/webp"
      }
    }
  }
}
```

---

### 11. Redimensionamento Dinâmico via Cloudflare CDN (On-the-Fly)
Se você possui um domínio personalizado com o Cloudflare Image Resizing habilitado na zona, nenhuma configuração no servidor é necessária. Você pode consumir a imagem diretamente na URL passando os parâmetros da CDN:

```
https://media.seudominio.com/cdn-cgi/image/width=300,height=300,quality=80,format=webp/caminho/foto.jpg
```

Helper pronto no snippet TypeScript:
```typescript
import { getCloudflareResizedUrl } from '@/lib/storage';

const avatarThumb = getCloudflareResizedUrl(file.url, {
  width: 200,
  height: 200,
  format: 'webp',
  quality: 85,
  fit: 'cover',
});
```

---

## 📦 Snippets Prontos por Linguagem (Copy-Paste)

Em vez de forçar a instalação de pacotes externos pesados, você pode copiar os snippets nativos prontos diretamente para o seu projeto:

| Linguagem | Arquivo | Frameworks / Runtimes Suportados |
| :--- | :--- | :--- |
| **TypeScript / JS** | [`snippets/storage.ts`](snippets/storage.ts) | Next.js (App Router / Server Actions), Remix, Astro, Node 18+, Bun |
| **Python** | [`snippets/storage.py`](snippets/storage.py) | FastAPI, Django, Flask, Celery |
| **PHP** | [`snippets/Storage.php`](snippets/Storage.php) | Laravel, Symfony, WordPress, PHP 8+ nativo |
| **Go** | [`snippets/storage.go`](snippets/storage.go) | Gin, Fiber, Chi, Go Standard Library |
| **C# (.NET)** | [`snippets/EdgeKitStorage.cs`](snippets/EdgeKitStorage.cs) | ASP.NET Core, Blazor, .NET 6/7/8+ nativo |
| **Java** | [`snippets/EdgeKitStorage.java`](snippets/EdgeKitStorage.java) | Spring Boot, Quarkus, Micronaut, Java 17+ nativo |
| **Rust** | [`snippets/storage.rs`](snippets/storage.rs) | Axum, Actix-web, Tauri, Tokio |
| **HTTP / cURL** | [`docs/integrations.md`](docs/integrations.md) | Shell, Postman, Webhooks, Scripts |

> 📖 **Documentação Completa de Integração**: Consulte [`docs/integrations.md`](docs/integrations.md) para tutoriais passo a passo com exemplos em Next.js, FastAPI, Laravel, ASP.NET Core, Spring Boot, Axum e Go.

---

### Exemplo Rápido em TypeScript / Next.js

```typescript
// lib/storage.ts (ou copie de snippets/storage.ts)
import { createStorageClient } from '@/lib/storage';

const storage = createStorageClient({
  baseUrl: process.env.EDGEKIT_STORAGE_URL!,
  apiKey: process.env.EDGEKIT_STORAGE_API_KEY!,
});

// 1. Upload de arquivo
const { url, key } = await storage.upload(file, { folder: 'avatars', preserveName: true });

// 2. Link temporário para arquivo privado
const { url: signedUrl } = await storage.getSignedUrl('private/fatura.pdf', { expiresInSeconds: 3600 });
```

### Exemplo Rápido em cURL

```bash
curl -X POST "https://storage.seudominio.com/upload" \
  -H "X-API-Key: sua-chave-aqui" \
  -F "file=@/caminho/para/imagem.jpg" \
  -F "folder=galeria"
```

---

## ⚙️ Variáveis de Ambiente e Configurações

| Variável | Tipo | Padrão | Descrição |
|---|---|---|---|
| `API_KEY` | Secret | *Obrigatório* | Chave de segurança para upload/listagem/deleção |
| `PUBLIC_URL` | String | `""` | Domínio público do R2 (ex: `https://media.seusite.com`). Se vazio, usa rota `/f/:key` do Worker |
| `ALLOWED_MIME_TYPES` | String | `image/*,application/pdf` | Tipos permitidos separados por vírgula (`*` para todos) |
| `MAX_FILE_SIZE_MB` | String | `25` | Tamanho máximo permitido de upload em MB |
| `ENABLE_WORKER_FALLBACK_STREAM` | String | `true` | Se `true`, permite que `/f/:key` sirva arquivos caso não haja Custom Domain |
| `ALLOWED_ORIGINS` | String | `""` | Domínios permitidos no CORS (ex: `http://localhost:3000,https://app.com`). Vazio permite requisições diretas |

---

## 📄 Licença

Este projeto é open-source licenciado sob a [MIT License](LICENSE).
