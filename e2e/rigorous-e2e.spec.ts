import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const VALID_API_KEY = 'test-secret-api-key-12345';
const API_URL = 'http://127.0.0.1:8787';

test.describe('Rigorous E2E Integrity, Storage State & Network Failure Pipeline', () => {
  const tempFileName = `audit-sample-${Date.now()}.png`;
  const tempFilePath = path.resolve(process.cwd(), tempFileName);

  test.beforeAll(() => {
    // 1x1 transparent PNG
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(tempFilePath, dummyPng);
  });

  test.afterAll(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  test('E2E File Lifecycle with DIRECT BACKEND STORAGE VALIDATION (Section 5 Requirement)', async ({
    page,
    request,
  }) => {
    // 1. Log in via UI
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // 2. Navigate to Console
    await page.getByRole('link', { name: /arquivos|console/i }).first().click();
    await expect(page).toHaveURL(/.*\/console/);

    // 3. Upload file via Dialog
    await page.getByRole('button', { name: /enviar arquivo/i }).first().click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    const folderInput = page.getByPlaceholder(/ex: avatares/i);
    await folderInput.fill('audit-vault');

    const submitBtn = page.getByRole('button', { name: /enviar arquivo/i }).last();
    await submitBtn.click();

    // 4. Verify Toast in UI
    await expect(page.getByText(/upload de .* realizado com sucesso|concluído/i)).toBeVisible({ timeout: 8000 });
    const row = page.locator('tbody tr', { hasText: tempFileName });
    await expect(row).toBeVisible();

    // 5. DIRECT BACKEND STATE VALIDATION: Check Cloudflare R2 via API
    // List files to find exact storage key
    const listRes = await request.get(`${API_URL}/api/files?prefix=audit-vault`, {
      headers: { 'X-API-Key': VALID_API_KEY },
    });
    expect(listRes.status()).toBe(200);
    const listJson = await listRes.json();
    const uploadedObj = listJson.data.objects.find((o: any) => o.key.includes(tempFileName));
    expect(uploadedObj).toBeDefined();
    const realStorageKey = uploadedObj.key;

    // Verify metadata directly from R2
    const metaRes = await request.get(`${API_URL}/api/files/${realStorageKey}/meta`, {
      headers: { 'X-API-Key': VALID_API_KEY },
    });
    expect(metaRes.status()).toBe(200);
    const metaJson = await metaRes.json();
    expect(metaJson.data.key).toBe(realStorageKey);

    // 6. Delete file via UI Actions Menu
    const actionsMenuBtn = row.getByRole('button').last();
    await actionsMenuBtn.click();
    const deleteMenuItem = page.getByRole('menuitem', { name: /excluir arquivo|delete/i });
    await deleteMenuItem.click();

    const confirmDeleteBtn = page.getByRole('button', { name: /excluir/i }).last();
    await confirmDeleteBtn.click();

    await expect(page.getByText(/excluído com sucesso/i).first()).toBeVisible({ timeout: 6000 });
    await expect(row).not.toBeVisible();

    // 7. DIRECT BACKEND CONFIRMATION: Verify the object is TRULY deleted from R2
    const postDeleteMetaRes = await request.get(`${API_URL}/api/files/${realStorageKey}/meta`, {
      headers: { 'X-API-Key': VALID_API_KEY },
    });
    expect(postDeleteMetaRes.status()).toBe(404);
  });

  test('E2E Session Invalidation: Clearing session cookie immediately forces redirect on next action', async ({
    page,
  }) => {
    // 1. Log in
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // 2. Clear all cookies (simulate session expiration or revoke)
    await page.context().clearCookies();

    // 3. Navigate to /webhooks tab
    await page.goto('/webhooks');

    // 4. Auth guard should reject and bounce to /login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('E2E Real Browser Network Failure & Error Boundary during Upload', async ({ page }) => {
    // 1. Log in
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();

    // 2. Go to Console
    await page.getByRole('link', { name: /arquivos|console/i }).first().click();

    // 3. Intercept upload endpoint to simulate Cloudflare 500 error
    await page.route('**/upload', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Cloudflare Worker Storage Engine Down (500 Internal)' },
        }),
      });
    });

    // 4. Try upload
    await page.getByRole('button', { name: /enviar arquivo/i }).first().click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempFilePath);

    const submitBtn = page.getByRole('button', { name: /enviar arquivo/i }).last();
    await submitBtn.click();

    // 5. Verify error notification appears
    await expect(
      page.getByText(/erro durante o upload|storage engine down|falha/i).first()
    ).toBeVisible({ timeout: 6000 });

    // 6. Verify submit button re-enables (no freeze)
    await expect(submitBtn).toBeEnabled();
  });
});
