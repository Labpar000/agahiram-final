import { expect, test } from '@playwright/test';

test.describe('explore search', () => {
  test('explore tab loads and shows search input', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByRole('searchbox', { name: 'جستجو' })).toBeVisible();
  });

  test('typing query updates URL after debounce', async ({ page }) => {
    await page.goto('/explore');
    const input = page.getByRole('searchbox', { name: 'جستجو' });
    await input.fill('test');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/[?&]q=test/);
  });

  test('deep link with category filter renders filter badge area', async ({ page }) => {
    await page.goto(
      '/explore?categoryId=550e8400-e29b-41d4-a716-446655440000&categoryName=%D8%A7%D9%84%DA%A9%D8%AA%D8%B1%D9%88%D9%86%DB%8C%DA%A9',
    );
    await expect(page.getByRole('searchbox', { name: 'جستجو' })).toBeVisible();
    await expect(page.getByText('الکترونیک')).toBeVisible();
  });

  test('filter sheet opens from explore header', async ({ page }) => {
    await page.goto('/explore');
    await page.getByRole('button', { name: /فیلترها/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('browser back restores previous query', async ({ page }) => {
    await page.goto('/explore');
    const input = page.getByRole('searchbox', { name: 'جستجو' });
    await input.fill('first');
    await page.waitForTimeout(500);
    await input.fill('second');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/[?&]q=second/);
    await page.goBack();
    await expect(page).toHaveURL(/[?&]q=first/);
  });

  test('browser forward restores newer query', async ({ page }) => {
    await page.goto('/explore');
    const input = page.getByRole('searchbox', { name: 'جستجو' });
    await input.fill('alpha');
    await page.waitForTimeout(500);
    await input.fill('beta');
    await page.waitForTimeout(500);
    await page.goBack();
    await page.waitForTimeout(300);
    await page.goForward();
    await expect(page).toHaveURL(/[?&]q=beta/);
  });
});
