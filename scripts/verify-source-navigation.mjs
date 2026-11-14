import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { installEditorProbe } from './editor-probe.mjs';

const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
const baseURL = process.env.DEMO_URL ?? 'http://127.0.0.1:5173';
await mkdir('artifacts/source-navigation', { recursive: true });

// Public ranges address the raw document source. The demo normalizes imported
// example sources to LF before compiling, and CodeMirror stores LF, so raw
// offsets and view positions are the same number. Read the fixture the same way.
const exampleSource = readFileSync(new URL('../content/examples/local/showcase/sci-fi-theme.reactive.md', import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
function toViewOffset(_raw, offset) { return offset; }
function rawSlice(raw, range) {
  return raw.slice(range.start, range.end);
}

async function selection(page) {
  await installEditorProbe(page);
  return page.evaluate(() => {
    const editor = document.querySelector('#source-editor');
    if (!editor) return {start: -1, end: -1, value: '', focused: false};
    const snapshot = window.rmdEditorProbe.snapshot(editor);
    return {start: snapshot.start, end: snapshot.end, value: snapshot.value.slice(snapshot.start, snapshot.end), focused: editor === document.activeElement || editor.contains(document.activeElement)};
  });
}

try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Force a clean, known example so the raw-line-ending mapping is deterministic.
    await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
    await page.goto(`${baseURL}/?example=sci-fi-theme`);
    const preview = page.locator('.pane-preview');
    const source = page.locator('#source-editor');
    await expect(preview).toBeVisible();
    await expect(source).toBeHidden();

    const interpolation = preview.locator('.local-interpolation').first();
    await expect(interpolation).toBeVisible();
    // Preview mode is read-only for source navigation: no source ranges are
    // emitted and a click must not open the editor or select anything.
    await expect(preview.locator('[data-rmd-source-start]')).toHaveCount(0);
    await interpolation.click();
    await page.waitForTimeout(100);
    await expect(source).toBeHidden();
    await expect(preview).toBeVisible();
    const idle = await selection(page);
    expect(idle.focused).toBe(false);

    // Only split view exposes the preview-to-source link.
    if (width > 600) {
      await page.locator('.editor-status-bar button[data-editor-view-option="split"]').click();
      await expect(source).toBeVisible();
      // Read the range from a paragraph interpolation: control readouts are also
      // `.local-interpolation` spans and map to the component tag instead.
      const linked = preview.locator('.md-document p .local-interpolation').first();
      const sourceRange = await linked.evaluate((node) => ({
        start: Number(node.dataset.rmdSourceStart),
        end: Number(node.dataset.rmdSourceEnd),
        type: node.dataset.rmdSourceType,
      }));
      expect(sourceRange.type).toBe('interpolation');
      await linked.click();

      const expectedStart = toViewOffset(exampleSource, sourceRange.start);
      const expectedEnd = toViewOffset(exampleSource, sourceRange.end);
      await expect.poll(async () => (await selection(page)).start).toBe(expectedStart);
      const afterText = await selection(page);
      expect(afterText.end).toBe(expectedEnd);
      expect(afterText.value).toBe(rawSlice(exampleSource, sourceRange));
      expect(afterText.focused).toBe(true);

      // Clicking a control label targets the component tag, not its input.
      // The shipped slider renders its label as a `data-rmd-part` span, so
      // address the part rather than the native `label` element.
      const label = preview.locator('[data-rmd-component="slider"] [data-rmd-part="label"]').first();
      const labelRange = await label.evaluate((node) => {
        const target = node.closest('[data-rmd-source-start]');
        return {
          start: Number(target?.dataset.rmdSourceStart),
          end: Number(target?.dataset.rmdSourceEnd),
        };
      });
      await label.click();
      await expect.poll(async () => (await selection(page)).start).toBe(toViewOffset(exampleSource, labelRange.start));
      const labelSelection = await selection(page);
      expect(labelSelection.value).toBe(rawSlice(exampleSource, labelRange));
      expect(labelSelection.value).toContain('<slider');
      expect(labelSelection.value).toContain('bind="people"');

      // Dragging/filling the slider changes only the parameter.
      const before = await selection(page);
      await preview.locator('[data-rmd-component="slider"] input[type="range"]').first().fill('7');
      await page.waitForTimeout(50);
      const after = await selection(page);
      expect(after.start).toBe(before.start);
      expect(after.end).toBe(before.end);
      await expect(preview.locator('.md-slider-value')).toHaveText('7');
    } else {
      // Narrow layouts have no split mode, so source navigation stays off.
      await page.locator('[data-mobile-view-option="edit"]').click();
      await expect(source).toBeVisible();
      await expect(page.locator('[data-editor-view-option="split"]')).toHaveCount(0);
    }

    expect(errors).toEqual([]);
    await page.screenshot({ path: `artifacts/source-navigation/${width}.png`, fullPage: false });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('source navigation browser check passed');
