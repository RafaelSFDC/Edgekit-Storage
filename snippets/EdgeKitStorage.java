package edgekit.storage;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;

/**
 * EdgeKit Storage Client for Java (Copy-Paste Snippet).
 * Zero dependências externas — utiliza o java.net.http.HttpClient nativo do Java 11/17/21+.
 * Compatível com Spring Boot, Quarkus, Micronaut e Plain Java.
 */
public class EdgeKitStorage {

    private final String baseUrl;
    private final String apiKey;
    private final HttpClient httpClient;

    public EdgeKitStorage(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey.trim();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    /**
     * Envia um arquivo local para o Cloudflare R2 via EdgeKit Storage.
     */
    public String upload(Path filePath, UploadOptions options) throws IOException, InterruptedException {
        byte[] bytes = Files.readAllBytes(filePath);
        String fileName = filePath.getFileName().toString();
        return upload(bytes, fileName, options);
    }

    /**
     * Envia bytes para o Cloudflare R2 via EdgeKit Storage.
     */
    public String upload(byte[] content, String fileName, UploadOptions options) throws IOException, InterruptedException {
        String boundary = "---EdgeKitBoundary" + UUID.randomUUID().toString().replace("-", "");
        byte[] body = buildMultipartBody(content, fileName, options, boundary);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/upload"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 400) {
            throw new RuntimeException("Upload failed with HTTP " + res.statusCode() + ": " + res.body());
        }
        return res.body();
    }

    /**
     * Gera uma URL temporária assinada com HMAC para download seguro de arquivo privado.
     */
    public String getSignedUrl(String key, int expiresInSeconds) throws IOException, InterruptedException {
        String payload = String.format("{\"key\":\"%s\",\"expiresInSeconds\":%d}", key, expiresInSeconds);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/signed-url"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 400) {
            throw new RuntimeException("Failed generating signed URL: " + res.body());
        }
        return res.body();
    }

    /**
     * Exclui um único arquivo do bucket R2.
     */
    public boolean delete(String key) throws IOException, InterruptedException {
        String cleanKey = key.replaceAll("^/+", "");
        String encoded = URLEncoder.encode(cleanKey, StandardCharsets.UTF_8).replace("+", "%20");

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/files/" + encoded))
                .header("X-API-Key", apiKey)
                .DELETE()
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        return res.statusCode() < 400;
    }

    /**
     * Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote).
     */
    public boolean deleteMany(List<String> keys) throws IOException, InterruptedException {
        StringBuilder sb = new StringBuilder("{\"keys\":[");
        for (int i = 0; i < keys.size(); i++) {
            sb.append("\"").append(keys.get(i).replace("\"", "\\\"")).append("\"");
            if (i < keys.size() - 1) sb.append(",");
        }
        sb.append("]}");

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/files/batch-delete"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(sb.toString(), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        return res.statusCode() < 400;
    }

    /**
     * Lista arquivos no bucket R2 com paginação.
     */
    public String list(Integer limit, String cursor, String prefix) throws IOException, InterruptedException {
        List<String> params = new ArrayList<>();
        if (limit != null) params.add("limit=" + limit);
        if (cursor != null) params.add("cursor=" + URLEncoder.encode(cursor, StandardCharsets.UTF_8));
        if (prefix != null) params.add("prefix=" + URLEncoder.encode(prefix, StandardCharsets.UTF_8));

        String url = baseUrl + "/api/files" + (params.isEmpty() ? "" : "?" + String.join("&", params));

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("X-API-Key", apiKey)
                .GET()
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 400) {
            throw new RuntimeException("List failed: " + res.body());
        }
        return res.body();
    }

    private byte[] buildMultipartBody(byte[] fileBytes, String fileName, UploadOptions options, String boundary) throws IOException {
        var baos = new java.io.ByteArrayOutputStream();
        String lineBreak = "\r\n";

        // Form field: file
        baos.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
        baos.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"" + lineBreak).getBytes(StandardCharsets.UTF_8));
        baos.write(("Content-Type: application/octet-stream" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
        baos.write(fileBytes);
        baos.write(lineBreak.getBytes(StandardCharsets.UTF_8));

        // Form field: folder
        if (options != null && options.folder != null) {
            baos.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write(("Content-Disposition: form-data; name=\"folder\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write((options.folder + lineBreak).getBytes(StandardCharsets.UTF_8));
        }

        // Form field: preserveName
        if (options != null && options.preserveName) {
            baos.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write(("Content-Disposition: form-data; name=\"preserveName\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write(("true" + lineBreak).getBytes(StandardCharsets.UTF_8));
        }

        // Form field: private
        if (options != null && options.isPrivate) {
            baos.write(("--" + boundary + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write(("Content-Disposition: form-data; name=\"private\"" + lineBreak + lineBreak).getBytes(StandardCharsets.UTF_8));
            baos.write(("true" + lineBreak).getBytes(StandardCharsets.UTF_8));
        }

        // End boundary
        baos.write(("--" + boundary + "--" + lineBreak).getBytes(StandardCharsets.UTF_8));
        return baos.toByteArray();
    }

    public static class UploadOptions {
        public String folder;
        public boolean preserveName;
        public String customName;
        public boolean isPrivate;

        public static UploadOptions builder() {
            return new UploadOptions();
        }

        public UploadOptions folder(String folder) {
            this.folder = folder;
            return this;
        }

        public UploadOptions preserveName(boolean preserve) {
            this.preserveName = preserve;
            return this;
        }

        public UploadOptions isPrivate(boolean priv) {
            this.isPrivate = priv;
            return this;
        }
    }
}
