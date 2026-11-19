import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const url = new URL('/', process.env.DEMO_URL ?? 'http://127.0.0.1:5173');
url.searchParams.set('example', 'network-survey');
const channel = process.env.PLAYWRIGHT_CHANNEL;
const browser = await chromium.launch({
  headless: true,
  ...(channel && channel !== 'chromium' ? { channel } : {}),
});
try {
  const page = await browser.newPage();
  const requests = [];
  const closed = new Set();
  const path = '/__reactive-md/survey/results';
  page.on('request', request => {
    if (new URL(request.url()).pathname === path) requests.push(request);
  });
  for (const event of ['requestfinished', 'requestfailed']) {
    page.on(event, request => {
      if (new URL(request.url()).pathname === path) closed.add(request);
    });
  }

  const replies = [];
  await page.route('**/__reactive-md/survey/answers', async route => {
    const response = await route.fetch();
    replies.push({ key: route.request().headers()['idempotency-key'], body: await response.json() });
    if (replies.length === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  await page.goto(url.href);
  const tallies = page.locator('[data-survey-tally]:visible output');
  const send = page.getByRole('button', { name: 'Send response' });
  const status = page.locator('[data-rmd-component="submit-button"]').getByRole('status');
  await expect(tallies).toHaveCount(2);
  await expect(tallies.first()).toHaveText(/^Yes \d+ · No \d+$/);
  const before = await tallies.first().textContent();
  const [, yes, no] = /^Yes (\d+) · No (\d+)$/.exec(before);
  assert.equal(requests.length, 1);

  await page.getByRole('textbox', { name: 'Comment' }).fill('Local Demo verification');
  await send.press('Enter');
  await expect(status).toContainText('Submission result is unconfirmed');
  const after = 'Yes ' + (Number(yes) + 1) + ' · No ' + no;
  await expect(tallies.first()).toHaveText(after);
  await expect(tallies.last()).toHaveText(after);

  await send.click();
  await expect(status).toHaveText('Submitted.');
  assert.equal(replies.length, 2);
  assert.ok(replies[0].key);
  assert.deepEqual(replies[1], replies[0]);
  assert.deepEqual(replies[0].body, { ok: true, counts: { yes: Number(yes) + 1, no: Number(no) } });
  await expect(tallies.first()).toHaveText(after);

  await page.getByRole('checkbox', { name: 'Show live tally' }).uncheck();
  await expect(tallies).toHaveCount(1);
  await expect(tallies.first()).toHaveText(after);
  assert.equal(closed.size, 0);
  await page.getByRole('checkbox', { name: 'Show second tally' }).uncheck();
  await expect(tallies).toHaveCount(0);
  await expect.poll(() => closed.size).toBe(1);
  assert.equal(requests.length, 1);
  console.log('PASS Demo 5173 survey submission, retry deduplication, and shared SSE cleanup');
} finally {
  await browser.close();
}
