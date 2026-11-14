import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server=await createServer({configFile:false,optimizeDeps:{entries:['tests/browser/preview-contrast.html']},server:{host:'127.0.0.1',port:0},appType:'mpa'});
const output='artifacts/preview-contrast';await mkdir(output,{recursive:true});
let browser;const results=[];
const luminance=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0);
try{
 await server.listen();browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:800,height:700},reducedMotion:'reduce'});
 for(const scheme of ['light','dark']){
  await page.goto(`${server.resolvedUrls.local[0]}tests/browser/preview-contrast.html?scheme=${scheme}`);
  const button=page.getByRole('button',{name:'检查答案',exact:true});await expect(button).toBeVisible();
  const paint=await button.evaluate(n=>({color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor,accentInk:getComputedStyle(n).getPropertyValue('--accent-ink')}));
  const channels=[luminance(paint.color),luminance(paint.background)].sort((a,b)=>a-b);
  const contrast=(channels[1]+0.05)/(channels[0]+0.05);
  results.push({scheme,paint,contrast});await writeFile(`${output}/paint.json`,JSON.stringify(results,null,2));
  await button.screenshot({path:`${output}/quiz-${scheme}.png`});
  const ink=scheme==='light'?'rgb(255, 255, 255)':'rgb(11, 18, 32)';
  await expect(button).toHaveCSS('color',ink);
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  for(const state of ['hover','active']){
    await button.hover();if(state==='active')await page.mouse.down();
    await expect(button).toHaveCSS('color',ink);
    if(state==='active')await page.mouse.up();
  }
  await expect(page.getByRole('button',{name:'原生主按钮'}).locator('span')).toHaveCSS('color',ink);
  await expect(page.getByRole('button',{name:'提交',exact:true})).toHaveCSS('color',ink);
  await expect(page.getByRole('button',{name:'禁用',exact:true})).toHaveCSS('color',ink);
  console.log(`PASS ${scheme}: Quiz/native primary foregrounds and states; contrast ${contrast.toFixed(2)}:1`);
 }
}finally{await browser?.close();await server.close();}
