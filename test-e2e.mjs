import assert from 'node:assert';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8788';
const API_KEY = 'test-secret-api-key-12345';

async function runTests() {
  console.log('--- Starting EdgeKit Storage End-to-End Tests ---');

  // Test 1: Health check
  console.log('1. Testing GET /health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.strictEqual(healthJson.success, true);
  assert.strictEqual(healthJson.data.status, 'ok');
  console.log('   ✓ Health check passed');

  // Test 2: Upload without API key (Should be rejected)
  console.log('2. Testing POST /upload without API key...');
  const formUnauthorized = new FormData();
  formUnauthorized.append('file', new Blob(['fake image content'], { type: 'image/png' }), 'test.png');
  const unauthRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formUnauthorized,
  });
  assert.strictEqual(unauthRes.status, 401);
  console.log('   ✓ Unauthorized rejection passed (401)');

  // Test 3: Upload with wrong API key
  console.log('3. Testing POST /upload with invalid API key...');
  const wrongKeyRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': 'wrong-key' },
    body: formUnauthorized,
  });
  assert.strictEqual(wrongKeyRes.status, 401);
  console.log('   ✓ Invalid key rejection passed (401)');

  // Test 4: Auth Login with HttpOnly cookie
  console.log('4. Testing POST /api/auth/login (HttpOnly session cookie)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY }),
  });
  assert.strictEqual(loginRes.status, 200);
  const setCookieHeader = loginRes.headers.get('set-cookie');
  assert.ok(setCookieHeader, 'Set-Cookie header should be present');
  assert.ok(setCookieHeader.includes('cf_storage_session='), 'Cookie name should be cf_storage_session');
  assert.ok(setCookieHeader.toLowerCase().includes('httponly'), 'Cookie should be HttpOnly');
  console.log('   ✓ HttpOnly cookie received successfully');

  // Extract cookie value for subsequent test calls
  const cookieValue = setCookieHeader.split(';')[0];

  // Test 5: Verify auth with cookie on /api/auth/me
  console.log('5. Testing GET /api/auth/me with Cookie...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookieValue },
  });
  assert.strictEqual(meRes.status, 200);
  const meJson = await meRes.json();
  assert.strictEqual(meJson.data.authenticated, true);
  console.log('   ✓ Authentication verified via cookie');

  // Test 6: Upload with valid API key header
  console.log('6. Testing POST /upload with valid API key...');
  const sampleContent = 'Mock PNG binary content 1234567890';
  const formValid = new FormData();
  formValid.append('file', new Blob([sampleContent], { type: 'image/png' }), 'avatar.png');
  formValid.append('folder', 'test-folder');
  formValid.append('preserveName', 'true');

  const uploadRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: formValid,
  });
  assert.strictEqual(uploadRes.status, 201);
  const uploadJson = await uploadRes.json();
  assert.strictEqual(uploadJson.success, true);
  assert.ok(uploadJson.data.key.startsWith('test-folder/'));
  assert.ok(uploadJson.data.key.endsWith('_avatar.png'));
  assert.ok(uploadJson.data.url.includes(uploadJson.data.key));
  console.log('   ✓ Upload successful:', uploadJson.data.key, '->', uploadJson.data.url);

  const fileKey = uploadJson.data.key;

  // Test 7: Direct streaming fallback (GET /f/:key)
  console.log('7. Testing GET /f/:key stream fallback...');
  const getRes = await fetch(`${BASE_URL}/f/${fileKey}`);
  assert.strictEqual(getRes.status, 200);
  const downloadedText = await getRes.text();
  assert.strictEqual(downloadedText, sampleContent);
  assert.strictEqual(getRes.headers.get('content-type'), 'image/png');
  console.log('   ✓ File retrieved intact with correct Content-Type');

  // Test 8: List files using the HttpOnly cookie (no header!)
  console.log('8. Testing GET /api/files using Cookie (Dashboard flow)...');
  const listRes = await fetch(`${BASE_URL}/api/files?prefix=test-folder`, {
    headers: { 'Cookie': cookieValue },
  });
  assert.strictEqual(listRes.status, 200);
  const listJson = await listRes.json();
  assert.strictEqual(listJson.success, true);
  const found = listJson.data.objects.some((obj) => obj.key === fileKey);
  assert.ok(found, 'Uploaded file should be in listed objects via cookie auth');
  console.log('   ✓ File found in file listing using cookie auth');

  // Test 9: Private file upload & access
  console.log('9. Testing private upload and access...');
  const privateForm = new FormData();
  privateForm.append('file', new Blob(['Secret private document'], { type: 'application/pdf' }), 'secret.pdf');
  privateForm.append('private', 'true');
  const privUploadRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: privateForm,
  });
  assert.strictEqual(privUploadRes.status, 201);
  const privJson = await privUploadRes.json();
  const privKey = privJson.data.key;
  assert.ok(privKey.startsWith('private/'));

  // Attempt to access private file via public route (Must be 403 Forbidden)
  const publicAccessAttempt = await fetch(`${BASE_URL}/f/${privKey}`);
  assert.strictEqual(publicAccessAttempt.status, 403);
  console.log('   ✓ Public access to private file correctly forbidden (403)');

  // Access private file via /private/:key with Cookie
  const privateAccessRes = await fetch(`${BASE_URL}/private/${privKey}`, {
    headers: { 'Cookie': cookieValue },
  });
  assert.strictEqual(privateAccessRes.status, 200);
  const privText = await privateAccessRes.text();
  assert.strictEqual(privText, 'Secret private document');
  console.log('   ✓ Private file access with HttpOnly cookie verified');

  // Test 10: Generate Signed URL for private file
  console.log('10. Testing POST /api/signed-url (HMAC signed URL)...');
  const signedUrlRes = await fetch(`${BASE_URL}/api/signed-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ key: privKey, expiresInSeconds: 60 }),
  });
  assert.strictEqual(signedUrlRes.status, 200);
  const signedUrlJson = await signedUrlRes.json();
  assert.strictEqual(signedUrlJson.success, true);
  assert.ok(signedUrlJson.data.url.includes('?token='));
  assert.ok(signedUrlJson.data.url.includes('&expires='));
  console.log('    ✓ Signed URL generated successfully:', signedUrlJson.data.url);

  // Test 11: Access private file using Signed URL WITHOUT any API Key or Cookie
  console.log('11. Testing GET /private/:key with Signed URL (Zero Auth Headers/Cookies)...');
  const anonymousSignedAccessRes = await fetch(signedUrlJson.data.url);
  assert.strictEqual(anonymousSignedAccessRes.status, 200);
  const anonymousText = await anonymousSignedAccessRes.text();
  assert.strictEqual(anonymousText, 'Secret private document');
  console.log('    ✓ Private file accessed securely via Signed URL');

  // Test 12: Access with tampered signed URL token (Must be 403)
  console.log('12. Testing tampered Signed URL token rejection...');
  const tamperedUrl = signedUrlJson.data.url.replace(/token=[a-f0-9]{4}/, 'token=dead');
  const tamperedRes = await fetch(tamperedUrl);
  assert.strictEqual(tamperedRes.status, 403);
  console.log('    ✓ Tampered Signed URL correctly rejected with 403 Forbidden');

  // Test 13: Access with expired Signed URL timestamp (Must be 403)
  console.log('13. Testing expired Signed URL timestamp rejection...');
  const expiredUrl = signedUrlJson.data.url.replace(/expires=\d+/, 'expires=1000000000');
  const expiredRes = await fetch(expiredUrl);
  assert.strictEqual(expiredRes.status, 403);
  console.log('    ✓ Expired Signed URL correctly rejected with 403 Forbidden');

  // Test 14: Batch delete multiple files
  console.log('14. Testing POST /api/files/batch-delete...');
  // Upload a second file to delete together with privKey and fileKey
  const batchForm = new FormData();
  batchForm.append('file', new Blob(['Batch test 2'], { type: 'image/png' }), 'batch2.png');
  const batchUploadRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: batchForm,
  });
  const batchUploadJson = await batchUploadRes.json();
  const fileKey2 = batchUploadJson.data.key;

  const batchDelRes = await fetch(`${BASE_URL}/api/files/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ keys: [fileKey, privKey, fileKey2] }),
  });
  assert.strictEqual(batchDelRes.status, 200);
  const batchDelJson = await batchDelRes.json();
  assert.strictEqual(batchDelJson.success, true);
  assert.strictEqual(batchDelJson.data.count, 3);
  console.log('    ✓ Batch delete deleted 3 files simultaneously');

  // Test 15: Verify 404 after batch deletion
  console.log('15. Verifying GET after batch deletion...');
  const afterDelRes = await fetch(`${BASE_URL}/f/${fileKey}`);
  assert.strictEqual(afterDelRes.status, 404);
  console.log('    ✓ Deleted file returns 404');

  // Test 16: Logout
  console.log('16. Testing POST /api/auth/logout...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });
  assert.strictEqual(logoutRes.status, 200);
  const logoutCookie = logoutRes.headers.get('set-cookie');
  assert.ok(logoutCookie.includes('Max-Age=0') || logoutCookie.includes('cf_storage_session=;'), 'Cookie should be deleted on logout');
  console.log('    ✓ Logout cleared the session cookie');

  console.log('\n🎉 ALL 16 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
