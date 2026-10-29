using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace EdgeKit.Storage
{
    /// <summary>
    /// EdgeKit Storage Client for C# / .NET (Copy-Paste Snippet).
    /// Zero dependências externas (NuGet) — utiliza HttpClient e System.Text.Json nativos do .NET 6/7/8+.
    /// </summary>
    public class EdgeKitStorageClient
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private readonly string _apiKey;

        public EdgeKitStorageClient(string baseUrl, string apiKey, HttpClient httpClient = null)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _apiKey = apiKey.Trim();
            _http = httpClient ?? new HttpClient();
        }

        /// <summary>
        /// Envia um arquivo para o Cloudflare R2 via EdgeKit Storage a partir do caminho no disco.
        /// </summary>
        public async Task<StorageFile> UploadAsync(string filePath, UploadOptions options = null, CancellationToken ct = default)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("Arquivo não encontrado no disco", filePath);

            var fileName = Path.GetFileName(filePath);
            await using var stream = File.OpenRead(filePath);
            return await UploadAsync(stream, fileName, options, ct);
        }

        /// <summary>
        /// Envia um stream de dados para o Cloudflare R2 via EdgeKit Storage.
        /// </summary>
        public async Task<StorageFile> UploadAsync(Stream stream, string fileName, UploadOptions options = null, CancellationToken ct = default)
        {
            using var form = new MultipartFormDataContent();
            var streamContent = new StreamContent(stream);
            form.Add(streamContent, "file", fileName);

            if (options != null)
            {
                if (!string.IsNullOrEmpty(options.Folder))
                    form.Add(new StringContent(options.Folder), "folder");
                if (options.PreserveName)
                    form.Add(new StringContent("true"), "preserveName");
                if (!string.IsNullOrEmpty(options.CustomName))
                    form.Add(new StringContent(options.CustomName), "customName");
                if (options.IsPrivate)
                    form.Add(new StringContent("true"), "private");
            }

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/upload")
            {
                Content = form
            };
            req.Headers.Add("X-API-Key", _apiKey);

            var res = await _http.SendAsync(req, ct);
            var json = await res.Content.ReadAsStringAsync(ct);

            var apiRes = JsonSerializer.Deserialize<ApiResponse<StorageFile>>(json, JsonOptions);
            if (!res.IsSuccessStatusCode || apiRes == null || !apiRes.Success)
            {
                throw new InvalidOperationException(apiRes?.Error?.Message ?? $"Falha no upload (HTTP {res.StatusCode})");
            }

            return apiRes.Data;
        }

        /// <summary>
        /// Gera uma URL temporária assinada com HMAC para download seguro de arquivo privado.
        /// </summary>
        public async Task<SignedUrlResult> GetSignedUrlAsync(string key, int expiresInSeconds = 3600, CancellationToken ct = default)
        {
            var payload = JsonSerializer.Serialize(new { key, expiresInSeconds });
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/signed-url")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            req.Headers.Add("X-API-Key", _apiKey);

            var res = await _http.SendAsync(req, ct);
            var json = await res.Content.ReadAsStringAsync(ct);

            var apiRes = JsonSerializer.Deserialize<ApiResponse<SignedUrlResult>>(json, JsonOptions);
            if (!res.IsSuccessStatusCode || apiRes == null || !apiRes.Success)
            {
                throw new InvalidOperationException(apiRes?.Error?.Message ?? $"Falha ao gerar signed URL (HTTP {res.StatusCode})");
            }

            return apiRes.Data;
        }

        /// <summary>
        /// Exclui um único arquivo do bucket R2.
        /// </summary>
        public async Task<bool> DeleteAsync(string key, CancellationToken ct = default)
        {
            var cleanKey = key.TrimStart('/');
            using var req = new HttpRequestMessage(HttpMethod.Delete, $"{_baseUrl}/api/files/{Uri.EscapeDataString(cleanKey)}");
            req.Headers.Add("X-API-Key", _apiKey);

            var res = await _http.SendAsync(req, ct);
            return res.IsSuccessStatusCode;
        }

        /// <summary>
        /// Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote).
        /// </summary>
        public async Task<bool> DeleteManyAsync(IEnumerable<string> keys, CancellationToken ct = default)
        {
            var payload = JsonSerializer.Serialize(new { keys });
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/files/batch-delete")
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            req.Headers.Add("X-API-Key", _apiKey);

            var res = await _http.SendAsync(req, ct);
            return res.IsSuccessStatusCode;
        }

        /// <summary>
        /// Lista arquivos no bucket R2 com paginação por cursor.
        /// </summary>
        public async Task<ListResult> ListAsync(ListOptions options = null, CancellationToken ct = default)
        {
            var query = new List<string>();
            if (options?.Limit.HasValue == true) query.Add($"limit={options.Limit.Value}");
            if (!string.IsNullOrEmpty(options?.Cursor)) query.Add($"cursor={Uri.EscapeDataString(options.Cursor)}");
            if (!string.IsNullOrEmpty(options?.Prefix)) query.Add($"prefix={Uri.EscapeDataString(options.Prefix)}");

            var url = $"{_baseUrl}/api/files" + (query.Count > 0 ? "?" + string.Join("&", query) : "");
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("X-API-Key", _apiKey);

            var res = await _http.SendAsync(req, ct);
            var json = await res.Content.ReadAsStringAsync(ct);

            var apiRes = JsonSerializer.Deserialize<ApiResponse<ListResult>>(json, JsonOptions);
            if (!res.IsSuccessStatusCode || apiRes == null || !apiRes.Success)
            {
                throw new InvalidOperationException(apiRes?.Error?.Message ?? $"Falha ao listar (HTTP {res.StatusCode})");
            }

            return apiRes.Data;
        }

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public class UploadOptions
    {
        public string Folder { get; set; }
        public bool PreserveName { get; set; }
        public string CustomName { get; set; }
        public bool IsPrivate { get; set; }
    }

    public class ListOptions
    {
        public int? Limit { get; set; }
        public string Cursor { get; set; }
        public string Prefix { get; set; }
    }

    public class StorageFile
    {
        public string Key { get; set; }
        public string Url { get; set; }
        public long Size { get; set; }
        public string MimeType { get; set; }
        public string OriginalName { get; set; }
        public bool IsPrivate { get; set; }
        public string UploadedAt { get; set; }
    }

    public class SignedUrlResult
    {
        public string Url { get; set; }
        public string Key { get; set; }
        public long ExpiresAt { get; set; }
        public int ExpiresInSeconds { get; set; }
    }

    public class ListResult
    {
        public List<StorageFile> Objects { get; set; }
        public bool Truncated { get; set; }
        public string Cursor { get; set; }
    }

    internal class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T Data { get; set; }
        public ApiError Error { get; set; }
    }

    internal class ApiError
    {
        public string Message { get; set; }
    }
}
