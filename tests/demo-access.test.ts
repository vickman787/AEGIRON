import { test, after } from "node:test";
import assert from "node:assert/strict";
import { accessRequired, validAccessCode, validAccessToken, createAccessToken, ACCESS_SECONDS } from "../src/lib/server/demo-access";
import { PurchaseError } from "../src/features/purchase/model";
const beforeCode=process.env.AEGIRON_DEMO_ACCESS_CODE,beforeVercel=process.env.VERCEL;
after(()=>{if(beforeCode===undefined)delete process.env.AEGIRON_DEMO_ACCESS_CODE;else process.env.AEGIRON_DEMO_ACCESS_CODE=beforeCode;if(beforeVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=beforeVercel;});
test("hosted workspace fails closed without a strong demo secret",()=>{
  delete process.env.AEGIRON_DEMO_ACCESS_CODE;delete process.env.VERCEL;assert.equal(accessRequired(),false);assert.equal(validAccessToken(undefined),true);
  process.env.VERCEL="1";assert.throws(()=>accessRequired(),e=>e instanceof PurchaseError&&e.status===503);
  process.env.AEGIRON_DEMO_ACCESS_CODE="short";assert.throws(()=>accessRequired(),e=>e instanceof PurchaseError&&e.status===503);
});
test("access tokens reject forgery, expiry and secret rotation",()=>{
  process.env.AEGIRON_DEMO_ACCESS_CODE="synthetic-demo-code-for-unit-tests";
  assert.equal(validAccessCode("synthetic-demo-code-for-unit-tests"),true);assert.equal(validAccessCode("wrong"),false);assert.equal(validAccessCode(null),false);
  const now=Date.now(),token=createAccessToken(now);assert.equal(validAccessToken(token,now),true);assert.equal(validAccessToken(undefined,now),false);
  assert.equal(validAccessToken(`${token.slice(0,-1)}${token.endsWith("0")?"1":"0"}`,now),false);assert.equal(validAccessToken(token,now+(ACCESS_SECONDS+1)*1000),false);
  assert.equal(validAccessToken(token,now-10000),false);
  process.env.AEGIRON_DEMO_ACCESS_CODE="different-synthetic-demo-code";assert.equal(validAccessToken(token,now),false);
});
