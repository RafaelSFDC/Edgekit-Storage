import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const VALID_API_KEY = 'test-secret-api-key-12345';

test.describe('E2E Files Management Pipeline', () => {
  const tempFileName = `e2e-sample-${Date.now()}.png`;
  const tempFilePath = path.resolve(process.cwd(), tempFileName);

  test.beforeAll(() => {
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

  test('complete file lifecycle: upload, preview, and deletion', async ({ page }) => {
    // 1. Log in
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // 2. Navigate to Console
    await page.getByRole('link', { name: /arquivos|console/i }).first().click();
    await expect(page).toHaveURL(/.*\/console/);

    // 3. Open Upload Dialog
    const uploadBtn = page.getByRole('button', { name: /enviar arquivo/i }).first();
    await uploadBtn.click();
    await expect(page.getByText(/upload de arquivos/i).first()).toBeVisible();

    // 4. Attach file and set folder
    const fileChooserInput = page.locator('input[type="file"]');
    await fileChooserInput.setInputFiles(tempFilePath);

    const folderInput = page.getByPlaceholder(/ex: avatares/i);
    await folderInput.fill('e2e-folder');

    // 5. Submit upload
    const submitUpload = page.getByRole('button', { name: /enviar arquivo/i }).last();
    await expect(submitUpload).toBeEnabled();
    await submitUpload.click();

    // 6. Verify success toast and table contains the uploaded file row
    await expect(page.getByText(/upload de .* realizado com sucesso|concluído/i)).toBeVisible({ timeout: 8000 });
    const row = page.locator('tbody tr', { hasText: tempFileName });
    await expect(row).toBeVisible();

    // 7. Preview file
    await row.locator('span.font-medium').first().click();
    const previewDialog = page.locator('[data-slot="dialog-content"]');
    await expect(previewDialog).toBeVisible();
    await previewDialog.getByRole('button', { name: /fechar/i }).click();

    // 8. Delete file via row menu
    const actionsMenuBtn = row.getByRole('button').last();
    await actionsMenuBtn.click();

    const deleteMenuItem = page.getByRole('menuitem', { name: /excluir arquivo|delete/i });
    await deleteMenuItem.click();

    // 9. Confirm Delete in dialog
    await expect(page.getByText(/tem certeza de que deseja excluir/i)).toBeVisible();
    const confirmDeleteBtn = page.getByRole('button', { name: /excluir/i }).last();
    await confirmDeleteBtn.click();

    // 10. Verify file is removed from table
    await expect(page.getByText(/excluído com sucesso/i).first()).toBeVisible({ timeout: 6000 });
    await expect(row).not.toBeVisible();
  });
});
