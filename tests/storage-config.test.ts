import { test, after } from "node:test";
import assert from "node:assert/strict";
import { storageMode } from "../src/lib/server/purchase-db";
import { postgresConnectionString } from "../src/lib/server/purchase-postgres";
import { PurchaseError } from "../src/features/purchase/model";
const previousUrl=process.env.DATABASE_URL,previousVercel=process.env.VERCEL;
after(()=>{if(previousUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousUrl;if(previousVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=previousVercel;});
test("Vercel cannot silently use ephemeral SQLite storage",()=>{
  delete process.env.DATABASE_URL;delete process.env.VERCEL;assert.equal(storageMode(),"server-sqlite");
  process.env.VERCEL="1";assert.throws(()=>storageMode(),e=>e instanceof PurchaseError&&e.status===503);
  process.env.DATABASE_URL="postgresql://unit:unit@database.example/test";assert.equal(storageMode(),"server-postgres");
});
test("remote PostgreSQL connections require full TLS verification",()=>{
  process.env.DATABASE_URL="postgresql://unit:unit@database.example/test?sslmode=require&uselibpqcompat=true";
  const url=new URL(postgresConnectionString());assert.equal(url.searchParams.get("sslmode"),"verify-full");assert.equal(url.searchParams.has("uselibpqcompat"),false);
  process.env.DATABASE_URL="postgresql://unit:unit@localhost/test";assert.equal(new URL(postgresConnectionString()).searchParams.has("sslmode"),false);
});
