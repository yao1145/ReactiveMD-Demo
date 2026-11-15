import {expect} from '@playwright/test';
import {installEditorProbe,readEditorSource} from './editor-probe.mjs';

/** Open the workbench with a stable editor fixture, unless the URL selects one. */
export async function openWorkbench(page,value) {
  const url=new URL(value);url.searchParams.delete('editor');
  if (!url.searchParams.has('example')) await page.addInitScript(() => {
    if (!localStorage.getItem('reactive-md:selection')) localStorage.setItem('reactive-md:selection', 'sci-fi-theme');
  });
  await page.goto(url.href);
  await installEditorProbe(page);
}

/** Select an example by reloading with its stable URL parameter. */
export async function selectWorkbenchExample(page, id) {
  const url = new URL(page.url());
  url.searchParams.set('example', id);
  await openWorkbench(page, url.href);
  await page.evaluate(() => {
    const next = new URL(location.href);
    next.searchParams.delete('example');
    history.replaceState(null, '', next.href);
  });
}

/** Switch to Chinese from the desktop toggle or the mobile masthead menu. */
export async function switchWorkbenchLanguage(page) {
  const menu = page.locator('.mobile-menu-toggle');
  if (await menu.isVisible()) {
    await menu.click();
    await page.locator('.mobile-menu-panel .language-toggle').click();
    return;
  }
  await page.getByRole('button', { name: 'Switch to Chinese', exact: true }).click();
}

/** The view switch that is visible at the current width: the editor footer on
 * desktop, the mobile document bar on narrow screens. */
export function viewModeButton(page, mode) {
  return page.locator(`[data-editor-view-option="${mode}"]:visible, [data-mobile-view-option="${mode}"]:visible`).first();
}

/** Reveal the floating preview controls when the sidebar toggle lives inside
 * them, then run the callback. The preview overlay owns the toggle in preview
 * mode on every width.
 *
 * Above the mobile threshold a fine pointer reveals the actions on hover rather
 * than through the corner target, and the sidebar can still be a drawer below
 * 1100px. Hovering covers that middle band; the corner target covers touch. */
export async function revealPreviewControls(page) {
  const reveal = page.locator('.preview-controls-reveal');
  const actions = page.locator('.preview-overlay-actions');
  if (!(await reveal.isVisible())) {
    if (await actions.isVisible()) return;
    await page.locator('.pane-preview').hover();
    return;
  }
  if ((await reveal.getAttribute('aria-expanded')) === 'true') return;
  await reveal.click();
}

/** Open the Developer tools tab and expand one card by its title.
 * Cards start collapsed, so their actions are not in the tab order. */
export async function openDeveloperCard(page, title) {
  const sidebar = page.locator('#document-sidebar');
  if (!(await sidebar.isVisible())) {
    await revealPreviewControls(page);
    const toggle = page.locator('#sidebar-toggle');
    if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  const panel = page.getByRole('tab', { name: /^(Developer tools|开发者工具)$/ });
  if (await panel.count()) await panel.click();
  const card = page.locator('.dev-card').filter({ has: page.locator('.dev-card-head') }).filter({ hasText: title }).first();
  const head = card.locator('.dev-card-head').first();
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  return card;
}

/** Restore the active example from the Developer tools Document card.
 * The card is collapsed by default and the action only exists for examples. */
export async function restoreWorkbenchExample(page) {
  const card = await openDeveloperCard(page, 'Document');
  await card.getByRole('button', { name: /^(Restore example|恢复示例)$/ }).click();
}

/** Click a workbench action by its accessible name. */
export async function clickWorkbenchAction(page, name) {
  if (name === 'Show source') {
    const edit = viewModeButton(page, 'edit');
    if (await edit.count()) { await edit.click(); return; }
    const split = viewModeButton(page, 'split');
    if (await split.count()) await split.click();
    return;
  }
  const button = page.getByRole('button', { name, exact: typeof name === 'string' });
  await button.first().click();
}
/** Replace source through native input after the editor's layout settles. */
export async function replaceWorkbenchSource(page, text) {
  await installEditorProbe(page);
  const editor = page.locator('#source-editor');
  await editor.click();
  await expect(editor).toBeFocused();
  await editor.press('ControlOrMeta+A');
  await page.keyboard.insertText(text.replace(/\r\n?/g,'\n'));
  await expect.poll(()=>readEditorSource(page)).toBe(text.replace(/\r\n?/g,'\n'));
}

export async function readEditor(locator) {
  await installEditorProbe(locator.page());
  return locator.evaluate(element=>window.rmdEditorProbe.read(element));
}
export async function fillEditor(locator,text) {await replaceWorkbenchSource(locator.page(),text);}
export async function expectEditorSource(locator,expected,negated=false) {
  const assertion=expect.poll(()=>readEditor(locator));
  const target=negated?assertion.not:assertion;
  if(expected instanceof RegExp)await target.toMatch(expected);else await target.toBe(expected.replace(/\r\n?/g,'\n'));
}
