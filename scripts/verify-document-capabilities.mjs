import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, rmdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDeveloperCard, openWorkbench, replaceWorkbenchSource, viewModeButton } from './workbench-ui.mjs';

const SOURCE = [
  '<theme name="sci-fi">', '', '<css>', 'h2 { color: #24549a; }', '</css>', '', '## People', '',
  '<slider bind="people" label="People" initial="2" min="1" max="20" css="max-width: 24rem; margin-block: 1rem">',
  '',
  '<counter bind="scriptStarts" label="Script starts" initial="0">',
  '', 'People: {{ people }}', '', 'Script initializations: {{ scriptStarts }}', '',
  '<iframe title="Example" srcdoc="<p>Embedded example</p>"></iframe>', '',
  '<javascript>', 'await rmd.set("people", 10);',
  'await rmd.set("scriptStarts", (await rmd.get("scriptStarts")) + 1);', '</javascript>',
].join('\n');
const server = process.env.DEMO_URL ? null : await createServer({ server: { host: '127.0.0.1', port: 0, watch: null } });
await server?.listen();
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const workers = [];
  page.on('worker', worker => workers.push(worker.url()));
  const url = new URL(process.env.DEMO_URL ?? server.resolvedUrls.local[0]);
  url.searchParams.set('example', 'sci-fi-theme');
  await openWorkbench(page, url.href);
  await viewModeButton(page, 'edit').click();
  await replaceWorkbenchSource(page, SOURCE);
  await viewModeButton(page, 'split').click();

  const card = await openDeveloperCard(page, /^HTML/);
  const css = card.getByRole('switch', { name: /^CSS\b/ });
  const js = card.getByRole('switch', { name: /^JavaScript\b/ });
  const extended = card.getByRole('switch', { name: /^Extended HTML\b/ });
  const preview = page.locator('.preview-stage');
  const slider = preview.getByRole('slider', { name: 'People', exact: true });
  const waitForPreview = () => expect(preview).toHaveAttribute('aria-busy', 'false', { timeout: 10_000 });
  const set = async (toggle, checked) => {
    if ((await toggle.getAttribute('aria-checked')) !== String(checked)) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(checked));
      await waitForPreview();
    }
  };
  await waitForPreview();
  await expect(css).toHaveAttribute('aria-checked', 'true');
  await expect(js).toHaveAttribute('aria-checked', 'false');
  await expect(extended).toHaveAttribute('aria-checked', 'false');
  await expect(slider).toHaveAttribute('aria-valuenow', '2');
  await expect.poll(() => workers.some(url => url.includes('local-compile-worker'))).toBe(true);

  for (let index = 0; index < 8; index++) {
    const cssEnabled = Boolean(index & 1);
    const jsEnabled = Boolean(index & 2);
    const htmlEnabled = Boolean(index & 4);
    await set(js, false);
    await slider.press('Home');
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '2');
    await set(css, cssEnabled);
    await set(extended, htmlEnabled);
    await set(js, jsEnabled);
    const start = jsEnabled ? 10 : 2;
    await expect(slider).toHaveAttribute('aria-valuenow', String(start));
    await expect(preview.getByText(`People: ${start}`, { exact: true })).toBeVisible();
    await expect(preview.locator('iframe')).toHaveCount(htmlEnabled ? 1 : 0);
    if (cssEnabled) await expect(preview.getByRole('heading', { name: 'People' })).toHaveCSS('color', 'rgb(36, 84, 154)');
    else await expect(preview.getByRole('heading', { name: 'People' })).not.toHaveCSS('color', 'rgb(36, 84, 154)');
    for (let step = start; step < 12; step++) await slider.press('ArrowRight');
    await expect(preview.getByText('People: 12', { exact: true })).toBeVisible();
  }
  const initializations = preview.locator('p').filter({ hasText: /^Script initializations:/ });
  const initialCount = 'Script initializations: 4';
  await expect(initializations).toHaveText(initialCount);
  const titleEdit = SOURCE.replace('## People', '## People count');
  const addedParagraph = titleEdit.replace('People: {{ people }}', 'Ordinary new paragraph.\n\nPeople: {{ people }}');
  for (const edited of [titleEdit, addedParagraph, titleEdit, SOURCE]) {
    await replaceWorkbenchSource(page, edited);
    await waitForPreview();
    const title = edited === SOURCE ? 'People' : 'People count';
    await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(preview.getByText('Ordinary new paragraph.', { exact: true })).toHaveCount(Number(edited === addedParagraph));
    await expect(slider).toHaveAttribute('aria-valuenow', '12');
    await expect(initializations).toHaveText(initialCount);
  }
  await replaceWorkbenchSource(page, SOURCE + '\n\n<slider bind="unfinished"');
  await expect(preview.getByRole('alert')).toContainText('Showing the last valid preview');
  await expect(initializations).toHaveText(initialCount);
  await replaceWorkbenchSource(page, SOURCE + '\n\nThe source compiles again.');
  await expect(preview.getByText('The source compiles again.', { exact: true })).toBeVisible();
  await expect(preview.getByRole('alert')).toHaveCount(0);
  await expect(initializations).toHaveText(initialCount);
  await expect(slider).toHaveAttribute('aria-valuenow', '12');
  await set(css, false);
  await set(extended, false);
  await expect(slider).toHaveAttribute('aria-valuenow', '12');
  await set(js, false);
  await expect(slider).toHaveAttribute('aria-valuenow', '12');

  const scratch = await mkdtemp(join(tmpdir(), 'rmd-demo-capabilities-'));
  const file = join(scratch, 'mixed.html');
  const reopenExport = async (initialValue, hasCss, hasIframe) => {
    const exportCard = await openDeveloperCard(page, /^Export/);
    await exportCard.getByRole('button', { name: 'Open export dialog' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const current = dialog.locator('input[value=current]');
    await expect(current).toBeEnabled();
    await current.check();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Export HTML', exact: true }).click(),
    ]);
    await download.saveAs(file);
    await expect(dialog).toBeHidden();
    const reopened = await browser.newPage({ offline: true });
    try {
      await reopened.goto(pathToFileURL(file).href);
      await expect(reopened.getByText('People: ' + initialValue, { exact: true })).toBeVisible();
      await expect(reopened.locator('[data-rmd-author-css]')).toHaveCount(Number(hasCss));
      await expect(reopened.locator('iframe')).toHaveCount(Number(hasIframe));
      await reopened.getByRole('slider').press('ArrowRight');
      await expect(reopened.getByText('People: ' + (initialValue + 1), { exact: true })).toBeVisible();
    } finally {
      await reopened.close();
    }
  };
  try {
    await reopenExport(12, false, false);
    await set(css, true);
    await set(extended, true);
    await set(js, true);
    await expect(slider).toHaveAttribute('aria-valuenow', '10');
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '12');
    await reopenExport(10, true, true);
  } finally {
    await unlink(file).catch(() => {});
    await rmdir(scratch);
  }
  console.log('PASS Playground Worker matrix, retained state, and configured offline exports with grants on and off');
  const failingScript = SOURCE.replace('await rmd.set("people", 10);', 'throw new Error("AuthorScriptFailureMarker");');
  const failure = page.getByRole('region', { name: 'Compile and runtime diagnostics' }).getByText(/AuthorScriptFailureMarker/);
  await replaceWorkbenchSource(page, failingScript);
  await expect(failure).toBeVisible();
  await replaceWorkbenchSource(page, failingScript + '\n\nText edit after script failure.');
  await expect(preview.getByText('Text edit after script failure.', { exact: true })).toBeVisible();
  await expect(failure).toBeVisible();
  await set(css, false);
  await expect(failure).toBeVisible();
  await set(js, false);
  await expect(failure).toHaveCount(0);
  await page.getByRole('button', { name: 'Streaming', exact: true }).click();
  await page.getByTestId('streaming-start').click();
  const stream = page.getByTestId('streaming-preview');
  await expect(stream.locator('article[data-render-mode=interactive]')).toBeVisible({ timeout: 15_000 });
  const hours = stream.getByLabel('Hours this week', { exact: true });
  await expect(hours).toHaveValue('6');
  await hours.fill('9');
  await hours.blur();
  await expect(stream.getByText('Finished at 9 hours.', { exact: true })).toBeVisible();
  console.log('PASS Streaming Worker reaches the final interactive snapshot in the merged Playground');
} finally {
  await browser.close();
  await server?.close();
}
