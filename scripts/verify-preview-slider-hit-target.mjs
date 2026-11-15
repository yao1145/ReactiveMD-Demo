import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { openWorkbench, clickWorkbenchAction, replaceWorkbenchSource, viewModeButton } from './workbench-ui.mjs';

const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  await openWorkbench(page, process.env.DEMO_URL ?? 'http://127.0.0.1:5174');
  await clickWorkbenchAction(page, 'Show source');
  await replaceWorkbenchSource(page, [
    '<range-slider label="Observation interval" bind-start="rangeLow" bind-end="rangeHigh" initial-start="20" initial-end="80" min="0" max="100">',
    '<slider label="Lower slider" bind="lowerValue" initial="30" min="0" max="100">',
    ...Array.from({ length: 40 }, (_, index) => `Paragraph ${index}`),
  ].join('\n\n'));
  await viewModeButton(page, 'preview').click();
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  const start = page.getByRole('slider', { name: 'Observation interval Start', exact: true });
  const end = page.getByRole('slider', { name: 'Observation interval End', exact: true });
  const lower = page.getByRole('slider', { name: 'Lower slider', exact: true });
  await expect(start).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const scroller = document.querySelector('.editor-preview');
    scroller.scrollTop = 0;
    const thumb = document.querySelector('.local-range-slider [role="slider"]').getBoundingClientRect();
    const overlay = document.querySelector('.preview-overlay-actions').getBoundingClientRect();
    // Put the first slider into the sticky overlay's horizontal strip, as
    // happens naturally when reading or scrolling an interactive document.
    scroller.scrollTop = thumb.y + thumb.height / 2 - overlay.y - overlay.height / 2;
  });
  for (const [slider, direction] of [[start, 1], [end, -1], [lower, 1]]) {
    const box = await slider.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await expect(page.locator('.preview-overlay-actions')).toHaveCSS('opacity', '1');
    const hit = await slider.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { reachesSlider: target?.closest('[role="slider"]') === element, interceptedBy: target?.className };
    });
    assert.ok(hit.reachesSlider, `Slider pointer intercepted by ${hit.interceptedBy}`);
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await page.mouse.down();
    await page.mouse.move(x + direction * 60, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow'))).not.toBe(before);
  }
  // Track clicks must pass through the strip too, not only thumb drags.
  const track = page.locator('.local-range-slider [data-rmd-part="track"]');
  const trackBox = await track.boundingBox();
  const beforeClick = await start.getAttribute('aria-valuenow');
  await page.mouse.click(trackBox.x + trackBox.width * 0.1, trackBox.y + trackBox.height / 2);
  await expect(start).not.toHaveAttribute('aria-valuenow', beforeClick);
  const fullscreen = page.locator('.preview-fullscreen-toggle');
  await fullscreen.click();
  await expect.poll(() => page.locator('.pane-preview').evaluate(element => document.fullscreenElement === element || element.classList.contains('is-preview-fullscreen'))).toBe(true);
  await fullscreen.click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement || document.querySelector('.is-preview-fullscreen')))).toBe(false);
  console.log('PASS first-row range thumb drags, track clicks, lower slider and fullscreen action');
} finally {
  await browser.close();
}
