import { expect, test } from '@playwright/test';

test.describe('mobile layout tokens', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('feed exposes z-index and viewport CSS vars on root', async ({ page }) => {
    await page.goto('/feed');
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        zNav: style.getPropertyValue('--z-nav').trim(),
        zOverlay: style.getPropertyValue('--z-overlay').trim(),
        composerStack: style.getPropertyValue('--composer-stack').trim(),
        chatComposerStack: style.getPropertyValue('--chat-composer-stack').trim(),
        vvHeight: style.getPropertyValue('--vv-height').trim(),
      };
    });

    expect(vars.zNav).toBe('40');
    expect(vars.zOverlay).toBe('50');
    expect(vars.composerStack).toBeTruthy();
    expect(vars.chatComposerStack).toBeTruthy();
    expect(vars.vvHeight).toBeTruthy();
  });

  test('bottom nav stacks above page content', async ({ page }) => {
    await page.goto('/feed');
    const nav = page.locator('nav[aria-label="ناوبری اصلی"]');
    await expect(nav).toBeVisible();

    const zIndex = await nav.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(zIndex)).toBeGreaterThanOrEqual(40);
  });

  test('page-enter animation does not use transform', async ({ page }) => {
    await page.goto('/feed');
    const usesTransform = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule instanceof CSSKeyframesRule && rule.name === 'page-enter') {
              for (const kf of Array.from(rule.cssRules)) {
                if (kf.cssText.includes('transform')) return true;
              }
            }
          }
        } catch {
          // Cross-origin stylesheets
        }
      }
      return false;
    });
    expect(usesTransform).toBe(false);
  });
});
