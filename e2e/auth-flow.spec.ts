import { test, expect } from '@playwright/test';

const VALID_API_KEY = 'test-secret-api-key-12345';
const INVALID_API_KEY = 'wrong-api-key-99999';

test.describe('E2E Authentication & Session Pipeline', () => {
  test('unauthenticated users accessing / are redirected to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText(/acessar edgekit storage|sign in/i)).toBeVisible();
    await expect(page.getByPlaceholder(/ek_/i)).toBeVisible();
  });

  test('submitting invalid API key shows error notification', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const input = page.getByPlaceholder(/ek_/i);
    await input.fill(INVALID_API_KEY);

    const submitBtn = page.getByRole('button', { name: /entrar no console|sign in to console/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect(page.getByText(/inválida|invalid/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('submitting valid API key establishes session and redirects to dashboard', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    const input = page.getByPlaceholder(/ek_/i);
    await input.fill(VALID_API_KEY);

    const submitBtn = page.getByRole('button', { name: /entrar no console|sign in to console/i });
    await submitBtn.click();

    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);
    await expect(page.getByText(/visão geral do cluster|cluster overview/i)).toBeVisible();

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'cf_storage_session');
    expect(sessionCookie).toBeDefined();

    await page.reload();
    await expect(page.getByText(/visão geral do cluster|cluster overview/i)).toBeVisible();
  });

  test('user can navigate to all protected dashboard tabs', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // Navigate to Console
    await page.getByRole('link', { name: /arquivos|console/i }).first().click();
    await expect(page).toHaveURL(/.*\/console/);
    await expect(page.getByRole('heading', { name: /console de arquivos/i })).toBeVisible();

    // Navigate to Webhooks
    await page.getByRole('link', { name: /webhooks/i }).first().click();
    await expect(page).toHaveURL(/.*\/webhooks/);
    await expect(page.getByRole('heading', { name: /webhooks/i })).toBeVisible();

    // Navigate to Snippets
    await page.getByRole('link', { name: /snippets/i }).first().click();
    await expect(page).toHaveURL(/.*\/snippets/);
  });

  test('sign out clears session and redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    // Open User Avatar Dropdown Menu in header
    const userMenuBtn = page.locator('button.rounded-full');
    await userMenuBtn.click();

    const signOutItem = page.getByRole('menuitem', { name: /finalizar sessão|sign out/i });
    await signOutItem.click();

    await expect(page).toHaveURL(/.*\/login/);
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
