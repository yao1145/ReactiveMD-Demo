import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { openWorkbench, clickWorkbenchAction, replaceWorkbenchSource, openDeveloperCard } from './workbench-ui.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = process.env.DEMO_URL ? null : await createServer({ root, server: { host: '127.0.0.1', port: 0 } });
await server?.listen();
const baseURL = process.env.DEMO_URL ?? `http://127.0.0.1:${server.httpServer.address().port}`;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'chromium';
const browser = await chromium.launch({ channel: channel === 'chromium' ? undefined : channel, headless: true });
await mkdir('artifacts/browser-smoke', { recursive: true });

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openWorkbench(page, baseURL);

    await expect(page.locator('.local-document')).toBeVisible();
    await expect(page.getByRole('slider', { name: 'People', exact: true })).toBeVisible();

    const slider = page.getByRole('slider', { name: 'People', exact: true });
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(page.locator('.local-document')).toContainText('Current headcount: 3');

    if (width === 390) {
      await clickWorkbenchAction(page, 'Show source');
      await expect(page.locator('#source-editor')).toBeVisible();
    } else {
      await clickWorkbenchAction(page, 'Show source');
      await clickWorkbenchAction(page, /^Export/);
      await expect(page.getByRole('dialog')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('dialog').getByRole('button', {name: 'Export HTML', exact: true}).click();
      const download = await downloadPromise;
      const htmlPath = resolve('artifacts/browser-smoke/export.html');
      await download.saveAs(htmlPath);
      await expect(page.getByRole('dialog')).toBeHidden();
      const offline = await browser.newPage();
      const offlineErrors = [];
      const requests = [];
      offline.on('pageerror', error => offlineErrors.push(error.message));
      offline.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
      await offline.goto(pathToFileURL(htmlPath).href);
      await expect(offline.locator('.local-document')).toHaveAttribute('data-render-mode', 'interactive');
      await expect(offline.locator('.local-document')).toContainText('Current headcount: 2');
      const offlineSlider = offline.getByRole('slider', { name: 'People', exact: true });
      await offlineSlider.focus();
      await offlineSlider.press('ArrowRight');
      await expect(offline.locator('.local-document')).toContainText('Current headcount: 3');
      expect(offlineErrors).toEqual([]);
      expect(requests).toEqual([]);
      await offline.close();

      const exportCard = await openDeveloperCard(page, 'Export');
      await exportCard.getByRole('button', { name: 'Open export dialog', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('radio', { name: 'PDF', exact: true }).check();
      const pdfButton = dialog.getByRole('button', { name: /^(Download PDF|Print or save PDF)$/ });
      const pdfAction = (await pdfButton.textContent())?.trim();
      // The dev server renders the PDF through /__reactive-md/pdf, while the
      // production build prints the static HTML and saves it through the
      // browser. Exercise whichever path this target actually offers.
      const devPdf = pdfAction === 'Download PDF';
      if (devPdf) {
        // Hold the PDF request open until the dialog is cancelled. The attempt
        // must end with export-cancel before the late response can report.
        let releasePdf;
        const pdfGate = new Promise(resolve => { releasePdf = resolve; });
        let markPdfRequested;
        const pdfRequested = new Promise(resolve => { markPdfRequested = resolve; });
        await page.route('**/__reactive-md/pdf', async route => {
          markPdfRequested();
          await pdfGate;
          await route.fulfill({ status: 500, body: 'PDF test failure' }).catch(() => {});
        });
        const cancelledResponse = page.waitForResponse('**/__reactive-md/pdf');
        await pdfButton.click();
        await pdfRequested;
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dialog).toBeHidden();
        releasePdf();
        await cancelledResponse;
        await page.unroute('**/__reactive-md/pdf');

        // A late result from the cancelled attempt must not write back into
        // the reopened dialog either.
        await exportCard.getByRole('button', { name: 'Open export dialog', exact: true }).click();
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('[role=alert]')).toHaveCount(0);
        await dialog.getByRole('radio', { name: 'PDF', exact: true }).check();
        await page.route('**/__reactive-md/pdf', route => route.fulfill({ status: 500, body: 'PDF test failure' }));
        await pdfButton.click();
        await expect(dialog.locator('[role=alert]')).toContainText('PDF test failure');
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await page.unroute('**/__reactive-md/pdf');
      } else {
        // Headless printing is a no-op, so a successful print attempt closes the
        // dialog; the export-end status records that the print interaction ended.
        await pdfButton.click();
        await expect(dialog).toBeHidden();
      }
      const traceCard = await openDeveloperCard(page, 'Diagnostic events');
      const traceList = traceCard.locator('ol');
      await expect(traceList).toContainText('export-end');
      await expect(traceList.locator('li').filter({ hasText: 'export-end' }).filter({ hasText: 'ok' })).toHaveCount(1);
      if (devPdf) {
        const cancelItem = traceList.locator('li').filter({ hasText: 'export-cancel' });
        await expect(cancelItem).toHaveCount(1);
        await expect(cancelItem).toContainText('cancelled');
        await expect(cancelItem).toContainText('pdf');
        const errorItem = traceList.locator('li').filter({ hasText: 'export-error' });
        await expect(errorItem).toHaveCount(1);
        await expect(errorItem).toContainText('failed');
        await expect(traceCard.locator('ul')).toContainText('local.export.failure');
      } else {
        await expect(traceList.locator('li').filter({ hasText: 'export-end' }).filter({ hasText: 'printed' })).toHaveCount(1);
        await expect(traceList.locator('li').filter({ hasText: 'export-cancel' })).toHaveCount(0);
      }
      await traceCard.getByRole('button', { name: 'Copy diagnostic report', exact: true }).click();
      await expect(traceCard.getByRole('status')).toHaveText('Copied');
      const report = await page.evaluate(async () => JSON.parse(await navigator.clipboard.readText()));
      expect(report.schema).toBe('reactive-md-diagnostic/v1');
      expect(report.environment.runtime).toBe('browser');
      expect(report.package.editor).toBeTruthy();
      expect(report.package.react).toBeTruthy();
      expect(report.package.vite).toBeTruthy();
      expect(report.document.sourceDigest).toBeTruthy();
      expect(report.document.source).toBeUndefined();
      const exportEvents = report.events.filter(event => event.type.startsWith('export-'));
      const starts = exportEvents.filter(event => event.type === 'export-start').map(event => event.traceId);
      expect(starts.length).toBeGreaterThan(0);
      for (const traceId of starts) {
        expect(exportEvents.filter(event => event.traceId === traceId && event.type !== 'export-start')).toHaveLength(1);
      }
      if (devPdf) {
        expect(exportEvents).toContainEqual(expect.objectContaining({ type: 'export-end', status: 'ok', stage: 'download' }));
        expect(exportEvents).toContainEqual(expect.objectContaining({ type: 'export-cancel', status: 'cancelled', stage: 'pdf' }));
        expect(exportEvents).toContainEqual(expect.objectContaining({ type: 'export-error', status: 'failed', stage: 'pdf' }));
        expect(report.diagnostics).toContainEqual(expect.objectContaining({ code: 'local.export.failure', details: expect.objectContaining({ stage: 'pdf' }) }));
      } else {
        expect(exportEvents).toContainEqual(expect.objectContaining({ type: 'export-end', status: 'printed', stage: 'pdf' }));
        expect(exportEvents.filter(event => event.type === 'export-cancel')).toHaveLength(0);
        expect(report.diagnostics).not.toContainEqual(expect.objectContaining({ code: 'local.export.failure' }));
      }
    }
    await replaceWorkbenchSource(page, '# Migration check\n\nWorker boundary {{ 2 + 1 }}');
    await expect(page.locator('.local-document')).toContainText('Worker boundary 3');
    if (width === 1440) {
      for (let revision = 0; revision < 26; revision++) {
        await replaceWorkbenchSource(page, `# Trace check ${revision}\n\nWorker boundary {{ 2 + 1 }}`);
        await expect(page.locator('.local-document')).toContainText(`Trace check ${revision}`);
      }
      const traceCard = await openDeveloperCard(page, 'Diagnostic events');
      await expect(traceCard.locator('ol > li')).toHaveCount(50);
      await expect(traceCard.locator('ol')).toContainText('worker-response');
      await page.screenshot({ path: 'artifacts/browser-smoke/diagnostic-events.png', fullPage: true });
    }
    expect(errors).toEqual([]);
    await page.close();
  }
  console.log('PASS browser smoke (desktop and mobile)');
} finally {
  await browser.close();
  await server?.close();
}
