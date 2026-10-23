import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PurchaseError, type Purchase } from "@/features/purchase/model";

const globalDatabase=globalThis as typeof globalThis&{aegironPurchaseDb?:DatabaseSync};
export function database() {
  if(!globalDatabase.aegironPurchaseDb){
    // Mutable database storage is provisioned at runtime, never bundled as source.
    const directory=resolve(/*turbopackIgnore: true*/ process.env.AEGIRON_DATA_DIR||resolve(process.cwd(),"data"));
    mkdirSync(directory,{recursive:true});
    const db=new DatabaseSync(resolve(directory,"aegiron.sqlite"));
    db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS purchases_owner ON purchases(owner); CREATE TABLE IF NOT EXISTS request_limits (owner TEXT NOT NULL, bucket TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner,bucket));");
    globalDatabase.aegironPurchaseDb=db;
  }
  return globalDatabase.aegironPurchaseDb;
}
export function listPurchases(owner:string):Purchase[] {
  const rows=database().prepare("SELECT data FROM purchases WHERE owner=? ORDER BY rowid DESC LIMIT 20").all(owner) as {data:string}[];
  return rows.map(row=>JSON.parse(row.data) as Purchase);
}
export function getPurchase(owner:string,id:string):Purchase {
  const row=database().prepare("SELECT data FROM purchases WHERE id=? AND owner=?").get(id,owner) as {data:string}|undefined;
  if(!row)throw new PurchaseError(404,"Purchase not found in this browser session.");
  return JSON.parse(row.data) as Purchase;
}
export function insertPurchase(owner:string,item:Purchase) {
  const db=database();db.exec("BEGIN IMMEDIATE");
  try{const row=db.prepare("SELECT COUNT(*) AS count FROM purchases WHERE owner=?").get(owner) as {count:number};if(row.count>=20)throw new PurchaseError(429,"This session has reached the 20-case prototype limit.");db.prepare("INSERT INTO purchases(id,owner,data) VALUES(?,?,?)").run(item.id,owner,JSON.stringify(item));db.exec("COMMIT");return item;}catch(error){db.exec("ROLLBACK");throw error;}
}
export function mutatePurchase(owner:string,id:string,operation:(item:Purchase)=>void):Purchase {
  const db=database();db.exec("BEGIN IMMEDIATE");
  try{const item=getPurchase(owner,id);operation(item);db.prepare("UPDATE purchases SET data=? WHERE id=? AND owner=?").run(JSON.stringify(item),id,owner);db.exec("COMMIT");return item;}catch(error){db.exec("ROLLBACK");throw error;}
}
export function consumeQuota(buckets:{owner:string;key:string;max:number}[],message:string) {
 const db=database();db.exec("BEGIN IMMEDIATE");
 try{for(const b of buckets){const row=db.prepare("SELECT count FROM request_limits WHERE owner=? AND bucket=?").get(b.owner,b.key) as {count:number}|undefined;if((row?.count??0)>=b.max)throw new PurchaseError(429,message);db.prepare("INSERT INTO request_limits(owner,bucket,count) VALUES(?,?,1) ON CONFLICT(owner,bucket) DO UPDATE SET count=count+1").run(b.owner,b.key);}db.exec("COMMIT");}catch(error){db.exec("ROLLBACK");throw error;}
}
