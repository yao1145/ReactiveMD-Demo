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
