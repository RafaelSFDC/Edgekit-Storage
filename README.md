# Cloudflare Storage (Hono + Cloudflare R2)

Um backend open-source minimalista, rápido e de custo ultra-baixo para gerenciamento e armazenamento de imagens e arquivos, desenvolvido com **Hono** no **Cloudflare Workers** integrado ao **Cloudflare R2**.

Projetado especificamente para atuar como microsserviço de upload para outros backends (Node.js, Python, PHP, Go, etc.) e frontends com autenticação simples via **API Key**.

---

## 🚀 Destaques

- **Dashboard Web Moderna Integrada**: Interface em **React + Tailwind + shadcn/ui** servida diretamente pela Cloudflare na rota raiz `/` com tema escuro, drag-and-drop, filtros e pré-visualização de arquivos.
- **Zero Egress Fee**: O Cloudflare R2 não cobra taxas de tráfego de saída (bandwidth de download gratuita).
- **Sem Consumo de Worker em Leituras**: Configure um Custom Domain no R2 (ex: `media.seusite.com`) e os arquivos serão servidos **diretamente pela CDN do R2 sem gastar requisições do Worker**.
- **Autenticação Dupla (API Key + Cookie HttpOnly)**: 
  - Para scripts e backends externos: Header `X-API-Key` ou `Authorization: Bearer <key>`.
  - Para a Dashboard no navegador: Sessão segura via **Cookie HttpOnly** (imune a ataques XSS via JavaScript).
- **Snippet Copy-Paste estilo shadcn (Zero Dependências NPM)**: Arquivo TypeScript limpo e tipado (`snippets/storage.ts`) para colar diretamente no seu app (`lib/storage.ts`), sem inchar o `package.json`.
- **Nomes Únicos Automáticos**: Gera caminhos organizados por data com identificadores `nanoid` (ex: `2026/10/clx123_foto.webp`), evitando sobrescritas acidentais.
- **Suporte a Pastas e Nomes Originais**: Envie o campo `folder` ou ative `preserveName`.
- **Arquivos Protegidos (Privados)**: Suporte a upload com `private=true`. Arquivos privados só podem ser baixados enviando a API Key em `/private/:key`.
- **Filtro de Tipos (MIME Types)**: Permite configurar formatos aceitos (padrão: `image/*,application/pdf` ou `*` para todos).
- **Listagem e Deleção**: Endpoints para listar arquivos com paginação e excluir arquivos do bucket.

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
   git clone https://github.com/seu-usuario/cloudflare-storage.git
   cd cloudflare-storage
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

### 5. Acesso a Arquivos Privados
Se você realizou o upload com `private=true`, o arquivo fica protegido e não pode ser acessado publicamente. Para visualizá-lo ou baixá-lo:
- **Método**: `GET`
- **Rota**: `/private/:key+`
- **Headers**: `X-API-Key: <sua-api-key>` ou `Authorization: Bearer <sua-api-key>` (ou query param `?apiKey=<sua-api-key>`)

---

## 📦 Snippet do Cliente estilo shadcn (Zero Dependências)

Em vez de forçar a instalação de um pacote NPM externo com conflito de versões, você pode simplesmente copiar o arquivo [`snippets/storage.ts`](snippets/storage.ts) para o seu projeto (ex: `lib/storage.ts`).

Ele usa **Fetch nativo do TypeScript** e funciona imediatamente em **Next.js (App Router / Server Actions), Remix, Astro, Node.js 18+, Bun e Deno**:

```typescript
// lib/storage.ts (ou copie direto do botão 'Snippet' na Dashboard)
import { createStorageClient } from '@/lib/storage';

const storage = createStorageClient({
  baseUrl: process.env.STORAGE_BASE_URL!, // ex: https://storage-api.seudominio.com
  apiKey: process.env.STORAGE_API_KEY!,
});

// 1. Upload de arquivo
const file = formData.get('file') as File;
const { url, key } = await storage.upload(file, {
  folder: 'avatars',
  preserveName: true,
});

// 2. Listar arquivos
const { objects } = await storage.list({ prefix: 'avatars/' });

// 3. Deletar arquivo
await storage.delete('avatars/2026/10/clx_avatar.png');
```

---

## 💻 Exemplos de Integração em Outros Backends

### Exemplo em Node.js / TypeScript (Fetch Nativo)

```typescript
import fs from 'node:fs';

async function uploadImage() {
  const fileBlob = new Blob([fs.readFileSync('./foto.jpg')], { type: 'image/jpeg' });
  
  const form = new FormData();
  form.append('file', fileBlob, 'foto.jpg');
  form.append('folder', 'produtos');
  form.append('preserveName', 'true');

  const res = await fetch('https://storage-api.seudominio.com/upload', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.STORAGE_API_KEY!,
    },
    body: form,
  });

  const json = await res.json();
  console.log('URL da Imagem:', json.data.url);
}
```

### Exemplo em Python (Requests)

```python
import os
import requests

API_URL = "https://storage-api.seudominio.com/upload"
API_KEY = os.getenv("STORAGE_API_KEY")

with open("foto.png", "rb") as f:
    files = {"file": ("foto.png", f, "image/png")}
    data = {"folder": "usuarios", "preserveName": "true"}
    headers = {"X-API-Key": API_KEY}

    res = requests.post(API_URL, files=files, data=data, headers=headers)
    print("URL:", res.json()["data"]["url"])
```

### Exemplo em cURL

```bash
curl -X POST "https://storage-api.seudominio.com/upload" \
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

---

## 📄 Licença

Este projeto é open-source licenciado sob a [MIT License](LICENSE).
