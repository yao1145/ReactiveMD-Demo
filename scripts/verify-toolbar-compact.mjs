import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { openWorkbench, clickWorkbenchAction, switchWorkbenchLanguage } from './workbench-ui.mjs';

const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
const failures = [];
await mkdir('artifacts', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openWorkbench(page, process.env.DEMO_URL ?? 'http://127.0.0.1:5173');
  await clickWorkbenchAction(page, 'Show source');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  const toolbar = page.locator('.editor-toolbar');
  await expect(toolbar).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  for (const language of ['en', 'zh']) {
    if (language === 'zh') await switchWorkbenchLanguage(page);
    for (const width of [320, 390, 640]) {
      await page.setViewportSize({ width, height: 844 });
      const heights = [];
      // The inspector switches the emulated device's primary pointer. Exercise
      // both states and restore touch without reloading the editor.
      for (const touch of [true, false, true]) {
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: 1 });
        await expect.poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(touch);
        const metrics = await toolbar.evaluate(element => {
          const box = element.getBoundingClientRect();
          const controls = [...element.querySelectorAll('[data-toolbar-id]')]
            .filter(button => button.getClientRects().length)
            .map(button => {
              const rect = button.getBoundingClientRect();
              const overflow = [...button.children].some(child => {
                if (!child.getClientRects().length) return false;
                const inner = child.getBoundingClientRect();
                return inner.left < rect.left - 1 || inner.right > rect.right + 1;
              });
              return { id: button.dataset.toolbarId, x: rect.x, y: rect.y, width: rect.width, height: rect.height, overflow };
            });
          return { height: box.height, controls, controlsOverflow: controls.some(button => button.x < box.left - 1 || button.x + button.width > box.right + 1), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        console.log(`${language} ${width}px ${touch ? 'touch' : 'mouse'}: toolbar ${metrics.height.toFixed(1)}px`);
        heights.push(metrics.height);
        try {
          assert.ok(metrics.height <= 39, `Toolbar height ${metrics.height} exceeds compact height`);
          assert.equal(metrics.pageOverflow, false, 'Page overflows horizontally');
          assert.equal(metrics.controlsOverflow, false, 'Controls overflow the toolbar');
          assert.deepEqual(metrics.controls.map(button => button.id), ['heading', 'bold', 'italic', 'list', 'insert', 'components', 'more']);
          assert.equal(new Set(metrics.controls.map(button => Math.round(button.y))).size, 1, 'Controls wrap');
          for (const button of metrics.controls) {
            assert.ok(Math.abs(button.height - 28) < 0.5, `${button.id} is not compact: ${button.height}`);
            assert.equal(button.overflow, false, `${button.id} content exceeds its button`);
          }
        } catch (error) {
          failures.push(`${language}/${width}/${touch ? 'touch' : 'mouse'}: ${error.message}`);
        }
      }
      if (new Set(heights).size !== 1) failures.push(`${language}/${width}: height changes with pointer: ${heights}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await toolbar.screenshot({ path: `artifacts/toolbar-compact-${language}.png` });
    const insert = page.locator('[data-toolbar-id="insert"]');
    await expect(insert.locator('.editor-toolbar-insert-label')).toBeHidden();
    await insert.tap();
    await expect(page.locator('.editor-toolbar-insert-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    const componentIcon = page.locator('.editor-toolbar-components-icon-compact');
    await expect(componentIcon).toBeVisible();
    // Both breakpoints use the same two-star artwork.
    assert.equal(await componentIcon.innerHTML(), await page.locator('.editor-toolbar-components-icon-full').innerHTML());
    await page.locator('[data-toolbar-id="components"]').tap();
    const menu = page.locator('.editor-toolbar-native-menu');
    await expect(menu).toBeVisible();
    const close = menu.locator('.editor-toolbar-close');
    assert.ok((await close.boundingBox()).height >= 43.5, 'Picker touch target shrank');
    await close.tap();
    await expect(menu).toHaveCount(0);
    await page.locator('[data-toolbar-id="heading"]').tap();
    await expect(page.locator('.editor-toolbar-heading-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-toolbar-id="more"]').tap();
    await expect(page.locator('.editor-toolbar-more-menu')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, [], 'Browser errors');
  assert.deepEqual(failures, [], 'Compact toolbar regressions');
  console.log('PASS compact toolbar at 320/390/640px, pointer switching, both languages and touch menus');
} finally {
  await browser.close();
}
