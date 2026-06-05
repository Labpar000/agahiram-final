import { expect, test } from '@playwright/test';

test('feed page loads', async ({ page }) => {
  const response = await page.goto('/feed');
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();
});
