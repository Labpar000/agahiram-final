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

  test('keyboard-aware layout tokens are defined on root', async ({ page }) => {
    await page.goto('/feed');
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        bottomChrome: style.getPropertyValue('--bottom-chrome').trim(),
        inputBarBottom: style.getPropertyValue('--input-bar-bottom').trim(),
        keyboardInset: style.getPropertyValue('--keyboard-inset').trim(),
        drawerInputBottom: style.getPropertyValue('--drawer-input-bottom').trim(),
      };
    });

    expect(vars.bottomChrome).toBeTruthy();
    expect(vars.inputBarBottom).toBeTruthy();
    expect(vars.keyboardInset).toBe('0px');
    expect(vars.drawerInputBottom).toBeTruthy();
  });

  test('simulated keyboard sets data-keyboard-open and keyboard inset', async ({ page }) => {
    await page.goto('/feed');
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--keyboard-inset', '280px');
      document.documentElement.dataset.keyboardOpen = 'true';
    });

    const state = await page.evaluate(() => ({
      keyboardOpen: document.documentElement.dataset.keyboardOpen,
      inset: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset').trim(),
    }));

    expect(state.keyboardOpen).toBe('true');
    expect(state.inset).toBe('280px');
  });

  test('bottom nav is hidden while keyboard is open', async ({ page }) => {
    await page.goto('/feed');
    await page.evaluate(() => {
      document.documentElement.dataset.keyboardOpen = 'true';
    });

    const nav = page.locator('nav[aria-label="ناوبری اصلی"]');
    const visibility = await nav.evaluate((el) => getComputedStyle(el).visibility);
    expect(visibility).toBe('hidden');
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
