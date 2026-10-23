import {createServer} from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { chromium,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`,code='synthetic-local-access-test-code';
let serverErrors='';
const server=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,AEGIRON_APP_ORIGIN:base,AEGIRON_DEMO_ACCESS_CODE:code,AEGIRON_DATA_DIR:mkdtempSync(join(tmpdir(),'aegiron-access-')),DATABASE_URL:'',VERCEL:'',OPENAI_API_KEY:'',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:'',PAYPAL_MERCHANT_ID:''},stdio:['ignore','ignore','pipe'],windowsHide:true});
server.stderr.on('data',chunk=>{serverErrors+=chunk.toString();});
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Access-test server exited. '+serverErrors.slice(-500));try{const r=await fetch(base+'/api/purchases');if(r.status===401){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw new Error('Isolated access-test server did not become ready. '+serverErrors.slice(-500));
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
  const denied=await context.request.get(base+'/api/purchases');expect(denied.status()).toBe(401);const deniedData=await denied.json();expect(deniedData.code,JSON.stringify(deniedData)).toBe('DEMO_ACCESS_REQUIRED');
  const crossOrigin=await context.request.post(base+'/api/demo-access',{headers:{Origin:'https://untrusted.example'},data:{code}});expect(crossOrigin.status()).toBe(403);
  await page.goto(base+'/purchase?view=instruction');await expect(page.getByRole('heading',{name:'Open the workspace',exact:true})).toBeVisible();
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
  await page.screenshot({path:'design/qa/demo-access-desktop.png',fullPage:true});await page.setViewportSize({width:375,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'design/qa/demo-access-mobile.png',fullPage:true});
  await page.getByLabel('Demo access code',{exact:true}).fill('incorrect');await page.getByRole('button',{name:'Enter workspace',exact:true}).click();await expect(page.getByText('That access code was not accepted.',{exact:true})).toBeVisible();
  await page.getByLabel('Demo access code',{exact:true}).fill(code);await page.getByRole('button',{name:'Enter workspace',exact:true}).click();await expect(page.getByLabel('Buyer request',{exact:true})).toBeVisible();
  const accessCookie=(await context.cookies()).find(c=>c.name==='aegiron_demo_access');expect(accessCookie?.httpOnly).toBe(true);expect(accessCookie?.sameSite).toBe('Lax');
  const created=await context.request.post(base+'/api/purchases',{headers:{Origin:base},data:{mode:'example',kind:'product'}});expect(created.status()).toBe(200);const {purchase}=await created.json();
  const other=await browser.newContext();await other.request.post(base+'/api/demo-access',{headers:{Origin:base},data:{code}});const isolated=await other.request.get(base+'/api/purchases/'+purchase.id);expect(isolated.status()).toBe(404);
  await context.addCookies([{name:'aegiron_demo_access',value:'forged',url:base}]);expect((await context.request.get(base+'/api/purchases')).status()).toBe(401);
  for(let i=0;i<30;i++)await other.request.post(base+'/api/demo-access',{headers:{Origin:base},data:{code:'wrong'}});
  expect((await other.request.post(base+'/api/demo-access',{headers:{Origin:base},data:{code:'wrong'}})).status()).toBe(429);
  console.log('Demo access passed: unauthenticated denial, origin checks, wrong-code feedback, login, HttpOnly cookie, owner isolation, forgery rejection, login limits, accessibility and mobile layout. No external AI or payment calls.');
}finally{if(browser)await browser.close();server.kill();}
