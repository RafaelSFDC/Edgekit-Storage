import React, { useState } from 'react';
import { Copy, Check, Code2, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { copyToClipboard } from '../../lib/utils';
import { toast } from 'sonner';

const SNIPPETS: Record<string, { title: string; lang: string; code: string }> = {
  curl: {
    title: 'cURL (CLI)',
    lang: 'bash',
    code: `# 1. Upload de Arquivo Público
curl -X POST "http://localhost:8787/upload" \\
  -H "X-API-Key: sua-chave-aqui" \\
  -F "file=@./imagem.png" \\
  -F "folder=uploads"

# 2. Upload de Arquivo Privado
curl -X POST "http://localhost:8787/upload" \\
  -H "X-API-Key: sua-chave-aqui" \\
  -F "file=@./documento.pdf" \\
  -F "private=true"

# 3. Gerar URL Assinada com Expiração (1 hora)
curl -X POST "http://localhost:8787/api/signed-url" \\
  -H "X-API-Key: sua-chave-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "private/documento.pdf", "expiresInSeconds": 3600}'`,
  },
  ts: {
    title: 'TypeScript / Node.js',
    lang: 'typescript',
    code: `import fs from 'node:fs';

const API_KEY = process.env.EDGEKIT_STORAGE_API_KEY || 'sua-chave';
const BASE_URL = 'http://localhost:8787';

// Upload com FormData
async function uploadFile(filePath: string, folder = 'uploads') {
  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), 'foto.png');
  formData.append('folder', folder);

  const res = await fetch(\`\${BASE_URL}/upload\`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: formData,
  });

  const json = await res.json();
  console.log('Arquivo salvo com sucesso:', json.data.url);
  return json.data;
}`,
  },
  py: {
    title: 'Python',
    lang: 'python',
    code: `import requests

API_KEY = "sua-chave-aqui"
BASE_URL = "http://localhost:8787"

# Upload simples
with open("avatar.png", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/upload",
        headers={"X-API-Key": API_KEY},
        files={"file": f},
        data={"folder": "users", "preserveName": "true"}
    )

print(response.json())`,
  },
  php: {
    title: 'PHP',
    lang: 'php',
    code: `<?php

$apiKey = 'sua-chave-aqui';
$ch = curl_init('http://localhost:8787/upload');

$cfile = new CURLFile('arquivo.pdf', 'application/pdf', 'arquivo.pdf');
$data = [
    'file' => $cfile,
    'folder' => 'docs',
    'private' => 'true'
];

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: {$apiKey}"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,
  },
  go: {
    title: 'Go',
    lang: 'go',
    code: `package main

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	file, _ := os.Open("image.jpg")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "image.jpg")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "http://localhost:8787/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", "sua-chave-aqui")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()
}`,
  },
  rust: {
    title: 'Rust',
    lang: 'rust',
    code: `use reqwest::multipart;
use tokio::fs::File;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let form = multipart::Form::new()
        .file("file", "relatorio.pdf")
        .await?;

    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:8787/upload")
        .header("X-API-Key", "sua-chave-aqui")
        .multipart(form)
        .send()
        .await?;

    println!("Status: {}", res.status());
    Ok(())
}`,
  },
};

export const SnippetGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState('curl');
  const [copied, setCopied] = useState(false);

  const snippet = SNIPPETS[activeTab] || SNIPPETS.curl;

  const handleCopy = async () => {
    const success = await copyToClipboard(snippet.code);
    if (success) {
      setCopied(true);
      toast.success('Snippet copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="size-4 text-primary" />
              <span>{snippet.title}</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Exemplo de integração pronta para copiar e executar no seu backend.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-8 p-0.5 bg-muted/60 mb-3">
            <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
            <TabsTrigger value="ts" className="text-xs">TypeScript</TabsTrigger>
            <TabsTrigger value="py" className="text-xs">Python</TabsTrigger>
            <TabsTrigger value="php" className="text-xs">PHP</TabsTrigger>
            <TabsTrigger value="go" className="text-xs">Go</TabsTrigger>
            <TabsTrigger value="rust" className="text-xs">Rust</TabsTrigger>
          </TabsList>

          <div className="relative rounded-lg bg-zinc-950 p-4 border border-zinc-800 overflow-x-auto text-xs font-mono text-zinc-100 leading-relaxed">
            <pre>
              <code>{snippet.code}</code>
            </pre>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
