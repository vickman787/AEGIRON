import { test, expect } from "@playwright/test";
test("server purchase blocks mismatch, accepts a corrected offer and survives localStorage clear",async({page})=>{
  await page.goto("/purchase?view=instruction");await page.getByRole("button",{name:"Load SSD example"}).click();
  await expect(page.getByText("Manually authored example",{exact:true})).toBeVisible();
  await page.getByRole("checkbox",{name:/I confirm these structured requirements/}).check();await page.getByRole("button",{name:"Confirm buyer requirements"}).click();
  await expect(page.getByRole("heading",{name:"Comparison Matrix",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Run rules only (no AI)"}).click();await expect(page.getByText("Mismatch",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"View checkout status",exact:true}).click();await expect(page.getByRole("heading",{name:"Checkout blocked.",exact:true})).toBeVisible();
  await page.getByRole("button",{name:/^02\s*Comparison/}).click();await page.getByText("Edit merchant test offer",{exact:true}).click();
  await page.getByLabel("Offered capacity (GB)",{exact:false}).fill("512");await page.getByLabel("Merchant description",{exact:true}).fill("Portable external SSD, 512GB, USB-C, two-year warranty. Sandbox test offer; no goods.");await page.getByRole("button",{name:"Save merchant offer"}).click();
  await page.getByRole("button",{name:"Run rules only (no AI)"}).click();await expect(page.getByText("Rules passed · AI review required",{exact:true})).toBeVisible();await page.getByRole("button",{name:"View checkout status",exact:true}).click();await expect(page.getByRole("heading",{name:"An AI review is still required."})).toBeVisible();
  await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.getByText("Rules passed · AI review required",{exact:true})).toBeVisible();await page.getByRole("button",{name:/^02\s*Comparison/}).click();await page.getByText("Edit merchant test offer",{exact:true}).click();await expect(page.getByLabel("Offered capacity (GB)",{exact:false})).toHaveValue("512");
  await page.getByRole("button",{name:/^04\s*Evidence/}).click();await expect(page.getByRole("heading",{name:"Merchant offer revised",exact:true})).toBeVisible();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export purchase evidence"}).click();expect((await download).suggestedFilename()).toMatch(/^aegiron-.*-evidence\.json$/);
});
test("HTTP boundary enforces origin, session isolation and revision freshness",async({page,browser})=>{
  const origin="http://127.0.0.1:3000";
  const wrong=await page.request.post("/api/purchases",{headers:{Origin:"https://evil.example"},data:{mode:"example"}});expect(wrong.status()).toBe(403);
  const created=await page.request.post("/api/purchases",{headers:{Origin:origin},data:{mode:"example"}});expect(created.status()).toBe(200);const {purchase}=await created.json();
  const other=await browser.newContext();const denied=await other.request.get(`${origin}/api/purchases/${purchase.id}`);expect(denied.status()).toBe(404);await other.close();
  const stale=await page.request.post(`/api/purchases/${purchase.id}`,{headers:{Origin:origin},data:{action:"requirements",revision:0,requirements:purchase.requirements,consent:true}});expect(stale.status()).toBe(409);
  const noConsent=await page.request.post(`/api/purchases/${purchase.id}`,{headers:{Origin:origin},data:{action:"requirements",revision:purchase.revision,requirements:purchase.requirements,consent:false}});expect(noConsent.status()).toBe(400);
  const large=await page.request.post("/api/purchases",{headers:{Origin:origin,"Content-Type":"application/json"},data:JSON.stringify({mode:"example",padding:"x".repeat(17000)})});expect(large.status()).toBe(413);
  const forged=await page.request.post(`/api/purchases/${purchase.id}`,{headers:{Origin:origin},data:{action:"verify",revision:purchase.revision,orderId:"CLIENTSUCCESS",state:"forged",authorized:true}});expect(forged.status()).toBe(409);
});
test("purchase workspace adapts to mobile widths",async({page})=>{
  await page.goto("/purchase?view=instruction");await page.getByRole("button",{name:"Load SSD example"}).click();
  for(const width of [320,375,768,1024,1440]){await page.setViewportSize({width,height:900});await expect(page.getByRole("heading",{name:"Purchase Instruction Editor",exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.getByLabel("Requested capacity (GB)",{exact:false})).toBeVisible();}
});

test("authorized case renders the receipt and new-purchase navigation preserves the old case",async({page})=>{
  const origin="http://127.0.0.1:3000";
  const created=await page.request.post("/api/purchases",{headers:{Origin:origin},data:{mode:"example"}});
  const {purchase}=await created.json();
  const fixture={...purchase,confirmed:true,offer:{...purchase.offer,capacityGb:512},checkout:{status:"authorized",orderId:"SYNTHETIC-ORDER",authorizationId:"SYNTHETIC-AUTH",verifiedAt:"2026-10-16T16:55:10Z",revision:purchase.revision,amount:"79.00",currency:"USD"}};
  // Rendering fixture only: no provider transaction is created or claimed by this test.
  await page.route("**/api/purchases",async route=>{if(route.request().method()==="GET")await route.fulfill({json:{config:{aiConfigured:true,paypalConfigured:true,environment:"sandbox",storage:"server-sqlite"},purchases:[fixture]}});else await route.continue();});
  await page.goto(`/purchase?case=${purchase.id}&view=checkout&paypal=return&token=SYNTHETIC-ORDER&state=fixture`);
  await expect(page.getByRole("heading",{name:"PayPal sandbox authorization verified.",exact:true})).toBeVisible();
  await expect(page.getByText(/A PayPal return was received/)).toHaveCount(0);
  await page.getByRole("button",{name:/^04\s*Evidence/}).click();
  await expect(page.getByRole("heading",{name:"Verified",exact:true})).toBeVisible();
  await expect(page.getByText("SYNTHETIC-AUTH",{exact:true})).toBeVisible();
  await page.screenshot({path:"design/qa/canva-authorized-fixture.png",fullPage:true});
  await expect(page.getByRole("img",{name:"PayPal",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"AEGIRON home",exact:true}).click();
  await page.getByRole("link",{name:"Enter workspace",exact:true}).click();
  await page.getByRole("button",{name:"Start a purchase",exact:true}).click();
  await expect(page.getByRole("button",{name:"Interpret with AI",exact:true})).toBeVisible();
  await expect(page.getByRole("checkbox",{name:/I confirm these structured requirements/})).toHaveCount(0);
  await page.getByRole("link",{name:"Cases",exact:true}).click();
  await expect(page.getByRole("button",{name:new RegExp(`Case ${purchase.id.slice(0,8)}`,"i")})).toBeVisible();
});

test("non-storage product specifications block material and numeric mismatches",async({page})=>{
  await page.goto("/purchase?view=instruction");await expect(page.getByLabel("Buyer request",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Load example without AI",exact:true}).click();
  await expect(page.getByLabel("Requested item / model",{exact:true})).toHaveValue("Office chair");
  await page.getByRole("checkbox",{name:/I confirm this instruction/}).check();await page.getByRole("button",{name:"Confirm buyer requirements",exact:true}).click();
  await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByText("Mismatch",{exact:true})).toBeVisible();
  await page.getByText("Edit merchant test offer",{exact:true}).click();await page.getByLabel("Offered specification 2 value",{exact:true}).fill("mesh");
  await page.getByLabel("Proposal description",{exact:true}).fill("Two black mesh office chairs, 24-month warranty. Total USD 250 including all charges. Fictional test offer.");await page.getByRole("button",{name:"Save proposal",exact:true}).click();await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByText("Rules passed · AI review required",{exact:true})).toBeVisible();
  await page.getByLabel("Offered specification 3 value",{exact:true}).fill("12");await page.getByRole("button",{name:"Save proposal",exact:true}).click();await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByRole("row").filter({hasText:"Warranty"})).toContainText("Mismatch");
  await page.setViewportSize({width:375,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:"design/qa/general-product-mobile.png",fullPage:true});
});

test("payment instructions enforce exact amount, invoice reference and recipient before checkout",async({page})=>{
  await page.goto("/purchase?view=instruction");await page.getByLabel("Instruction type",{exact:true}).selectOption("payment");await page.getByRole("button",{name:"Load example without AI",exact:true}).click();
  await expect(page.getByLabel("Payment reference",{exact:true})).toHaveValue("INV-1042");await page.getByRole("checkbox",{name:/I confirm this instruction/}).check();await page.getByRole("button",{name:"Confirm payment instruction",exact:true}).click();await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByRole("row").filter({hasText:"Payment reference"})).toContainText("Mismatch");
  await page.getByText("Edit payment proposal",{exact:true}).click();await page.getByLabel("Proposed payment reference",{exact:true}).fill("INV-1042");await page.getByLabel("Proposed total (USD)",{exact:true}).fill("124.99");await page.getByLabel("Proposal description",{exact:true}).fill("Northwind Design. Website design milestone, INV-1042. Exact USD 124.99, configured sandbox merchant.");await page.getByRole("button",{name:"Save proposal",exact:true}).click();await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByRole("row").filter({hasText:"Exact amount"})).toContainText("Mismatch");
  await page.getByLabel("Proposed total (USD)",{exact:true}).fill("125.00");await page.getByLabel("Proposal description",{exact:true}).fill("Northwind Design. Website design milestone, INV-1042. Exact USD 125, configured sandbox merchant.");await page.getByRole("button",{name:"Save proposal",exact:true}).click();await page.getByRole("button",{name:"Run rules only (no AI)",exact:true}).click();await expect(page.getByText("Rules passed · AI review required",{exact:true})).toBeVisible();
  await page.screenshot({path:"design/qa/payment-instruction-comparison.png",fullPage:true});await page.getByRole("button",{name:"View checkout status",exact:true}).click();await expect(page.getByRole("heading",{name:"An AI review is still required.",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Create PayPal sandbox order",exact:true})).toHaveCount(0);
});
