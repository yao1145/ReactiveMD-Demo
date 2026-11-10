import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { createServer, preview } from 'vite';
import { openWorkbench, selectWorkbenchExample, replaceWorkbenchSource } from './workbench-ui.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const production = process.argv.includes('--preview');
const config = { root, server: { host: '127.0.0.1', port: 0 }, preview: { host: '127.0.0.1', port: 0 } };
const server = production ? await preview(config) : await createServer(config);
if (!production) await server.listen();
const baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
const artifacts = path.join(root, 'artifacts/game-rendering');
await mkdir(artifacts, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openWorkbench(page, baseURL);
  await selectWorkbenchExample(page, 'games');
  await page.locator('[data-editor-view-option="split"]').click();
  await replaceWorkbenchSource(page, '<game-2048>\n\n<tetris>');
  const game = page.locator('[data-game-2048]');
  const board = page.locator('[data-game-2048-board]');
  await expect(board).toBeVisible();
  await expect.poll(() => board.evaluate(node => getComputedStyle(node).display)).toBe('grid');
  await expect(page.locator('[data-game-2048-cell]')).toHaveCount(16);
  await expect.poll(() => page.locator('[data-tetris-board]').evaluate(node => getComputedStyle(node).display)).toBe('grid');
  await expect(page.locator('[data-tetris-cell]')).toHaveCount(200);
  await expect(page.locator('.preview-state-bar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save progress', exact: true })).toHaveCount(0);

  const move = async () => {
    await board.focus();
    for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) await board.press(key);
    await expect.poll(async () => Number(await game.getAttribute('data-moves'))).toBeGreaterThan(0);
  };
  await move();
  const savedMoves = await game.getAttribute('data-moves');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('reactive-md:component-state:'))
    .some(key => Object.values(JSON.parse(localStorage.getItem(key)).records)
      .some(record => record.component === 'example/game-2048' && record.data.moves > 0)))).toBe(true);
  await page.reload();
  await expect(game).toHaveAttribute('data-moves', savedMoves);
  await game.screenshot({ path: path.join(artifacts, `${production ? 'production' : 'development'}-2048.png`) });
  await page.evaluate(() => localStorage.setItem('reactive-md:theme', 'dark'));
  await page.reload();
  await expect(game).toHaveAttribute('data-moves', savedMoves);
  await game.screenshot({ path: path.join(artifacts, `${production ? 'production' : 'development'}-dark-2048.png`) });

  await page.locator('[data-editor-view-option="split"]').click();
  await replaceWorkbenchSource(page, '<game-2048 save-progress="false">');
  await page.reload();
  await expect(game).toHaveAttribute('data-moves', '0');
  await move();
  await page.reload();
  await expect(game).toHaveAttribute('data-moves', '0');

  await page.setViewportSize({ width: 390, height: 844 });
  const closeSidebar = page.locator('.sidebar-close');
  if (await closeSidebar.isVisible()) await closeSidebar.click();
  await page.locator('[data-editor-view-option="preview"]').click();
  await expect.poll(() => board.evaluate(node => getComputedStyle(node).display)).toBe('grid');
  const bounds = await board.boundingBox();
  assert.ok(bounds.width > 100 && bounds.height > 100, 'The mobile board must have a visible area.');
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391, 'The board must fit the mobile viewport.');
  await game.screenshot({ path: path.join(artifacts, `${production ? 'production' : 'development'}-mobile-2048.png`) });
  assert.deepEqual(errors, []);
  console.log(`PASS ${production ? 'production' : 'development'} games: CSS grids, no progress selector, default persistence, author opt-out, mobile rendering`);
} finally {
  await browser?.close();
  await server.close();
}
