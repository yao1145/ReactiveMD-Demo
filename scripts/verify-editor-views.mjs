import { openWorkbench, clickWorkbenchAction, expectEditorSource, switchWorkbenchLanguage } from './workbench-ui.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
const baseURL = process.env.DEMO_URL ?? 'http://127.0.0.1:5173';
await mkdir('artifacts/editor-views', { recursive: true });
try {
  for (const width of [1440, 390, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openWorkbench(page,baseURL);
    const bar = page.locator('.editor-status-bar');
    const mobileSwitch = page.locator('.mobile-view-switch');
    const compact = width <= 620;
    await expect(page.locator('.reactive-md-editor .editor-frame > .editor-status-bar')).toHaveCount(1);
    const source = page.locator('#source-editor');
    const preview = page.locator('.pane-preview');
    await expect(preview.locator('.pane-head')).toHaveCount(0);
    if (compact) {
      // The mobile document bar owns the switch; the editor footer with its
      // character count is not rendered on narrow screens.
      await expect(bar).toBeHidden();
      await expect(page.locator('.editor-status-count')).toBeHidden();
      await expect(mobileSwitch).toBeVisible();
      await expect(mobileSwitch.getByRole('button')).toHaveCount(2);
    } else {
      await expect(bar).toBeVisible();
      await expect(bar).toHaveAttribute('aria-label', 'Editor view');
      await expect(bar.getByRole('button')).toHaveCount(3);
    }
    const switchBar = compact ? mobileSwitch : bar;
    const mode = (name) => switchBar.getByRole('button', { name, exact: true });
    await expect(mode('Preview')).toHaveAttribute('aria-pressed', 'true');
    await mode('Edit').click();
    await expect(source).toBeVisible();
    await expect(preview).toBeHidden();
    await source.press('ControlOrMeta+A');
    await source.pressSequentially('中文😀');
    if (!compact) await expect(page.locator('.editor-status-count')).toHaveText('3 characters');
    await source.press('Control+End');
    await source.press('Tab');
    await mode(width > 600 ? 'Split' : 'Preview').click();
    await expect(preview).toBeVisible();
    if (width === 1440) {
      const a = await page.locator('.editor-shell').boundingBox();
      const b = await preview.boundingBox();
      expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    }
    await mode('Preview').click();
    await expect(source).toBeHidden();
    await expect(preview).toBeVisible();
    await mode('Edit').click();
    await expectEditorSource(source,'  中文😀');
    await source.focus();
    await source.press('Control+z');
    await expectEditorSource(source,'中文😀');
    await source.press('Escape');
    await source.press('Tab');
    await expect(page.locator('.editor-toolbar [tabindex="0"]')).toBeFocused();
    await expectEditorSource(source,'中文😀');
    await mode(width > 600 ? 'Split' : 'Preview').focus();
    await page.keyboard.press('Enter');
    await expect(mode(width > 600 ? 'Split' : 'Preview')).toHaveAttribute('aria-pressed', 'true');
    await expect(preview).toBeVisible();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
      await switchBar.scrollIntoViewIfNeeded();
      const box = await switchBar.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      for (const button of await switchBar.getByRole('button').all()) {
        const target = await button.boundingBox();
        expect(target.height).toBeGreaterThanOrEqual(compact ? 31 : 43.5);
        expect(target.width).toBeGreaterThanOrEqual(compact ? 44 : 43.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await switchBar.screenshot({ path: `artifacts/editor-views/bar-${width}-${theme}.png` });
    }
    // The rendered preview stays mounted across modes, retaining trial inputs.
    await clickWorkbenchAction(page, 'Restore example');
    const slider = preview.locator('input[type="range"]').first();
    await slider.fill('7');
    await mode('Edit').click();
    await mode('Preview').click();
    await expect(slider).toHaveValue('7');
    await switchWorkbenchLanguage(page);
    await expect(mode('编辑')).toBeVisible();
    if (width > 600) await expect(mode('并排')).toBeVisible();
    else await expect(mode('并排')).toHaveCount(0);
    await expect(mode('预览')).toBeVisible();
    await mode(width > 600 ? '并排' : '预览').click();
    await switchBar.screenshot({ path: `artifacts/editor-views/bar-${width}-zh-dark.png` });
    await page.locator('.editor-frame').screenshot({ path: `artifacts/editor-views/frame-${width}-zh-dark.png` });
    expect(errors).toEqual([]);
    await page.close();
    console.log(`PASS ${width}px view modes, count, retained state, keyboard, themes and bounds`);
  }
} finally {
  await browser.close();
}
