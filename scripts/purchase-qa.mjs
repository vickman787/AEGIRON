import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));const scans=[];
async function scan(state){const r=await new AxeBuilder({page}).exclude('nextjs-portal').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({state,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});}
async function screenshot(name){await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});await page.screenshot({path:`design/qa/canva-${name}.png`,fullPage:true});}
try{
await page.goto('http://127.0.0.1:3000/purchase?view=overview');await page.getByRole('button',{name:'Start a purchase',exact:true}).waitFor();await scan('overview');await screenshot('overview');
await page.getByRole('button',{name:'Start a purchase',exact:true}).click();await page.getByRole('button',{name:'Load SSD example'}).click();await page.getByLabel('Requested capacity (GB)',{exact:false}).waitFor();await scan('instruction');await screenshot('instruction');
await page.getByRole('checkbox',{name:/I confirm these structured requirements/}).check();await page.getByRole('button',{name:'Confirm buyer requirements',exact:true}).click();await page.getByRole('button',{name:'Run rules only (no AI)'}).click();await page.getByText('Mismatch',{exact:true}).waitFor();await scan('comparison');await screenshot('comparison');
await page.getByRole('button',{name:'View checkout status',exact:true}).click();await page.getByRole('heading',{name:'Checkout blocked.',exact:true}).waitFor();await scan('blocked-checkout');await screenshot('checkout');
await page.getByRole('button',{name:/^04\s*Evidence/}).click();await scan('pending-evidence');await screenshot('evidence');
await page.setViewportSize({width:375,height:900});await screenshot('mobile-evidence');await scan('mobile-evidence');
await page.getByRole('button',{name:/^02\s*Comparison/}).click();await page.getByRole('heading',{name:'Comparison Matrix',exact:true}).waitFor();await screenshot('mobile-comparison');await scan('mobile-comparison');
await writeFile('design/qa/canva-accessibility.json',JSON.stringify({errors,scans},null,2));console.log(JSON.stringify({errors,scans:scans.map(s=>({state:s.state,violations:s.violations.length}))}));
}finally{await browser.close();}
