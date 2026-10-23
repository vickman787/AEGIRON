import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createPurchase, confirmRequirements, changeOffer, checkPurchase } from "../src/lib/server/purchase-service";
import { getPurchase, mutatePurchase, listPurchases, consumeQuota } from "../src/lib/server/purchase-db";
import { postgresPool, postgresConnectionString } from "../src/lib/server/purchase-postgres";
import { PurchaseError } from "../src/features/purchase/model";

if(!process.env.DATABASE_URL)throw new Error("Set DATABASE_URL to a test PostgreSQL database or provide ignored .env.release. No database URL is printed by this test.");
const owners:string[]=[];const owner=()=>{const id=`integration-${randomUUID()}`;owners.push(id);return id;};
const independent=new Pool({connectionString:postgresConnectionString(),max:1,connectionTimeoutMillis:20000,allowExitOnIdle:true});
after(async()=>{
  // Delete only records belonging to the UUID owners created by this run.
  try{await independent.query("DELETE FROM aegiron_purchases WHERE owner=ANY($1::text[])",[owners]);await independent.query("DELETE FROM aegiron_request_limits WHERE owner=ANY($1::text[])",[owners]);}
  finally{await independent.end();await postgresPool().end();}
});
const status=(n:number)=>(e:unknown)=>e instanceof PurchaseError&&e.status===n;
test("PostgreSQL persists confirmed revisions and isolates browser owners",async()=>{
  const session=owner();let item=await createPurchase(session,"example",null,"product");
  item=await confirmRequirements(session,item.id,item.revision,item.requirements,true);
  const record=await independent.query("SELECT data FROM aegiron_purchases WHERE id=$1 AND owner=$2",[item.id,session]);
  assert.equal(record.rows[0].data.confirmed,true);assert.equal(record.rows[0].data.revision,item.revision);
  assert.equal((await listPurchases(session))[0].id,item.id);
  await assert.rejects(()=>getPurchase(owner(),item.id),status(404));
  item=await checkPurchase(session,item.id,item.revision,"rules");assert.equal(item.review?.verdict,"mismatch");
});
test("concurrent PostgreSQL edits accept one revision and reject the stale edit",async()=>{
  const session=owner();const item=await createPurchase(session,"example",null,"product");
  const results=await Promise.allSettled([changeOffer(session,item.id,item.revision,{...item.offer,totalAmount:"240.00"}),changeOffer(session,item.id,item.revision,{...item.offer,totalAmount:"245.00"})]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  const rejected=results.find(r=>r.status==="rejected");assert.ok(rejected?.status==="rejected"&&status(409)(rejected.reason));
  const saved=await getPurchase(session,item.id);assert.equal(saved.revision,item.revision+1);
  await assert.rejects(()=>mutatePurchase(session,item.id,draft=>{draft.request="must roll back";throw new PurchaseError(400,"Synthetic rollback");}),status(400));
  assert.equal((await getPurchase(session,item.id)).request,item.request);
});
test("PostgreSQL enforces the session case limit under concurrent creation",async()=>{
  const session=owner();const results=await Promise.allSettled(Array.from({length:21},()=>createPurchase(session,"example",null,"payment")));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,20);
  const rejected=results.find(r=>r.status==="rejected");assert.ok(rejected?.status==="rejected"&&status(429)(rejected.reason));
  assert.equal((await listPurchases(session)).length,20);
});
test("PostgreSQL quotas are atomic, including rollback and concurrent callers",async()=>{
  const session=owner();const buckets=[{owner:session,key:"first",max:2},{owner:session,key:"second",max:1}];
  await consumeQuota(buckets,"Test limit");await assert.rejects(()=>consumeQuota(buckets,"Test limit"),status(429));
  const row=await independent.query("SELECT count FROM aegiron_request_limits WHERE owner=$1 AND bucket='first'",[session]);assert.equal(row.rows[0].count,1);
  const results=await Promise.allSettled(Array.from({length:5},()=>consumeQuota([{owner:session,key:"concurrent",max:1}],"Test limit")));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  for(const result of results)if(result.status==="rejected")assert.ok(status(429)(result.reason));
});
