import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import { openWorkbench, clickWorkbenchAction, fillEditor, expectEditorSource, switchWorkbenchLanguage, openDeveloperCard, revealPreviewControls } from './workbench-ui.mjs';

const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge', headless: true});
await mkdir('artifacts/compact-workbench', {recursive: true});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openWorkbench(page,process.env.DEMO_URL ?? 'http://127.0.0.1:5173');
    const theme = page.locator('.masthead .theme-toggle');
    const sidebar = page.locator('#document-sidebar');
    await expect(theme).toBeVisible();
    // The workbench header no longer carries its own action strip: document
    // management lives in the sidebar tree and settings live in Developer tools.
    await expect(page.locator('.workbench-quick-actions')).toHaveCount(0);
    await expect(page.locator('.workbench-options')).toHaveCount(0);
    // Below the desktop breakpoint the masthead folds Export into its menu.
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    const openExport = async () => {
      const direct = page.getByRole('button', {name: 'Export', exact: true});
      if (await direct.isVisible()) return direct;
      await mobileMenuToggle.click();
      return page.getByRole('menuitem', {name: 'Export', exact: true});
    };
    await expect(await openExport()).toBeVisible();
    if (await page.locator('.mobile-menu-panel').isVisible()) await mobileMenuToggle.click();

    await clickWorkbenchAction(page, 'Show source');
    const editor = page.locator('#source-editor');
    await expect(editor).toBeVisible();
    assert.ok((await page.locator('.reactive-md-editor').boundingBox()).height >= 720);

    await fillEditor(editor,'# Compact workbench\n\nImages go here.');
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 12; canvas.height = 8;
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const chooser = page.waitForEvent('filechooser');
    await page.locator('[data-toolbar-id="insert"]').click();
    await page.locator('.editor-toolbar-insert-menu').getByRole('menuitem', {name: 'Image', exact: true}).click();
    await (await chooser).setFiles({name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64')});
    await expectEditorSource(editor,/!\[photo.png\]\(assets\//);
    await expect(page.locator('.preview-stage img')).toHaveCount(1);

    await (await openExport()).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Edit mode hides the preview pane, so the sidebar toggle itself is the way
    // in on narrow screens: revealPreviewControls would hover a hidden pane.
    const sidebarToggle = page.locator('#sidebar-toggle');
    const openSidebar = async () => {
      if ((await sidebarToggle.getAttribute('aria-expanded')) === 'true') return;
      if (await page.locator('.pane-preview').isVisible()) await revealPreviewControls(page);
      await sidebarToggle.click();
    };
    // Below the drawer breakpoint the open sidebar is modal and its backdrop
    // covers the masthead controls, so it has to be dismissed first.
    const closeDrawer = async () => {
      const backdrop = page.locator('.sidebar-backdrop');
      if (await backdrop.isVisible()) await backdrop.click({position: {x: width - 8, y: 40}});
    };

    // Import lives on the Developer tools Document card, which starts collapsed.
    await openSidebar();
    const importChooser = page.waitForEvent('filechooser');
    const documentCard = await openDeveloperCard(page, 'Document');
    await documentCard.getByRole('button', {name: 'Import document', exact: true}).click();
    await (await importChooser).setFiles({name: 'imported.md', mimeType: 'text/markdown', buffer: Buffer.from('# Imported document')});
    await expectEditorSource(editor,'# Imported document');

    // Document management sits behind the Documents tab of the sidebar, which
    // import leaves on Developer tools.
    await openSidebar();
    await expect(sidebar).toBeVisible();
    await page.getByRole('tab', {name: /^Documents$/}).click();
    await expect(page.getByRole('button', {name: 'New document', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'New document', exact: true}).click();
    const activeRow = page.locator('[role=treeitem][data-tree-kind=document][aria-selected=true]');
    await expect(activeRow).toHaveCount(1);
    await sidebar.getByRole('button', {name: 'Rename', exact: true}).click();
    const rename = activeRow.getByRole('textbox');
    await rename.fill('Renamed document');
    await rename.press('Enter');
    await expect(activeRow.getByRole('button', {name: 'Renamed document', exact: true})).toBeVisible();
    await expectEditorSource(editor,'');

    await closeDrawer();
    await theme.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', {name: 'Light theme', exact: true})).toBeVisible();
    await switchWorkbenchLanguage(page);
    // The document manager's translated label still lives behind the Documents tab.
    await openSidebar();
    await expect(page.getByRole('button', {name: '新建文档', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: '浅色主题', exact: true})).toBeVisible();
    await closeDrawer();
    await page.waitForTimeout(250);
    await page.screenshot({path: `artifacts/compact-workbench/${width}-dark-zh.png`});
    await page.getByRole('button', {name: '浅色主题', exact: true}).click();
    await page.waitForTimeout(250);
    await page.screenshot({path: `artifacts/compact-workbench/${width}-light-zh.png`});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${width}px: header actions, toolbar image insertion, export, import, tree forms, theme, locale and editor height`);
  }
} finally {await browser.close();}
