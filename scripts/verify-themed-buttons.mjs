import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'artifacts', 'themed-buttons');
await mkdir(artifacts, { recursive: true });
const port = 5188;
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port, strictPort: true },
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

function tokenLength(page, documentSelector, token, property = 'height') {
  return page.evaluate(({ documentSelector, token, property }) => {
    const host = document.querySelector(documentSelector);
    if (!host) throw new Error(`Missing document root ${documentSelector}`);
    const probe = document.createElement('span');
    probe.style.cssText = 'position: absolute; visibility: hidden;';
    probe.style[property] = `var(${token})`;
    host.append(probe);
    const value = getComputedStyle(probe)[property];
    probe.remove();
    // Layout lengths may include subpixel rounding at the host display scale.
    return value.endsWith('px') ? `${Number(parseFloat(value).toFixed(2))}px` : value;
  }, { documentSelector, token, property });
}

function tokenOpacity(page, documentSelector, token) {
  return page.evaluate(({ documentSelector, token }) => {
    const host = document.querySelector(documentSelector);
    if (!host) throw new Error(`Missing document root ${documentSelector}`);
    const probe = document.createElement('span');
    probe.style.cssText = 'position: absolute; visibility: hidden;';
    probe.style.opacity = `var(${token})`;
    host.append(probe);
    const value = Number(getComputedStyle(probe).opacity);
    probe.remove();
    return value;
  }, { documentSelector, token });
}

async function hover(page, selector) {
  await page.locator(selector).hover();
}

async function moveAway(page) {
  await page.mouse.move(2, 2);
}

async function readWhileActive(page, selector, property) {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`Cannot find a box for ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const value = await target.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
  await page.mouse.up();
  return value;
}

async function tabTo(page, id) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < 100; index += 1) {
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
  await page.locator('[data-tetris]').waitFor();
  await page.locator('[data-game-2048]').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await check('two independent documents render with different color schemes', async () => {
    expect(await page.locator('.md-document').count()).toBe(2);
    expect(await page.locator(LAB_DOC).getAttribute('data-color-scheme')).toBe('light');
    expect(await page.locator(GAME_DOC).getAttribute('data-color-scheme')).toBe('dark');
    await expect(page.locator(LAB_DOC)).toHaveAttribute('data-rmd-theme', 'forest');
    await expect(page.locator(GAME_DOC)).toHaveAttribute('data-rmd-theme', 'default');
    await expect(page.locator(LAB_DOC)).toBeVisible();
    await expect(page.locator(GAME_DOC)).toBeVisible();
  });

  await check('plain native button defaults to the secondary appearance', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const line = await tokenColor(page, LAB_DOC, '--line-strong');
    const ink = await tokenColor(page, LAB_DOC, '--ink');
    const height = await tokenLength(page, LAB_DOC, '--control-height');
    expect(await style(page, '#lab-plain', 'background-color')).toBe(surface);
    expect(await style(page, '#lab-plain', 'border-top-color')).toBe(line);
    expect(await style(page, '#lab-plain', 'color')).toBe(ink);
    expect(await style(page, '#lab-plain', 'min-height')).toBe(height);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(await style(page, '#lab-plain', `margin-${side}`)).toBe('0px');
    }
  });

  await check('explicit secondary and md-button match the default', async () => {
    for (const selector of ['#lab-secondary', '#lab-md-button']) {
      for (const property of ['background-color', 'border-top-color', 'color', 'min-height']) {
        expect(await style(page, selector, property)).toBe(await style(page, '#lab-plain', property));
      }
    }
  });

  await check('single-class primary, secondary and quiet variants use theme colors', async () => {
    const accent = await tokenColor(page, LAB_DOC, '--accent');
    const accentInk = await tokenColor(page, LAB_DOC, '--accent-ink');
    const accentText = await tokenColor(page, LAB_DOC, '--accent-text');
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    expect(await style(page, '#lab-primary', 'background-color')).toBe(accent);
    expect(await style(page, '#lab-primary', 'color')).toBe(accentInk);
    expect(await style(page, '#lab-secondary', 'background-color')).toBe(surface);
    expect(await style(page, '#lab-quiet', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await style(page, '#lab-quiet', 'color')).toBe(accentText);
  });

  await check('hover states use the shared interaction variables', async () => {
    const surfaceHover = await tokenColor(page, LAB_DOC, '--surface-hover');
    const accentHover = await tokenColor(page, LAB_DOC, '--accent-hover');
    await hover(page, '#lab-plain');
    expect(await style(page, '#lab-plain', 'background-color')).toBe(surfaceHover);
    await hover(page, '#lab-primary');
    expect(await style(page, '#lab-primary', 'background-color')).toBe(accentHover);
    await hover(page, '#lab-quiet');
    expect(await style(page, '#lab-quiet', 'background-color')).toBe(surfaceHover);
    await moveAway(page);
  });

  await check('active states use the shared interaction variables', async () => {
    const surfaceActive = await tokenColor(page, LAB_DOC, '--surface-active');
    const accentHover = await tokenColor(page, LAB_DOC, '--accent-hover');
    expect(await readWhileActive(page, '#lab-plain', 'background-color')).toBe(surfaceActive);
    expect(await readWhileActive(page, '#lab-secondary', 'background-color')).toBe(surfaceActive);
    expect(await readWhileActive(page, '#lab-primary', 'background-color')).toBe(accentHover);
    await moveAway(page);
  });

  await check('focus-visible draws the shared focus outline', async () => {
    const focus = await tokenColor(page, LAB_DOC, '--focus');
    await tabTo(page, 'lab-plain');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('lab-plain');
    expect(await style(page, '#lab-plain', 'outline-style')).toBe('solid');
    expect(await style(page, '#lab-plain', 'outline-width')).not.toBe('0px');
    expect(await style(page, '#lab-plain', 'outline-color')).toBe(focus);
  });

  await check('disabled buttons and disabled fieldsets use the shared disabled treatment', async () => {
    const disabledOpacity = await tokenOpacity(page, LAB_DOC, '--disabled-opacity');
    expect(Number(await style(page, '#lab-disabled', 'opacity'))).toBeCloseTo(disabledOpacity, 3);
    expect(await style(page, '#lab-disabled', 'cursor')).toBe('not-allowed');
    await expect(page.locator('#lab-fieldset-button')).toBeDisabled();
    await expect(page.locator('#lab-fieldset-input')).toBeDisabled();
    expect(Number(await style(page, '#lab-fieldset-button', 'opacity'))).toBeCloseTo(disabledOpacity, 3);
    expect(await style(page, '#lab-fieldset-button', 'cursor')).toBe('not-allowed');
    expect(Number(await style(page, '#lab-fieldset-input', 'opacity'))).toBeCloseTo(disabledOpacity, 3);
    expect(Number(await style(page, '#lab-input-disabled', 'opacity'))).toBeCloseTo(disabledOpacity, 3);
    await expect(page.locator('#lab-legend-button')).toBeEnabled();
    expect(await style(page, '#lab-legend-button', 'opacity')).toBe('1');
  });

  await check('hidden buttons stay hidden', async () => {
    expect(await page.locator('#lab-hidden').isHidden()).toBe(true);
    expect(await style(page, '#lab-hidden', 'display')).toBe('none');
    await expect(page.locator('#lab-hidden')).toHaveAttribute('hidden', '');
  });

  await check('width-only and color-only local classes win in every state', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const surfaceHover = await tokenColor(page, LAB_DOC, '--surface-hover');
    const surfaceActive = await tokenColor(page, LAB_DOC, '--surface-active');
    const success = await tokenColor(page, LAB_DOC, '--success');

    expect(await style(page, '#lab-width', 'width')).toBe('220px');
    expect(await style(page, '#lab-width', 'background-color')).toBe(surface);
    await hover(page, '#lab-width');
    expect(await style(page, '#lab-width', 'width')).toBe('220px');
    expect(await style(page, '#lab-width', 'background-color')).toBe(surfaceHover);
    expect(await readWhileActive(page, '#lab-width', 'width')).toBe('220px');
    expect(await readWhileActive(page, '#lab-width', 'background-color')).toBe(surfaceActive);

    expect(await style(page, '#lab-color', 'color')).toBe(success);
    await hover(page, '#lab-color');
    expect(await style(page, '#lab-color', 'color')).toBe(success);
    expect(await style(page, '#lab-color', 'background-color')).toBe(surfaceHover);
    expect(await readWhileActive(page, '#lab-color', 'color')).toBe(success);
    await moveAway(page);
  });

  await check('custom opt-out owns its states and keeps theme variables', async () => {
    const success = await tokenColor(page, LAB_DOC, '--success');
    expect(await style(page, '#lab-custom', 'display')).not.toBe('inline-flex');
    expect(await style(page, '#lab-custom', 'align-items')).not.toBe('center');
    expect(await style(page, '#lab-custom', 'justify-content')).not.toBe('center');
    expect(await style(page, '#lab-custom', 'min-height')).toBe('52px');
    expect(Math.abs(parseFloat(await style(page, '#lab-custom', 'border-top-width')) - 2)).toBeLessThan(0.5);
    expect(await style(page, '#lab-custom', 'border-radius')).toBe('999px');
    expect(await style(page, '#lab-custom', 'background-color')).toBe('rgb(22, 35, 58)');
    expect(await style(page, '#lab-custom', 'color')).toBe('rgb(255, 255, 255)');
    expect(await style(page, '#lab-custom', 'border-top-color')).toBe(success);
    expect(Number(await style(page, '#lab-custom-disabled', 'opacity'))).toBeCloseTo(0.4, 3);
    expect(await style(page, '#lab-custom-disabled', 'cursor')).toBe('not-allowed');

    await hover(page, '#lab-custom');
    expect(await style(page, '#lab-custom', 'background-color')).toBe('rgb(45, 74, 117)');
    expect(await readWhileActive(page, '#lab-custom', 'background-color')).toBe('rgb(15, 27, 45)');
    await moveAway(page);

    await tabTo(page, 'lab-custom');
    expect(await style(page, '#lab-custom', 'outline-style')).toBe('solid');
    expect(Math.abs(parseFloat(await style(page, '#lab-custom', 'outline-width')) - 3)).toBeLessThan(0.5);
    expect(await style(page, '#lab-custom', 'outline-color')).toBe(success);
  });

  await check('all three input button types receive the default skin', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const line = await tokenColor(page, LAB_DOC, '--line-strong');
    const height = await tokenLength(page, LAB_DOC, '--control-height');
    for (const selector of ['#lab-input-button', '#lab-input-submit', '#lab-input-reset']) {
      expect(await style(page, selector, 'background-color')).toBe(surface);
      expect(await style(page, selector, 'border-top-color')).toBe(line);
      expect(await style(page, selector, 'min-height')).toBe(height);
    }
  });

  await check('role=button and the outside-document button keep their own appearance', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const height = await tokenLength(page, LAB_DOC, '--control-height');
    expect(await style(page, '#lab-role', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await style(page, '#lab-role', 'border-top-width')).toBe('0px');
    expect(await style(page, '#lab-role', 'border-radius')).toBe('0px');
    expect(await style(page, '#lab-role', 'cursor')).not.toBe('pointer');
    expect(await style(page, '#lab-role', 'min-height')).not.toBe(height);
    expect(await page.locator('.md-document #outside-button').count()).toBe(0);
    expect(await style(page, '#outside-button', 'background-color')).not.toBe(surface);
    expect(await style(page, '#outside-button', 'min-height')).not.toBe(height);
    expect(await style(page, '#outside-variant', 'min-height')).not.toBe(height);
    expect(await style(page, '#outside-variant', 'display')).not.toBe('inline-flex');
  });

  await check('a custom container does not opt out descendant buttons', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const line = await tokenColor(page, LAB_DOC, '--line-strong');
    const height = await tokenLength(page, LAB_DOC, '--control-height');
    expect(await style(page, '#lab-custom-scope', 'display')).not.toBe('inline-flex');
    expect(await style(page, '#lab-custom-scope-button', 'background-color')).toBe(surface);
    expect(await style(page, '#lab-custom-scope-button', 'border-top-color')).toBe(line);
    expect(await style(page, '#lab-custom-scope-button', 'min-height')).toBe(height);
  });

  await check('the built-in counter renders shared buttons and responds', async () => {
    const surface = await tokenColor(page, LAB_DOC, '--surface');
    const height = await tokenLength(page, LAB_DOC, '--control-height');
    expect(await style(page, '#lab-card .local-counter-button', 'background-color')).toBe(surface);
    expect(await style(page, '#lab-card .local-counter-button', 'min-height')).toBe(height);
    await expect(page.locator('#lab-card .local-counter-value')).toHaveText('2');
    await page.locator('#lab-card .local-counter-button').nth(1).click();
    await expect(page.locator('#lab-card .local-counter-value')).toHaveText('3');
  });

  await check('Tetris and 2048 render and accept real interaction', async () => {
    const tetris = page.locator('#games-card [data-tetris]');
    await expect(page.locator('#games-card [data-tetris-cell]')).toHaveCount(200);
    const tetrisMoves = Number(await tetris.getAttribute('data-tetris-moves'));
    await page.locator('#games-card [data-tetris-drop]').click();
    await expect.poll(async () => Number(await tetris.getAttribute('data-tetris-moves'))).toBeGreaterThan(tetrisMoves);

    const game2048 = page.locator('#games-card [data-game-2048]');
    await expect(page.locator('#games-card .rmd-2048-cell')).toHaveCount(16);
    const moves2048 = Number(await game2048.getAttribute('data-moves'));
    await page.locator('#games-card [data-game-2048-left]').click();
    await expect.poll(async () => Number(await game2048.getAttribute('data-moves'))).toBeGreaterThan(moves2048);
  });

  await check('each document switches independently and games keep state', async () => {
    const lab = page.locator(LAB_DOC);
    const games = page.locator(GAME_DOC);
    const tetris = page.locator('#games-card [data-tetris]');

    await page.locator('#toggle-lab').click();
    expect(await lab.getAttribute('data-color-scheme')).toBe('dark');
    expect(await games.getAttribute('data-color-scheme')).toBe('dark');
    const darkSurface = await tokenColor(page, LAB_DOC, '--surface');
    expect(await style(page, '#lab-plain', 'background-color')).toBe(darkSurface);
    expect(await style(page, '#lab-custom', 'color')).toBe('rgb(255, 255, 255)');
    await page.locator('#toggle-lab').click();
    expect(await lab.getAttribute('data-color-scheme')).toBe('light');
    expect(await games.getAttribute('data-color-scheme')).toBe('dark');

    const before = Number(await tetris.getAttribute('data-tetris-moves'));
    await page.locator('#toggle-games').click();
    expect(await games.getAttribute('data-color-scheme')).toBe('light');
    expect(await lab.getAttribute('data-color-scheme')).toBe('light');
    await expect(tetris).toBeVisible();
    await expect(page.locator('#games-card [data-tetris-cell]')).toHaveCount(200);
    expect(Number(await tetris.getAttribute('data-tetris-moves'))).toBe(before);

    await page.locator('#games-card [data-tetris-drop]').click();
    await expect.poll(async () => Number(await tetris.getAttribute('data-tetris-moves'))).toBeGreaterThan(before);
    await page.locator('#toggle-games').click();
    expect(await games.getAttribute('data-color-scheme')).toBe('dark');
    await expect(tetris).toBeVisible();
  });

  await check('reduced motion removes the shared transition', async () => {
    expect(await style(page, '#lab-plain', 'transition-property')).toBe('none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const normal = await style(page, '#lab-plain', 'transition-duration');
    expect(normal.split(',').some(value => value.trim() !== '0s')).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  await check('375px layout stacks documents without horizontal overflow', async () => {
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
    await page.screenshot({ path: path.join(artifacts, 'controls-375.png'), fullPage: true });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });

  await check('local overrides also win when shared CSS loads last', async () => {
    const sharedCss = await page.evaluate(() => window.__controlsHarness.sharedCss);
    const lateStyle = await page.addStyleTag({ content: sharedCss });
    try {
      const success = await tokenColor(page, LAB_DOC, '--success');
      expect(await style(page, '#lab-width', 'width')).toBe('220px');
      expect(await style(page, '#lab-color', 'color')).toBe(success);
      await hover(page, '#lab-color');
      expect(await style(page, '#lab-color', 'color')).toBe(success);
      expect(await readWhileActive(page, '#lab-color', 'color')).toBe(success);
    } finally { await lateStyle.evaluate(element => element.remove()); }
    await moveAway(page);
  });

  await check('page harness exports real offline HTML', async () => {
    const html = await page.evaluate(() => {
      const harness = window.__controlsHarness;
      if (!harness) throw new Error('Missing controls harness');
      return harness.exportAcceptanceHtml();
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('data-tetris');
    expect(html).toContain('rmd-2048');
    expect(html).not.toContain('<link rel="stylesheet"');
    const htmlPath = path.join(artifacts, 'controls-export.html');
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
      await exported.locator('[data-tetris]').waitFor({ timeout: 30000 });
      await exported.locator('[data-game-2048]').waitFor({ timeout: 30000 });
      await expect(exported.locator('.md-document')).toHaveAttribute('data-rmd-theme', 'forest');

      const accent = await tokenColor(exported, '.md-document', '--accent');
      const surface = await tokenColor(exported, '.md-document', '--surface');
      expect(await style(exported, '.md-button-primary', 'background-color')).toBe(accent);
      expect(await style(exported, '.md-button-secondary', 'background-color')).toBe(surface);
      expect(await style(exported, '.md-button-quiet', 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await style(exported, '.local-counter-button', 'background-color')).toBe(surface);

      await expect(exported.locator('[data-tetris-board]')).toHaveCount(1);
      expect(await exported.locator('[data-tetris-board]').evaluate(element => getComputedStyle(element).display)).toBe('grid');
      await expect(exported.locator('[data-tetris-cell]')).toHaveCount(200);
      await expect(exported.locator('[data-game-2048-board] .rmd-2048-cell')).toHaveCount(16);

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

  await check('SSR pre-hydration page styles native controls without scripts', async () => {
    const html = await page.evaluate(() => {
      const harness = window.__controlsHarness;
      if (!harness) throw new Error('Missing controls harness');
      return harness.renderSsrLabPage();
    });
    const ssrPath = path.join(artifacts, 'controls-ssr.html');
    await writeFile(ssrPath, html, 'utf8');

    const offline = await browser.newContext({ offline: true, viewport: { width: 1200, height: 1000 } });
    try {
      const ssrPage = await offline.newPage();
      const ssrErrors = [];
      ssrPage.on('pageerror', error => ssrErrors.push(error.message));
      await ssrPage.goto(pathToFileURL(ssrPath).href);
      await ssrPage.locator('#lab-plain').waitFor();
      await expect(ssrPage.locator('.md-document')).toHaveAttribute('data-rmd-theme', 'forest');
      expect(await ssrPage.locator('script').count()).toBe(0);

      const surface = await tokenColor(ssrPage, '.md-document', '--surface');
      const accent = await tokenColor(ssrPage, '.md-document', '--accent');
      const disabledOpacity = await tokenOpacity(ssrPage, '.md-document', '--disabled-opacity');
      expect(await style(ssrPage, '#lab-plain', 'background-color')).toBe(surface);
      expect(await style(ssrPage, '#lab-primary', 'background-color')).toBe(accent);
      expect(await style(ssrPage, '#lab-custom', 'background-color')).toBe('rgb(22, 35, 58)');
      expect(await style(ssrPage, '#lab-role', 'border-top-width')).toBe('0px');
      expect(Number(await style(ssrPage, '#lab-fieldset-button', 'opacity'))).toBeCloseTo(disabledOpacity, 3);
      expect(await ssrPage.locator('.local-counter-button').count()).toBeGreaterThan(0);
      expect(ssrErrors).toEqual([]);
    } finally {
      await offline.close();
    }
  });

  await page.screenshot({ path: path.join(artifacts, 'controls-desktop.png'), fullPage: true });
  status = failures.length === 0 && errors.length === 0 ? 'passed' : 'failed';
} finally {
  await writeFile(
    path.join(artifacts, 'controls-results.json'),
    JSON.stringify({ status, baseURL, checks, failures, errors }, null, 2),
    'utf8',
  );
  await browser?.close();
  await server.close();
}

expect(errors).toEqual([]);
expect(failures).toEqual([]);
