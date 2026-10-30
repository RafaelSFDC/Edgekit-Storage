import { test, expect } from '@playwright/test';

const VALID_API_KEY = 'test-secret-api-key-12345';

test.describe('E2E Responsiveness, Theming & Accessibility', () => {
  test('theme toggle switches HTML dark class and persists', async ({ page }) => {
    await page.goto('/login');

    const themeBtn = page.getByLabel(/alternar tema|toggle theme/i);
    await expect(themeBtn).toBeVisible();

    const initialIsDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    // Toggle theme
    await themeBtn.click();
    const updatedIsDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(updatedIsDark).toBe(!initialIsDark);

    // Reload page to verify persistence
    await page.reload();
    const persistedIsDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(persistedIsDark).toBe(updatedIsDark);
  });

  test('language toggle updates interface between PT-BR and EN', async ({ page }) => {
    await page.goto('/login');

    // Matches strictly 'PT-BR' or 'EN' button, avoiding 'Entrar no Console'
    const langBtn = page.getByRole('button', { name: /^(PT-BR|EN)$/ });
    const initialText = await langBtn.innerText();

    await langBtn.click();
    const newText = await langBtn.innerText();
    expect(newText).not.toBe(initialText);
  });

  test('mobile viewport collapses sidebar into drawer navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    const desktopSidebar = page.locator('aside');
    if ((await desktopSidebar.count()) > 0) {
      await expect(desktopSidebar).not.toBeVisible();
    }
  });

  test('modal dialogs close on Escape key press (keyboard accessibility)', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/ek_/i).fill(VALID_API_KEY);
    await page.getByRole('button', { name: /entrar no console|sign in to console/i }).click();
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);

    await page.getByRole('link', { name: /arquivos|console/i }).first().click();
    await expect(page).toHaveURL(/.*\/console/);

    // Open upload dialog
    const uploadBtn = page.getByRole('button', { name: /enviar arquivo/i }).first();
    await uploadBtn.click();
    await expect(page.getByText(/upload de arquivos/i).first()).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.getByText(/upload de arquivos/i).first()).not.toBeVisible();
  });
});
