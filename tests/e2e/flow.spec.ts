import { test, expect } from "@playwright/test";
test("payment gate, explicit approval, refresh and revision invalidation",async({page})=>{
 await page.goto("/cases/2405-117/checkout");await expect(page.getByRole("heading",{name:"Checkout is blocked."})).toBeVisible();
 await page.goto("/cases/2405-117/instruction");await page.getByRole("button",{name:"Use sample document"}).click();await page.getByRole("button",{name:"Save instruction"}).click();
 await page.getByRole("link",{name:"Continue to comparison"}).click();await page.getByRole("button",{name:"Run demo checks"}).click();await page.getByRole("link",{name:"Continue to buyer approval"}).click();
 await page.getByRole("button",{name:"Start simulated approval"}).click();await expect(page.getByRole("button",{name:"Simulate buyer approval"})).toBeDisabled();await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Simulate buyer approval"}).click();await expect(page.getByRole("heading",{name:"Approved in demo."})).toBeVisible();
 await page.reload();await expect(page.getByRole("heading",{name:"Approved in demo."})).toBeVisible();await page.getByRole("link",{name:"View evidence trail"}).click();await expect(page.getByRole("heading",{name:"Simulated approval authorized"})).toBeVisible();
 await page.goto("/cases/2405-117/instruction");await page.getByLabel("Amount",{exact:false}).fill("100.00");await page.getByRole("button",{name:"Save instruction"}).click();await page.goto("/cases/2405-117/checkout");await expect(page.getByRole("heading",{name:"Checkout is blocked."})).toBeVisible();
});
test("product mismatch blocks checkout until a corrected offer is checked",async({page})=>{
 await page.goto("/cases/NVME-512/comparison");await page.getByRole("button",{name:"Run demo checks"}).click();await expect(page.getByText("Requested 512GB; offered 256GB.",{exact:false})).toBeVisible();await page.goto("/cases/NVME-512/checkout");await expect(page.getByRole("heading",{name:"Checkout is blocked."})).toBeVisible();
 await page.goto("/cases/NVME-512/comparison");await page.getByLabel("Demo offered capacity").selectOption("512");await page.getByRole("button",{name:"Save revised offer"}).click();await page.getByRole("button",{name:"Run demo checks"}).click();await page.getByRole("link",{name:"Continue to buyer approval"}).click();await page.getByRole("button",{name:"Start simulated approval"}).click();await page.getByRole("button",{name:"Cancel approval"}).click();await expect(page.getByText("Previous simulation canceled.",{exact:false})).toBeVisible();
});
test("responsive pages keep controls available without page overflow",async({page})=>{
 for(const width of [320,375,768,1024,1440]){await page.setViewportSize({width,height:900});for(const route of ["/","/cases","/cases/NVME-512/comparison","/cases/2405-117/instruction","/cases/2405-117/checkout","/rules","/activity"]){await page.goto(route);await expect(page.locator("h1")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();}}
});
