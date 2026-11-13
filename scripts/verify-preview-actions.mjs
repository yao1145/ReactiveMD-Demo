import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { openWorkbench, switchWorkbenchLanguage } from './workbench-ui.mjs';

const baseURL = process.env.DEMO_URL ?? 'http://127.0.0.1:5174';
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
await mkdir('artifacts', { recursive: true });
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (fallback) await page.addInitScript(() => {
      HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen unavailable in fixture'));
    });
    await openWorkbench(page, baseURL);
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
    const title = page.locator('.mobile-doc-title');
    await expect(title).toHaveCSS('font-size', '16px');
    const newHeight = (await page.locator('.mobile-doc-bar').boundingBox()).height;
    const oldFont = await page.addStyleTag({ content: '.mobile-doc-title { font-size: 14px; }' });
    assert.equal((await page.locator('.mobile-doc-bar').boundingBox()).height, newHeight, 'Larger title changed header height');
    await oldFont.evaluate(element => element.remove());
    const pane = page.locator('.pane-preview');
    const reveal = page.locator('.preview-controls-reveal');
    const actions = page.locator('.preview-overlay-actions');
    const fullscreen = actions.locator('.preview-fullscreen-toggle');
    await expect(fullscreen).toHaveCount(1);
    for (const language of ['en', 'zh']) {
      if (language === 'zh') await switchWorkbenchLanguage(page);
      await expect(actions).toBeHidden();
      await expect(reveal).toHaveAccessibleName(language === 'en' ? 'Show preview actions' : '显示预览操作');
      // Tapping content does not reveal controls or prevent document interaction.
      await pane.tap({ position: { x: 30, y: 100 } });
      await expect(actions).toBeHidden();
      await reveal.tap();
      await expect(actions).toBeVisible();
      await expect(reveal).toHaveAttribute('aria-expanded', 'true');
      await expect(reveal).toHaveAccessibleName(language === 'en' ? 'Hide preview actions' : '隐藏预览操作');
      await pane.tap({ position: { x: 30, y: 100 } });
      await expect(actions).toBeVisible();
      // The blank space below the visible buttons toggles them off.
      await reveal.tap({ position: { x: 4, y: 52 } });
      await expect(actions).toBeHidden();
      await reveal.focus();
      await page.keyboard.press('Enter');
      await expect(actions).toBeVisible();
      await actions.locator('.preview-overlay-button').tap();
      await expect(page.locator('.workspace-sidebar')).toBeVisible();
      await page.locator('.sidebar-backdrop').tap({ position: { x: 380, y: 100 } });
      await expect(page.locator('.workspace-sidebar')).toBeHidden();
      await fullscreen.tap();
      await expect.poll(() => pane.evaluate(element => document.fullscreenElement === element || element.classList.contains('is-preview-fullscreen'))).toBe(true);
      if (fallback) await expect(pane).toHaveClass(/is-preview-fullscreen/);
      await reveal.tap({ position: { x: 4, y: 52 } });
      await expect(actions).toBeHidden();
      await reveal.tap();
      await expect(actions).toBeVisible();
      await fullscreen.tap();
      await expect.poll(() => pane.evaluate(element => document.fullscreenElement === element || element.classList.contains('is-preview-fullscreen'))).toBe(false);
      await reveal.tap({ position: { x: 4, y: 52 } });
      await expect(actions).toBeHidden();
      await page.locator('.editor-preview').screenshot({ path: `artifacts/preview-actions-${language}-${fallback ? 'fallback' : 'native'}-hidden.png` });
      await reveal.tap();
      await page.locator('.editor-preview').screenshot({ path: `artifacts/preview-actions-${language}-${fallback ? 'fallback' : 'native'}-shown.png` });
      await reveal.tap({ position: { x: 4, y: 52 } });
      console.log(`PASS mobile corner toggle, title height, sidebar, keyboard and ${fallback ? 'fallback' : 'native'} fullscreen (${language})`);
    }
    assert.deepEqual(errors, [], 'Browser errors');
    await page.close();
  }
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await openWorkbench(desktop, baseURL);
  await expect(desktop.locator('.preview-controls-reveal')).toBeHidden();
  await desktop.locator('.pane-preview').hover();
  await expect(desktop.locator('.preview-overlay-actions')).toHaveCSS('opacity', '1');
  console.log('PASS desktop hover controls');
} finally {
  await browser.close();
}
