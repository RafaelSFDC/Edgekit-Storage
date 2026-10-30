import assert from 'node:assert';
import {
  generateStorageKey,
  generateSignedToken,
  verifySignedToken,
  generateSignedUploadToken,
  verifySignedUploadToken,
  buildPresignedUploadUrl,
  timingSafeEqualStr,
} from '../src/utils/keys';
import { isMimeAllowed, resolveMimeType } from '../src/utils/mime';
import { getCloudflareResizedUrl } from '../../../snippets/storage';
import app from '../src/index';

async function runTests() {
  console.log('🚀 Iniciando testes de validação do EdgeKit Storage API...');

  // 1. Teste de geração de Storage Key
  console.log('1. Testando geração de chaves (generateStorageKey)...');
  const key1 = generateStorageKey({ filename: 'profile.png' });
  assert.ok(key1.endsWith('.png'), 'A chave deve preservar a extensão');
  assert.ok(key1.includes('/'), 'A chave deve conter a partição de data YYYY/MM');

  const keyWithFolder = generateStorageKey({ filename: 'doc.pdf', folder: 'invoices' });
  assert.ok(keyWithFolder.startsWith('invoices/'), 'A chave deve ter o prefixo da pasta');
  assert.ok(keyWithFolder.endsWith('.pdf'));

  const privateKey = generateStorageKey({ filename: 'secret.txt', isPrivate: true });
  assert.ok(privateKey.startsWith('private/'), 'A chave privada deve ter prefixo private/');

  const customKey = generateStorageKey({ filename: 'original.jpg', customName: 'my-avatar.jpg' });
  assert.ok(customKey.endsWith('my-avatar.jpg'), 'A chave deve honrar customName');
  console.log('✅ Geração de storage keys validada!');

  // 2. Teste de Validação de MIME Type
  console.log('2. Testando resolução e verificação de MIME types...');
  assert.strictEqual(resolveMimeType('photo.jpg'), 'image/jpeg');
  assert.strictEqual(resolveMimeType('doc.pdf'), 'application/pdf');
  assert.strictEqual(resolveMimeType('video.mp4'), 'video/mp4');

  const allowedConfig = 'image/*,application/pdf';
  assert.strictEqual(isMimeAllowed('image/png', allowedConfig), true);
  assert.strictEqual(isMimeAllowed('image/jpeg', allowedConfig), true);
  assert.strictEqual(isMimeAllowed('application/pdf', allowedConfig), true);
  assert.strictEqual(isMimeAllowed('application/zip', allowedConfig), false);
  assert.strictEqual(isMimeAllowed('video/mp4', allowedConfig), false);
  assert.strictEqual(isMimeAllowed('video/mp4', '*'), true);
  console.log('✅ Resolução e validação de MIME types validada!');

  // 3. Teste de Assinatura e Verificação de URL Assinada (HMAC-SHA256)
  console.log('3. Testando tokens e verificação de URLs assinadas...');
  const secretKey = 'test-secret-key-123';
  const fileKey = 'private/documents/report.pdf';
  const expiresFuture = Math.floor(Date.now() / 1000) + 3600; // +1 hora
  const expiresPast = Math.floor(Date.now() / 1000) - 60; // -1 minuto

  const validToken = await generateSignedToken(fileKey, secretKey, expiresFuture);
  assert.strictEqual(typeof validToken, 'string');
  assert.strictEqual(validToken.length, 64);

  const isValid = await verifySignedToken(fileKey, secretKey, validToken, expiresFuture);
  assert.strictEqual(isValid, true, 'Token futuro com dados corretos deve ser válido');

  const isExpired = await verifySignedToken(fileKey, secretKey, validToken, expiresPast);
  assert.strictEqual(isExpired, false, 'Token expirado deve ser rejeitado');

  const isTampered = await verifySignedToken('private/other-file.pdf', secretKey, validToken, expiresFuture);
  assert.strictEqual(isTampered, false, 'Token para chave diferente deve ser rejeitado');
  console.log('✅ Assinatura e tokens temporários validados com segurança!');

  // 3.1. Teste de Tokens de Upload Pré-assinado (Presigned Upload Handshake)
  console.log('3.1. Testando tokens de upload pré-assinado (generateSignedUploadToken)...');
  const uploadKey = '2026/10/photo.jpg';
  const uploadToken = await generateSignedUploadToken(uploadKey, secretKey, expiresFuture);
  assert.strictEqual(typeof uploadToken, 'string');
  assert.strictEqual(uploadToken.length, 64);

  const isUploadValid = await verifySignedUploadToken(uploadKey, secretKey, uploadToken, expiresFuture);
  assert.strictEqual(isUploadValid, true, 'Token de upload futuro deve ser válido');

  const isUploadExpired = await verifySignedUploadToken(uploadKey, secretKey, uploadToken, expiresPast);
  assert.strictEqual(isUploadExpired, false, 'Token de upload expirado deve ser rejeitado');

  // Isolamento criptográfico: token de download NÃO deve ser válido como token de upload
  const isDownloadTokenAsUpload = await verifySignedUploadToken(uploadKey, secretKey, validToken, expiresFuture);
  assert.strictEqual(isDownloadTokenAsUpload, false, 'Token de download não pode ser usado para upload!');

  const presignedResult = await buildPresignedUploadUrl({
    key: uploadKey,
    secret: secretKey,
    requestUrl: 'https://storage.myapp.com/api/upload/presigned',
    expiresInSeconds: 600,
  });
  assert.ok(presignedResult.uploadUrl.includes('/upload/presigned/2026/10/photo.jpg'));
  assert.ok(presignedResult.uploadUrl.includes('token='));
  assert.ok(presignedResult.uploadUrl.includes('expires='));
  console.log('✅ Tokens e URLs de upload pré-assinado (Handshake) validados com sucesso!');

  // 3.2. Teste do gerador de URL Cloudflare Image Resizing
  console.log('3.2. Testando gerador de URL Cloudflare Image Resizing (getCloudflareResizedUrl)...');
  const sampleUrl = 'https://media.mysite.com/2026/10/banner.jpg';
  const cdnUrl = getCloudflareResizedUrl(sampleUrl, { width: 300, format: 'webp', quality: 80 });
  assert.strictEqual(cdnUrl, 'https://media.mysite.com/cdn-cgi/image/width=300,quality=80,format=webp/2026/10/banner.jpg');
  console.log('✅ URLs do Cloudflare Image Resizing formatadas com perfeição!');

  // 4. Teste de timingSafeEqualStr
  console.log('4. Testando comparação de tempo constante (timingSafeEqualStr)...');
  assert.strictEqual(timingSafeEqualStr('secret_key_123', 'secret_key_123'), true);
  assert.strictEqual(timingSafeEqualStr('secret_key_123', 'secret_key_999'), false);
  assert.strictEqual(timingSafeEqualStr('short', 'much_longer_string'), false);
  console.log('✅ Comparação em tempo constante validada!');

  // 5. Teste de rotas do Hono (Mock App fetch)
  console.log('5. Testando rotas públicas /health e /api via app.fetch...');
  const healthRes = await app.fetch(new Request('http://localhost/health'));
  assert.strictEqual(healthRes.status, 200);
  const healthJson: any = await healthRes.json();
  assert.strictEqual(healthJson.success, true);
  assert.strictEqual(healthJson.data.status, 'ok');

  const apiInfoRes = await app.fetch(new Request('http://localhost/api'));
  assert.strictEqual(apiInfoRes.status, 200);
  const apiInfoJson: any = await apiInfoRes.json();
  assert.strictEqual(apiInfoJson.success, true);
  assert.strictEqual(apiInfoJson.data.service, 'cloudflare-storage');
  console.log('✅ Rotas HTTP do Worker responderam com sucesso!');

  console.log('\n🎉 TODOS OS TESTES DO BACKEND PASSARAM COM SUCESSO!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do backend:', err);
  process.exit(1);
});
