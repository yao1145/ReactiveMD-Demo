import { openWorkbench, clickWorkbenchAction, replaceWorkbenchSource, readEditor, expectEditorSource, switchWorkbenchLanguage, viewModeButton } from './workbench-ui.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const baseURL = process.env.DEMO_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge', headless: true });
const artifacts = path.resolve('artifacts/image-assets');
await mkdir(artifacts, { recursive: true });
const errors = [];
const check = (name) => console.log(`PASS ${name}`);

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await openWorkbench(page,baseURL);
  await clickWorkbenchAction(page, 'Show source');
  const editor = page.locator('#source-editor');
  const source = '# Image document\n\n<slider bind="people" label="People" initial="2" min="1" max="10">\n\nBefore AFTER';
  await replaceWorkbenchSource(page, source);

  // The workbench no longer carries its own image panel: the editor toolbar's
  // Image action opens the file picker, and the export dialog is the only place
  // that lists document resources. Both surfaces are exercised through their
  // user-facing controls.
  const dialog = page.getByRole('dialog');
  const exportButton = dialog.getByRole('button', { name: 'Export HTML', exact: true });
  // The Chinese pass below reaches the same controls, so match either locale.
  const exportLabel = /^(Export|导出)$/;
  const cancelLabel = /^(Cancel|取消)$/;
  const openDialog = async () => {
    // Below the mobile threshold the toolbar is replaced by the masthead menu,
    // which is the only surface that carries the Export action there.
    const mobileMenu = page.locator('.mobile-menu-toggle');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.locator('.mobile-menu-panel').getByRole('menuitem', { name: exportLabel }).click();
    } else {
      await clickWorkbenchAction(page, exportLabel);
    }
    await expect(dialog).toBeVisible();
  };
  const closeDialog = async () => {
    await dialog.getByRole('button', { name: cancelLabel }).click();
    await expect(dialog).toBeHidden();
  };
  const resourceRows = () => dialog.locator('.image-asset-row');
  /** Choose images through Insert > Image the way a reader does. */
  const chooseImages = async (files) => {
    const chooser = page.waitForEvent('filechooser');
    await page.locator('[data-toolbar-id="insert"]').click();
    await page.locator('.editor-toolbar-insert-menu').getByRole('menuitem', { name: 'Image', exact: true }).click();
    await (await chooser).setFiles(files);
  };

  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 12; canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#267b61'; ctx.fillRect(0, 0, 12, 8);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const image = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
  await editor.focus();
  await editor.evaluate((el) => window.rmdEditorProbe.select(el,window.rmdEditorProbe.read(el).indexOf('AFTER'), window.rmdEditorProbe.read(el).indexOf('AFTER') + 5));
  await chooseImages(image);
  await expectEditorSource(editor,/Before \n\n!\[photo.png\]\(assets\/photo-[a-f\d]+\.png\)\n\n$/);
  await expect(page.locator('.preview-stage .md-document img')).toHaveCount(1);
  await expect.poll(() => page.locator('.preview-stage .md-document img').first().evaluate(img => img.naturalWidth)).toBe(12);
  await openDialog();
  await expect(resourceRows()).toHaveCount(1);
  await closeDialog();
  const inserted = await readEditor(editor);
  await editor.press('Control+z');
  await expectEditorSource(editor,source);
  await editor.press('Control+Shift+Z');
  await expectEditorSource(editor,inserted);
  check('file selection replaces the editor selection; preview, undo and redo work');

  // Rejected batches leave the document resources untouched and surface the
  // reason in the dialog that owns the resource list.
  await chooseImages([
    { ...image, name: 'valid.png' },
    { name: 'attack.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') },
  ]);
  await openDialog();
  await expect(dialog.getByRole('alert')).toContainText('SVG');
  await expect(resourceRows()).toHaveCount(1);
  await closeDialog();
  await expectEditorSource(editor,inserted);
  await chooseImages({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
  await openDialog();
  await expect(dialog.getByRole('alert')).toContainText('8 MiB');
  await closeDialog();
  await chooseImages({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10]) });
  await openDialog();
  await expect(dialog.getByRole('alert')).toContainText('cannot be decoded');
  await closeDialog();
  check('invalid batches, oversized and truncated images leave source and resources unchanged');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(async data => {
    const blob = new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/png' });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, png);
  await editor.focus();
  await editor.press('Control+End');
  await editor.press('Control+v');
  await expect(page.locator('.preview-stage .md-document img')).toHaveCount(2);
  await openDialog();
  await expect(resourceRows()).toHaveCount(2);
  await closeDialog();
  check('native clipboard paste adds an image resource and Markdown reference');

  await replaceWorkbenchSource(page, `${await readEditor(editor)}\n\n![Local](images/local.png)`);
  await openDialog();
  await expect(exportButton).toBeDisabled();
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose image for images/local.png', exact: true }).click();
  await (await chooser).setFiles(image);
  await expect(exportButton).toBeEnabled();
  check('missing references can be filled in the export dialog without changing source');

  for (const mode of ['interactive', 'static']) {
    if (mode === 'static') {
      // A successful export closes the dialog itself, so only cancel it when a
      // previous pass left it open.
      if (await dialog.isVisible()) await closeDialog();
      await openDialog();
      await dialog.getByRole('radio', { name: /^Static HTML/ }).check();
    }
    const downloadEvent = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadEvent;
    const output = path.join(artifacts, `images-${mode}.html`);
    await download.saveAs(output);
    if (mode === 'static') expect(/<script\b/.test(await readFile(output, 'utf8'))).toBe(false);
    const exported = await context.newPage();
    const requests = [];
    exported.on('pageerror', error => errors.push(error.message));
    exported.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await exported.goto(pathToFileURL(output).href);
    const imgs = exported.locator('img');
    await expect(imgs).toHaveCount(3);
    await expect.poll(() => imgs.evaluateAll(images => images.every(img => img.complete && img.naturalWidth === 12))).toBe(true);
    if (mode === 'interactive') {
      // Reactive MD renders a custom ARIA slider (a div with role="slider"),
      // not a native input[type=range], so Playwright's fill() cannot drive it.
      // Focus it and step it with the keyboard the way a reader does.
      const people = exported.getByRole('slider', { name: 'People', exact: true });
      await people.focus();
      for (let step = 0; step < 20 && await people.getAttribute('aria-valuenow') !== '4'; step++) {
        await exported.keyboard.press('ArrowRight');
      }
      await expect(people).toHaveAttribute('aria-valuenow', '4');
      await expect(imgs).toHaveCount(3);
    }
    expect(requests).toEqual([]);
    await exported.close();
    check(`${mode} HTML opens from file:// with all images and zero network requests`);
  }
  await expect(dialog).toBeHidden();

  await page.reload();
  await clickWorkbenchAction(page, 'Show source');
  await expect(page.locator('.preview-stage .md-document img')).toHaveCount(3);
  await openDialog();
  await expect(resourceRows()).toHaveCount(3);
  await closeDialog();
  check('draft image manifest and image preview survive refresh');

  // Examples are picked from the document tree; the old #example-select is gone.
  // Sections start collapsed, so open them before listing the example rows.
  const exampleRows = page.locator('.tree-row[data-tree-kind="example"]');
  for (let opened = 0; opened < 20; opened++) {
    const collapsed = page.locator('.tree-row[aria-expanded="false"] .tree-disclosure');
    if (await collapsed.count() === 0) break;
    await collapsed.first().click();
  }
  const activeExample = page.locator('.tree-row[data-tree-kind="example"][aria-selected="true"]');
  const selected = await activeExample.getAttribute('data-tree-id');
  const other = await exampleRows.evaluateAll((rows, current) => rows.map(row => row.dataset.treeId).find(id => id !== current), selected);
  await page.locator(`.tree-row[data-tree-id="${other}"] .tree-label`).click();
  await expect(page.locator('.preview-stage .md-document img')).toHaveCount(0);
  await page.locator(`.tree-row[data-tree-id="${selected}"] .tree-label`).click();
  await expect(page.locator('.preview-stage .md-document img')).toHaveCount(3);
  check('image manifests stay with their own document when switching examples');

  await openDialog();
  await dialog.getByRole('button', { name: 'Remove images/local.png', exact: true }).click();
  await expect(dialog).toContainText('File needed');
  await expect(exportButton).toBeDisabled();
  await closeDialog();
  check('removal keeps the reference visible and blocks an incomplete export');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(artifacts, 'mobile-images.png'), fullPage: false });
  const previewMode = await viewModeButton(page, 'preview').getAttribute('aria-pressed');
  if (previewMode === 'true') await clickWorkbenchAction(page, 'Show source');
  await openDialog();
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await expect.poll(() => dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.bringToFront();
  await dialog.getByRole('button', { name: 'Choose image for images/local.png', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: path.join(artifacts, 'mobile-export.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // The desktop sidebar is docked open; at 390px that same state is a drawer
  // covering the editor. Dismiss it with Escape from inside the drawer.
  const sidebar = page.locator('#document-sidebar');
  if (await sidebar.isVisible()) {
    await sidebar.getByRole('tab').first().focus();
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
  }
  await switchWorkbenchLanguage(page);
  // Example drafts are language-specific. Give the Chinese draft an image
  // reference so its resource panel exists before checking its translation.
  await replaceWorkbenchSource(page, '# 图片文档\n\n![图片](images/local.png)');
  await openDialog();
  await expect(dialog).toContainText('文档图片');
  await closeDialog();
  check('390px layout has no page overflow and image controls are localized');
  expect(errors).toEqual([]);
  await context.close();
} finally { await browser.close(); }
