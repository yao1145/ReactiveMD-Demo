import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, mkdtemp, rmdir, readFile, writeFile, unlink, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorkbench, selectWorkbenchExample } from './workbench-ui.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const theme = path.join(root, 'theme/sci-fi/theme.css');
const probe = await mkdtemp(path.join(root, 'plugin/directory-watch-probe-'));
const entry = path.join(probe, 'index.ts');
const hidden = path.join(probe, 'disabled.ts');
const original = await readFile(theme, 'utf8');
const report = { checks: [], errors: [] };
const server = await createServer({ root, configFile: path.join(root,'vite.config.ts'), server: { host:'127.0.0.1', port:5188, strictPort:true, watch:{ ignored:['**/artifacts/**'] } } });
let browser;
const check = async (name, action) => { await action(); report.checks.push(name); console.log(`PASS ${name}`); };
const hostNames = page => page.evaluate(async () => {
  const module = await import('/@id/__x00__virtual:reactive-md/host');
  return module.host.config.components.map(item => item.name);
});
const hasProbe = async page => {
  try { return (await hostNames(page)).includes('directory-probe'); }
  catch(error) { if (/Execution context was destroyed|Cannot find context/.test(error.message)) return null; throw error; }
};
try {
  await server.listen();
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge';
  browser = await chromium.launch({ ...(channel==='chromium'?{}:{channel}), headless:true });
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await openWorkbench(page,server.resolvedUrls.local[0]);
  const examples = page.getByRole('button',{name:'Try examples',exact:true});
  if(await examples.isVisible())await examples.click();
  await selectWorkbenchExample(page, 'games');
  await expect(page.locator('[data-tetris]')).toBeVisible();
  await page.locator('[data-tetris-drop]').click();
  const moves = await page.locator('[data-tetris]').getAttribute('data-tetris-moves');
  await page.evaluate(async()=>{window.__directoryRuntimeMarker='kept';window.__directoryBundleModule=await import('/@id/__x00__virtual:reactive-md/bundle');});
  await check('theme CSS updates without resetting the page or game',async()=>{
    await writeFile(theme,original+'\n[data-rmd-theme="sci-fi"] { --directory-hmr-check: 731; }\n');
    await expect.poll(()=>page.locator('[data-rmd-theme="sci-fi"]').evaluate(el=>getComputedStyle(el).getPropertyValue('--directory-hmr-check').trim())).toBe('731');
    expect(await page.evaluate(()=>window.__directoryRuntimeMarker)).toBe('kept');
    expect(await page.locator('[data-tetris]').getAttribute('data-tetris-moves')).toBe(moves);
    await expect.poll(()=>page.evaluate(()=>window.__directoryBundleModule.default.css.includes('--directory-hmr-check: 731'))).toBe(true);
    const refreshed=await server.ssrLoadModule('virtual:reactive-md/host');
    expect(refreshed.host.css).toContain('--directory-hmr-check: 731');
  });
  await writeFile(theme,original);
  await expect.poll(()=>page.locator('[data-rmd-theme="sci-fi"]').evaluate(el=>getComputedStyle(el).getPropertyValue('--directory-hmr-check').trim())).toBe('');
  await mkdir(probe,{recursive:true});
  await check('adding a convention entry registers it',async()=>{
    await writeFile(entry,`import { defineReactComponentPackage } from 'reactive-md/react';\nexport default defineReactComponentPackage({ id:'test/directory-probe',name:'directory-probe',version:'1.0.0',capabilities:{interactive:true,static:true,ssr:true,offline:true},render:()=>null });\n`);
    await expect.poll(()=>hasProbe(page)).toBe(true);
  });
  await check('renaming an entry removes and restores registration',async()=>{
    await rename(entry,hidden);
    await expect.poll(()=>hasProbe(page)).toBe(false);
    await rename(hidden,entry);
    await expect.poll(()=>hasProbe(page)).toBe(true);
  });
  await check('deleting an entry removes registration',async()=>{
    await unlink(entry);
    await expect.poll(()=>hasProbe(page)).toBe(false);
  });
  expect(report.errors).toEqual([]);
} finally {
  await writeFile(theme,original);
  for(const file of [entry,hidden])try{await unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}
  await rmdir(probe);
  await browser?.close();
  await server.close();
  await mkdir(path.join(root,'artifacts/directory-consumer'),{recursive:true});
  await writeFile(path.join(root,'artifacts/directory-consumer/hmr-verification.json'),JSON.stringify(report,null,2));
}
