import { expect, test } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder('شماره موبایل')).toBeVisible();
  await expect(page.locator('.ig-wordmark')).toBeVisible();
});
