import {expect} from '@playwright/test';
import {installEditorProbe,readEditorSource} from './editor-probe.mjs';

/** Open the workbench with a stable editor fixture, unless the URL selects one. */
export async function openWorkbench(page,value) {
  const url=new URL(value);url.searchParams.delete('editor');
  if (!url.searchParams.has('example')) await page.addInitScript(() => {
    if (!localStorage.getItem('reactive-md:selection')) localStorage.setItem('reactive-md:selection', 'pricing');
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

/** Click a workbench action by its accessible name. */
export async function clickWorkbenchAction(page, name) {
  if (name === 'Show source') {
    const edit = page.locator('[data-editor-view-option="edit"]');
    if (await edit.count()) { await edit.first().click(); return; }
    const split = page.locator('[data-editor-view-option="split"]');
    if (await split.count()) await split.first().click();
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
