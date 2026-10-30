import { test, expect } from '@playwright/test';

const VALID_API_KEY = 'test-secret-api-key-12345';

test.describe('E2E Webhooks Management Pipeline', () => {
  const webhookName = `E2E Hook ${Date.now()}`;

  test('complete webhook lifecycle: create, ping test, deliveries log, and deletion', async ({
    page,
  }) => {
    // 1. Log in
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // 2. Navigate to Webhooks
    await page.getByRole('link', { name: /webhooks/i }).first().click();
    await expect(page).toHaveURL(/.*\/webhooks/);

    // 3. Open Create Dialog
    const addBtn = page.getByRole('button', { name: /novo webhook|add webhook/i }).first();
    await addBtn.click();
    await expect(page.getByText(/novo webhook/i).first()).toBeVisible();

    // 4. Fill fields
    await page.getByPlaceholder(/Ex: Backend da Loja/i).fill(webhookName);
    await page.getByPlaceholder(/https:\/\/seu-backend\.com/i).fill('https://httpbin.org/post');
    await page.getByPlaceholder(/Ex: private\/orders\//i).fill('invoices/');

    // 5. Submit
    const saveBtn = page.getByRole('button', { name: /salvar|save/i });
    await saveBtn.click();

    // 6. Verify webhook appears in list
    const hookCard = page.locator('div.rounded-xl', { hasText: webhookName }).first();
    await expect(hookCard).toBeVisible({ timeout: 6000 });
    await expect(hookCard.getByText('https://httpbin.org/post')).toBeVisible();

    // 7. Click Test Ping button
    const pingBtn = hookCard.getByTitle(/enviar ping de teste/i);
    await pingBtn.click();
    await expect(page.getByText(/enviando ping|sucesso|falha/i).first()).toBeVisible({ timeout: 8000 });

    // 8. Open Deliveries Dialog
    const deliveriesBtn = hookCard.getByTitle(/histórico de entregas/i);
    await deliveriesBtn.click();
    const deliveriesDialog = page.locator('[data-slot="dialog-content"]');
    await expect(deliveriesDialog).toBeVisible();
    await deliveriesDialog.getByRole('button', { name: /fechar/i }).click();

    // 9. Delete Webhook
    const deleteBtn = hookCard.getByTitle(/excluir/i);
    await deleteBtn.click();

    await expect(page.getByText(/tem certeza que deseja excluir este webhook/i)).toBeVisible();
    const confirmDeleteBtn = page.getByRole('button', { name: /excluir/i }).last();
    await confirmDeleteBtn.click();

    // 10. Verify card is removed
    await expect(page.getByText(webhookName)).not.toBeVisible({ timeout: 6000 });
  });
});
