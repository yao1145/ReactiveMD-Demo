import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'artifacts', 'themed-elements');
await mkdir(artifacts, { recursive: true });
const port = 5189;
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    watch: { ignored: ['**/artifacts/**'] },
  },
});
await server.listen();
const baseURL = `http://127.0.0.1:${port}`;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';

const LAB_DOC = '#lab-card .md-document';
const GAME_DOC = '#games-card .md-document';

const checks = [];
const failures = [];
const errors = [];

async function check(name, action) {
  try {
    await action();
    checks.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error instanceof Error ? error.message : String(error) });
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function style(page, selector, property) {
  return page.locator(selector).first().evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

function tokenColor(page, documentSelector, token) {
  return page.evaluate(({ documentSelector, token }) => {
    const host = document.querySelector(documentSelector);
    if (!host) throw new Error(`Missing document root ${documentSelector}`);
    const probe = document.createElement('span');
    probe.style.cssText = 'position: absolute; visibility: hidden;';
    probe.style.color = `var(${token})`;
    host.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, { documentSelector, token });
}

async function appendSharedCssLast(page) {
  const css = await page.evaluate(() => {
    const harness = window.__controlsHarness;
    if (!harness) throw new Error('Missing controls harness');
    return harness.sharedCss;
  });
  await page.evaluate(text => {
    document.getElementById('late-shared-css')?.remove();
    const element = document.createElement('style');
    element.id = 'late-shared-css';
    element.textContent = text;
    document.body.append(element);
  }, css);
}

async function removeLateSharedCss(page) {
  await page.evaluate(() => document.getElementById('late-shared-css')?.remove());
}

async function tabTo(page, id) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < 120; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.id ?? '');
    if (active === id) return;
  }
  throw new Error(`Could not reach #${id} with Tab`);
}

let browser;
let status = 'failed';
try {
  browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.startsWith('Failed to load resource')) return;
    if (text.includes('useLayoutEffect does nothing on the server')) return;
    errors.push(text);
  });
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== '/favicon.ico') {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseURL}/controls.html`, { waitUntil: 'domcontentloaded' });
  await page.locator(LAB_DOC).waitFor();
  await page.locator(GAME_DOC).waitFor();
  await page.locator('#lab-plain').waitFor();
  await page.locator('[data-controls-examples]').waitFor();
  await page.locator('[data-tetris]').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await check('two documents keep independent themes and the new examples render', async () => {
    expect(await page.locator('.md-document').count()).toBe(2);
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-rmd-theme', 'forest');
    await expect(page.locator(GAME_DOC)).toHaveAttribute('data-rmd-theme', 'default');
    expect(await page.locator(LAB_DOC).getAttribute('data-color-scheme')).toBe('light');
    expect(await page.locator(GAME_DOC).getAttribute('data-color-scheme')).toBe('dark');
    expect(await page.locator('#lab-card [data-controls-examples]').count()).toBe(1);
    await expect(page.locator('#ex-text')).toBeVisible();
    await expect(page.locator('.md-tablist')).toBeVisible();
  });

  await check('native fields accept typed, numeric, date, textarea and select input', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const line = await tokenColor(page, LAB_DOC, '--line-strong');
    expect(await style(page, '#ex-text', 'background-color')).toBe(surface);
    expect(await style(page, '#ex-select', 'border-top-color')).toBe(line);
    await page.locator('#ex-text').fill('Edited field value');
    await expect(page.locator('#ex-text')).toHaveValue('Edited field value');

    await page.locator('#ex-number').fill('7');
    expect(await page.locator('#ex-number').evaluate(element => element.value)).toBe('7');

    await page.locator('#ex-date').fill('2026-12-01');
    await expect(page.locator('#ex-date')).toHaveValue('2026-12-01');

    await page.locator('#ex-textarea').fill('Edited note value');
    await expect(page.locator('#ex-textarea')).toHaveValue('Edited note value');

    await page.locator('#ex-select').selectOption('gamma');
    await expect(page.locator('#ex-select')).toHaveValue('gamma');

    await page.locator('#ex-select-multiple').selectOption(['alpha', 'beta']);
    expect(await page.locator('#ex-select-multiple').evaluate(element => Array.from(element.selectedOptions, option => option.value))).toEqual(['alpha', 'beta']);
  });

  await check('read-only, disabled and invalid fields keep native semantics', async () => {
    expect(await page.locator('#ex-readonly').evaluate(element => element.readOnly)).toBe(true);
    await page.locator('#ex-readonly').focus();
    const readOnlyBefore = await page.locator('#ex-readonly').inputValue();
    await page.keyboard.press('a');
    expect(await page.locator('#ex-readonly').inputValue()).toBe(readOnlyBefore);

    await expect(page.locator('#ex-disabled')).toBeDisabled();
    await expect(page.locator('#ex-invalid')).toHaveAttribute('aria-invalid', 'true');
    expect(await page.locator('#ex-invalid').evaluate(element => element.matches(':invalid'))).toBe(true);
    await expect(page.locator('#ex-invalid-error')).toBeVisible();
    await expect(page.locator('#ex-invalid-error')).toHaveText('Enter a value before continuing.');
    await page.locator('#ex-invalid').focus();
    expect(await style(page, '#ex-invalid', 'border-top-color')).toBe(await tokenColor(page, LAB_DOC, '--danger'));
    expect(Number(await style(page, '#ex-disabled', 'opacity'))).toBeLessThan(1);
  });

  await check('checkbox, radio and native switch preserve their semantics', async () => {
    await expect(page.locator('#ex-checkbox')).toBeChecked();
    await page.locator('#ex-checkbox').uncheck();
    await expect(page.locator('#ex-checkbox')).not.toBeChecked();
    await page.locator('#ex-checkbox').check();
    await expect(page.locator('#ex-checkbox')).toBeChecked();

    await expect(page.locator('#ex-radio-compact')).toBeChecked();
    await page.locator('#ex-radio-comfortable').check();
    await expect(page.locator('#ex-radio-comfortable')).toBeChecked();
    await expect(page.locator('#ex-radio-compact')).not.toBeChecked();

    await expect(page.locator('#ex-switch')).toHaveAttribute('role', 'switch');
    await expect(page.locator('#ex-switch')).toBeChecked();
    await page.locator('#ex-switch').click();
    await expect(page.locator('#ex-switch')).not.toBeChecked();
    await page.locator('#ex-switch').click();
    await expect(page.locator('#ex-switch')).toBeChecked();
  });

  await check('range, progress and meter keep native values and bounds', async () => {
    await page.locator('#ex-range').focus();
    await page.keyboard.press('End');
    expect(await page.locator('#ex-range').evaluate(element => element.value)).toBe('100');
    await expect(page.locator('#ex-range-output')).toHaveText('100');
    expect(Number(await page.locator('#ex-progress').evaluate(element => element.value))).toBe(100);
    await page.keyboard.press('Home');
    expect(await page.locator('#ex-range').evaluate(element => element.value)).toBe('0');
    await expect(page.locator('#ex-range-output')).toHaveText('0');

    const meter = page.locator('#ex-meter');
    expect(await meter.evaluate(element => element.value)).toBe(64);
    await expect(meter).toHaveAttribute('low', '33');
    await expect(meter).toHaveAttribute('high', '66');
    await expect(meter).toHaveAttribute('optimum', '84');
  });

  await check('details toggles through its native summary', async () => {
    const details = page.locator('#ex-details');
    expect(await details.evaluate(element => element.open)).toBe(false);
    await details.locator('summary').click();
    expect(await details.evaluate(element => element.open)).toBe(true);
    await expect(page.locator('.md-disclosure-panel')).toBeVisible();
    await details.locator('summary').click();
    expect(await details.evaluate(element => element.open)).toBe(false);
  });

  await check('native dialog opens with showModal and closes with Escape', async () => {
    const dialog = page.locator('#ex-dialog');
    await page.locator('#ex-dialog-open').click();
    await expect(dialog).toHaveJSProperty('open', true);
    await expect(dialog).toBeVisible();
    await expect(page.locator('#ex-dialog-title')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect.poll(async () => dialog.evaluate(element => element.open)).toBe(false);
    await expect(dialog).toBeHidden();
  });

  await check('native popover opens from popoverTarget and light-dismisses', async () => {
    const popover = page.locator('#ex-popover');
    await page.locator('#ex-popover-trigger').click();
    expect(await popover.evaluate(element => element.matches(':popover-open'))).toBe(true);
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect.poll(async () => popover.evaluate(element => element.matches(':popover-open'))).toBe(false);
  });

  await check('tabs support arrows, Home, End and ARIA state', async () => {
    await page.locator('#ex-tab-0').focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('ex-tab-1');
    await expect(page.locator('#ex-tab-1')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ex-tab-1')).toHaveAttribute('tabindex', '0');
    await expect(page.locator('#ex-tab-0')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#ex-tabpanel-1')).toBeVisible();
    await expect(page.locator('#ex-tabpanel-0')).toBeHidden();

    await page.keyboard.press('End');
    await expect(page.locator('#ex-tab-2')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ex-tabpanel-2')).toBeVisible();

    await page.keyboard.press('Home');
    await expect(page.locator('#ex-tab-0')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#ex-tab-2')).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('ex-tab-2');
  });

  await check('feedback, striped table selection and chart hooks render', async () => {
    for (const variant of ['neutral', 'success', 'warning', 'danger', 'info']) {
      await expect(page.locator(`${LAB_DOC} .md-badge-${variant}`)).toBeVisible();
    }
    for (const variant of ['success', 'warning', 'danger', 'info']) {
      await expect(page.locator(`.md-alert-${variant}:not([data-rmd-appearance="custom"])`)).toBeVisible();
      await expect(page.locator(`.md-status-${variant}`)).toBeVisible();
    }
    await expect(page.locator('.md-empty-state')).toBeVisible();
    await expect(page.locator('.md-spinner').first()).toBeVisible();
    await expect(page.locator('.md-skeleton')).toBeVisible();

    const table = page.locator('.md-table-striped');
    await expect(table).toBeVisible();
    await expect(page.locator('#ex-row-b')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ex-row-a')).toHaveAttribute('aria-selected', 'false');
    await page.locator('#ex-row-a-check').click();
    await expect(page.locator('#ex-row-a')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ex-row-a')).toHaveAttribute('data-state', 'selected');

    const chart = page.locator('.md-chart');
    await expect(chart).toBeVisible();
    expect(await page.locator('.md-chart-axis').count()).toBeGreaterThan(0);
    expect(await page.locator('.md-chart-grid line').count()).toBeGreaterThan(0);
    expect(await page.locator('.md-chart-legend').count()).toBe(1);
    expect(await page.locator('.md-chart-node').count()).toBeGreaterThan(0);
    expect(await page.locator('.md-chart-edge').count()).toBeGreaterThan(0);
    expect(await page.locator('.md-chart-series-line').count()).toBe(2);
    expect(await page.locator('.md-chart-series-area').count()).toBe(1);
    expect(await page.locator('.md-chart [data-series="1"]').count()).toBeGreaterThan(0);
    expect(await page.locator('.md-chart [data-series="8"]').count()).toBeGreaterThan(0);
    expect(await style(page, '.md-chart-series-line[data-series="1"]', 'stroke')).toBe(await tokenColor(page, LAB_DOC, '--chart-1'));
    expect(await style(page, '.md-chart-series-area', 'fill')).toBe(await tokenColor(page, LAB_DOC, '--chart-3'));
    expect(await style(page, '.md-chart-axis text', 'fill')).toBe(await tokenColor(page, LAB_DOC, '--chart-axis'));
    await page.getByRole('menuitem', { name: 'Rename', exact: true }).focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ex-menu-result')).toHaveText('Delete selected');
  });

  await check('ordinary local overrides and custom opt-out behave in both CSS orders', async () => {
    const success = await tokenColor(page, LAB_DOC, '--success');
    const accentText = await tokenColor(page, LAB_DOC, '--accent-text');

    expect(await style(page, '#ex-override-card', 'border-top-color')).toBe(success);
    expect(Math.abs(parseFloat(await style(page, '#ex-override-field', 'border-left-width')) - 3)).toBeLessThan(0.5);
    expect(await style(page, '#ex-custom-alert', 'background-color')).toBe('rgb(22, 35, 58)');
    expect(await style(page, '#ex-custom-alert', 'margin-top')).toBe('0px');
    expect(await style(page, '#ex-custom-alert', 'border-top-color')).toBe(success);
    await expect(page.locator('#ex-custom-alert')).toHaveAttribute('data-rmd-appearance', 'custom');
    expect(await style(page, '#ex-custom-token', 'color')).toBe(accentText);

    await appendSharedCssLast(page);
    try {
      expect(await style(page, '#ex-override-card', 'border-top-color')).toBe(success);
      expect(Math.abs(parseFloat(await style(page, '#ex-override-field', 'border-left-width')) - 3)).toBeLessThan(0.5);
      expect(await style(page, '#ex-custom-alert', 'background-color')).toBe('rgb(22, 35, 58)');
      expect(await style(page, '#ex-custom-token', 'color')).toBe(accentText);
    } finally {
      await removeLateSharedCss(page);
    }
  });

  await check('density selector sets the host document attribute', async () => {
    const comfortableHeight = parseFloat(await style(page, '#ex-text', 'height'));
    const comfortablePadding = parseFloat(await style(page, '#ex-row-c td', 'padding-left'));
    await page.locator('#density-select').selectOption('compact');
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-rmd-density', 'compact');
    await expect(page.locator('#ex-text')).toBeVisible();
    expect(parseFloat(await style(page, '#ex-text', 'height'))).toBeLessThan(comfortableHeight);
    expect(parseFloat(await style(page, '#ex-row-c td', 'padding-left'))).toBeLessThan(comfortablePadding);
    await page.locator('#density-select').selectOption('comfortable');
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-rmd-density', 'comfortable');
  });

  await check('unclassed native fields and hidden public elements retain their contracts', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    await page.locator(LAB_DOC).evaluate(root => {
      const probe = document.createElement('div');
      probe.id = 'contract-probe';
      probe.innerHTML = '<input id="unclassed-field" value="Native">'
        + '<input id="custom-field" data-rmd-appearance="custom">'
        + '<div class="md-card" hidden></div><span class="md-error" hidden>Error</span>'
        + '<div class="md-chart" hidden></div><div class="md-chart-legend" hidden></div>'
        + '<dialog class="md-dialog">Closed</dialog><div class="md-popover" popover>Closed</div>';
      root.append(probe);
    });
    try {
      expect(await style(page, '#unclassed-field', 'background-color')).toBe(surface);
      expect(await style(page, '#custom-field', 'height')).not.toBe(await style(page, '#unclassed-field', 'height'));
      for (const item of await page.locator('#contract-probe [hidden], #contract-probe dialog, #contract-probe [popover]').all()) {
        await expect(item).toBeHidden();
      }
    } finally { await page.locator('#contract-probe').evaluate(element => element.remove()); }
  });

  await check('theme switching stays inside its document', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    expect(await style(page, '#outside-button', 'background-color')).not.toBe(surface);

    await page.locator('#toggle-lab').click();
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-color-scheme', 'dark');
    const darkSurface = await tokenColor(page, LAB_DOC, '--surface');
    expect(darkSurface).not.toBe(surface);
    expect(await style(page, '#lab-plain', 'background-color')).toBe(darkSurface);
    expect(await style(page, '#ex-custom-alert', 'background-color')).toBe('rgb(22, 35, 58)');
    await expect(page.locator(GAME_DOC)).toHaveAttribute('data-color-scheme', 'dark');
    await expect(page.locator('#ex-text')).toHaveValue('Edited field value');

    await page.locator('#toggle-lab').click();
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-color-scheme', 'light');
    await page.locator('#toggle-games').click();
    await expect(page.locator(GAME_DOC)).toHaveAttribute('data-color-scheme', 'light');
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-color-scheme', 'light');
    await expect(page.locator('#games-card [data-tetris-cell]')).toHaveCount(200);
    await page.locator('#toggle-games').click();
    await expect(page.locator(GAME_DOC)).toHaveAttribute('data-color-scheme', 'dark');
  });

  await check('375px stacks both documents without horizontal overflow', async () => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(80);
    const boxes = await page.evaluate(() => ['lab-card', 'games-card'].map(id => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`Missing #${id}`);
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, width: box.width };
    }));
    expect(boxes[1].top).toBeGreaterThanOrEqual(boxes[0].bottom - 1);
    expect(boxes.every(box => box.width <= 375)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('#ex-text')).toBeVisible();
    await expect(page.locator('.md-chart')).toBeVisible();
    await page.screenshot({ path: path.join(artifacts, 'controls-elements-375.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  await check('printing retains external field values and built-in summaries', async () => {
    const printCss = await page.evaluate(() => window.__controlsHarness.printCss);
    const printStyle = await page.addStyleTag({ content: printCss });
    try {
      await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
      await expect(page.locator('#ex-text')).toBeVisible();
      await expect(page.locator('#ex-text')).toHaveValue('Edited field value');
      await expect(page.locator('#ex-textarea')).toBeVisible();
      await expect(page.locator('#ex-select')).toBeVisible();
      expect(await page.locator('#lab-card .local-print-value:visible').count()).toBeGreaterThan(0);
      expect(await style(page, '.md-spinner', 'animation-name')).toBe('none');
    } finally {
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
      await printStyle.evaluate(element => element.remove());
    }
  });

  await check('SSR pre-hydration page shows new examples without scripts', async () => {
    const html = await page.evaluate(() => {
      const harness = window.__controlsHarness;
      if (!harness) throw new Error('Missing controls harness');
      return harness.renderSsrLabPage();
    });
    const ssrPath = path.join(artifacts, 'controls-elements-ssr.html');
    await writeFile(ssrPath, html, 'utf8');

    const offline = await browser.newContext({ offline: true, viewport: { width: 1200, height: 1000 } });
    try {
      const ssrPage = await offline.newPage();
      const ssrErrors = [];
      ssrPage.on('pageerror', error => ssrErrors.push(error.message));
      await ssrPage.goto(pathToFileURL(ssrPath).href);
      await ssrPage.locator('#lab-plain').waitFor();
      await ssrPage.locator('#ex-text').waitFor();
      await expect(ssrPage.locator('.md-document')).toHaveAttribute('data-rmd-theme', 'forest');
      expect(await ssrPage.locator('script').count()).toBe(0);
      await expect(ssrPage.locator('#ex-text')).toBeVisible();
      await expect(ssrPage.locator('.md-tablist')).toBeVisible();
      await expect(ssrPage.locator('.md-chart')).toBeVisible();
      await expect(ssrPage.locator('#ex-custom-alert')).toBeVisible();
      expect(await style(ssrPage, '#ex-custom-alert', 'background-color')).toBe('rgb(22, 35, 58)');
      expect(ssrErrors).toEqual([]);
    } finally {
      await offline.close();
    }
  });

  await check('page harness exports the new examples offline', async () => {
    const html = await page.evaluate(() => {
      const harness = window.__controlsHarness;
      if (!harness) throw new Error('Missing controls harness');
      return harness.exportElementsHtml();
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('data-controls-examples');
    expect(html).toContain('data-tetris');
    expect(html).toContain('rmd-2048');
    expect(html).not.toContain('<link rel="stylesheet"');
    const htmlPath = path.join(artifacts, 'controls-elements-export.html');
    await writeFile(htmlPath, html, 'utf8');

    const offline = await browser.newContext({ offline: true, viewport: { width: 1200, height: 1000 } });
    try {
      const exported = await offline.newPage();
      const exportedErrors = [];
      const network = [];
      exported.on('pageerror', error => exportedErrors.push(error.message));
      exported.on('console', message => { if (message.type() === 'error') exportedErrors.push(message.text()); });
      exported.on('request', request => { if (/^https?:/i.test(request.url())) network.push(request.url()); });
      await exported.goto(pathToFileURL(htmlPath).href);
      await exported.locator('#ex-text').waitFor({ timeout: 30000 });
      await exported.locator('[data-tetris]').waitFor({ timeout: 30000 });
      await exported.locator('[data-game-2048]').waitFor({ timeout: 30000 });
      await expect(exported.locator('.md-document')).toHaveAttribute('data-rmd-theme', 'forest');

      await exported.locator('#ex-text').fill('Exported field value');
      await expect(exported.locator('#ex-text')).toHaveValue('Exported field value');

      await exported.locator('#ex-tab-0').focus();
      await exported.keyboard.press('ArrowRight');
      await expect(exported.locator('#ex-tab-1')).toHaveAttribute('aria-selected', 'true');

      await exported.locator('#ex-dialog-open').click();
      await expect(exported.locator('#ex-dialog')).toHaveJSProperty('open', true);
      await exported.keyboard.press('Escape');
      await expect.poll(async () => exported.locator('#ex-dialog').evaluate(element => element.open)).toBe(false);

      await exported.locator('#ex-popover-trigger').click();
      expect(await exported.locator('#ex-popover').evaluate(element => element.matches(':popover-open'))).toBe(true);
      await exported.keyboard.press('Escape');

      await expect(exported.locator('.md-chart')).toBeVisible();
      const tetris = exported.locator('[data-tetris]');
      const before = Number(await tetris.getAttribute('data-tetris-moves'));
      await exported.locator('[data-tetris-drop]').click();
      await expect.poll(async () => Number(await tetris.getAttribute('data-tetris-moves'))).toBeGreaterThan(before);

      expect(exportedErrors).toEqual([]);
      expect(network).toEqual([]);
    } finally {
      await offline.close();
    }
  });

  await page.screenshot({ path: path.join(artifacts, 'controls-elements-desktop.png'), fullPage: true });
  status = failures.length === 0 && errors.length === 0 ? 'passed' : 'failed';
} finally {
  await writeFile(
    path.join(artifacts, 'controls-elements-results.json'),
    JSON.stringify({ status, baseURL, checks, failures, errors }, null, 2),
    'utf8',
  );
  await browser?.close();
  await server.close();
}

expect(errors).toEqual([]);
expect(failures).toEqual([]);
