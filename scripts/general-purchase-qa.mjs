import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const errors=[],scans=[];
page.on('pageerror',error=>errors.push(error.message));
async function scan(state){
  const result=await new AxeBuilder({page}).exclude('nextjs-portal').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  scans.push({state,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))});
  await page.screenshot({path:`design/qa/${state}.png`,fullPage:true});
}
try{
  for(const kind of ['product','payment']){
    await page.goto('http://127.0.0.1:3000/purchase?view=instruction');
    await page.getByLabel('Instruction type',{exact:true}).selectOption(kind);
    await page.getByRole('button',{name:'Load example without AI',exact:true}).click();
    await page.getByRole('checkbox',{name:/I confirm this instruction/}).waitFor();
    await scan(`general-${kind}-instruction`);
    await page.getByRole('checkbox',{name:/I confirm this instruction/}).check();
    await page.getByRole('button',{name:kind==='product'?'Confirm buyer requirements':'Confirm payment instruction',exact:true}).click();
    await page.getByRole('button',{name:'Run rules only (no AI)',exact:true}).click();
    await page.getByText('Mismatch',{exact:true}).first().waitFor();
    await page.getByText(kind==='product'?'Edit merchant test offer':'Edit payment proposal',{exact:true}).click();
    await scan(`general-${kind}-comparison`);
    await page.setViewportSize({width:375,height:900});
    if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw new Error(`${kind} mobile overflow`);
    await scan(`general-${kind}-mobile`);
    await page.setViewportSize({width:1440,height:1000});
    if(kind==='payment'){
      await page.getByRole('button',{name:'View checkout status',exact:true}).click();
      await page.getByRole('heading',{name:'Checkout blocked.',exact:true}).waitFor();
      await scan('general-payment-approval');
      await page.getByRole('button',{name:/^04\s*Evidence/}).click();
      await scan('general-payment-evidence');
    }
  }
  await writeFile('design/qa/general-accessibility.json',JSON.stringify({errors,scans},null,2));
  console.log(JSON.stringify({errors,scans:scans.map(s=>({state:s.state,violations:s.violations.length}))}));
  if(errors.length||scans.some(s=>s.violations.length))process.exitCode=1;
}finally{await browser.close();}
