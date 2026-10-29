<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;
use CURLFile;

/**
 * EdgeKit Storage Client for PHP & Laravel (Copy-Paste Snippet)
 * 
 * Salve este arquivo em `app/Services/EdgeKitStorage.php` (ou copie diretamente).
 * Zero dependências externas — utiliza a extensão cURL nativa do PHP 8.0+.
 */
class EdgeKitStorage
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct(string $baseUrl, string $apiKey)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = trim($apiKey);
    }

    /**
     * Envia um arquivo para o Cloudflare R2 via EdgeKit Storage.
     *
     * @param string|CURLFile $file Caminho absoluto do arquivo no disco ou objeto CURLFile
     * @param array{
     *   folder?: string,
     *   preserveName?: bool,
     *   customName?: string,
     *   private?: bool
     * } $options
     * @return array Resposta da API com key, url, size, mimeType, etc.
     */
    public function upload(string|CURLFile $file, array $options = []): array
    {
        $postData = [];

        if (is_string($file)) {
            if (!file_exists($file)) {
                throw new RuntimeException("Arquivo não encontrado no disco: {$file}");
            }
            $postData['file'] = new CURLFile($file);
        } else {
            $postData['file'] = $file;
        }

        if (!empty($options['folder'])) {
            $postData['folder'] = $options['folder'];
        }
        if (!empty($options['preserveName'])) {
            $postData['preserveName'] = 'true';
        }
        if (!empty($options['customName'])) {
            $postData['customName'] = $options['customName'];
        }
        if (!empty($options['private'])) {
            $postData['private'] = 'true';
        }

        return $this->request('POST', '/upload', $postData, true);
    }

    /**
     * Gera uma URL temporária assinada com HMAC para download seguro de arquivo privado.
     */
    public function getSignedUrl(string $key, int $expiresInSeconds = 3600): array
    {
        return $this->request('POST', '/api/signed-url', [
            'key' => $key,
            'expiresInSeconds' => $expiresInSeconds,
        ]);
    }

    /**
     * Exclui um único arquivo do bucket pelo seu caminho/key.
     */
    public function delete(string $key): bool
    {
        $cleanKey = ltrim($key, '/');
        $this->request('DELETE', '/api/files/' . rawurlencode($cleanKey));
        return true;
    }

    /**
     * Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote).
     */
    public function deleteMany(array $keys): bool
    {
        $this->request('POST', '/api/files/batch-delete', [
            'keys' => array_values($keys),
        ]);
        return true;
    }

    /**
     * Lista arquivos no bucket R2 com paginação.
     */
    public function list(array $options = []): array
    {
        $query = http_build_query([
            'limit' => $options['limit'] ?? 50,
            'cursor' => $options['cursor'] ?? null,
            'prefix' => $options['prefix'] ?? null,
        ]);

        return $this->request('GET', '/api/files' . ($query ? '?' . $query : ''));
    }

    /**
     * Executa requisição HTTP autenticada via cURL nativo.
     */
    private function request(string $method, string $path, mixed $body = null, bool $isMultipart = false): array
    {
        $ch = curl_init($this->baseUrl . $path);
        $headers = [
            'X-API-Key: ' . $this->apiKey,
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($method === 'POST') {
            if ($isMultipart) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            } elseif ($body !== null) {
                $headers[] = 'Content-Type: application/json';
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            }
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new RuntimeException("Erro na comunicação cURL: {$error}");
        }

        $json = json_decode((string) $response, true);

        if ($httpCode >= 400 || empty($json['success'])) {
            $msg = $json['error']['message'] ?? "Falha na requisição EdgeKit Storage (HTTP {$httpCode})";
            throw new RuntimeException($msg, $httpCode);
        }

        return $json['data'] ?? [];
    }
}
