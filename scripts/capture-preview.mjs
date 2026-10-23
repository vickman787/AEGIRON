import {chromium} from "@playwright/test";
const browser=await chromium.launch({channel:"msedge",headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
for(const [name,route] of [["instruction-desktop","/cases/2405-117/instruction"],["comparison-desktop","/cases/NVME-512/comparison"],["checkout-desktop","/cases/2405-117/checkout"],["evidence-desktop","/cases/2405-117/evidence"]]){
  await page.goto(`http://127.0.0.1:3000${route}`);await page.locator("h1").waitFor();await page.screenshot({path:`design/qa/${name}.png`,fullPage:true});
}
await page.setViewportSize({width:375,height:900});await page.goto("http://127.0.0.1:3000");await page.locator("h1").waitFor();await page.screenshot({path:"design/qa/overview-mobile.png",fullPage:true});await browser.close();console.log("Captured instruction, comparison, checkout, evidence, and mobile overview.");
