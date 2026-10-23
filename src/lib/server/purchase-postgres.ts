import { Pool, type PoolClient } from "pg";
import { PurchaseError, type Purchase } from "@/features/purchase/model";

const state=globalThis as typeof globalThis&{aegironPg?:Pool;aegironPgReady?:Promise<void>};
export function postgresConnectionString(){
  const value=process.env.DATABASE_URL;
  if(!value)throw new PurchaseError(503,"Persistent database setup is required.");
  const url=new URL(value);
  if(!["postgres:","postgresql:"].includes(url.protocol))throw new PurchaseError(503,"Configure a PostgreSQL database URL.");
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(!local){url.searchParams.set("sslmode","verify-full");url.searchParams.delete("uselibpqcompat");}
  return url.toString();
}
export function postgresPool(){
  if(!state.aegironPg){
    const connectionString=postgresConnectionString();
    state.aegironPg=new Pool({connectionString,max:5,connectionTimeoutMillis:20000,idleTimeoutMillis:10000,allowExitOnIdle:true,statement_timeout:15000});
    state.aegironPg.on("error",()=>console.error("A database connection was interrupted."));
  }
  return state.aegironPg;
}
async function ready(){
  if(!state.aegironPgReady)state.aegironPgReady=initialize().catch(error=>{state.aegironPgReady=undefined;throw error;});
  await state.aegironPgReady;
}
async function initialize(){
  const client=await postgresPool().connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('aegiron:schema',0))");
    await client.query(`CREATE TABLE IF NOT EXISTS aegiron_purchases (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE INDEX IF NOT EXISTS aegiron_purchases_owner ON aegiron_purchases(owner,created_at DESC); CREATE TABLE IF NOT EXISTS aegiron_request_limits (owner TEXT NOT NULL, bucket TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner,bucket));`);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
async function transaction<T>(operation:(client:PoolClient)=>Promise<T>){
  await ready();const client=await postgresPool().connect();
  try{await client.query("BEGIN");const value=await operation(client);await client.query("COMMIT");return value;}
  catch(error){await client.query("ROLLBACK");throw error;}
  finally{client.release();}
}
export async function listPurchases(owner:string):Promise<Purchase[]>{await ready();const rows=await postgresPool().query("SELECT data FROM aegiron_purchases WHERE owner=$1 ORDER BY created_at DESC,id DESC LIMIT 20",[owner]);return rows.rows.map(row=>row.data as Purchase);}
export async function getPurchase(owner:string,id:string):Promise<Purchase>{await ready();const rows=await postgresPool().query("SELECT data FROM aegiron_purchases WHERE id=$1 AND owner=$2",[id,owner]);if(!rows.rowCount)throw new PurchaseError(404,"Purchase not found in this browser session.");return rows.rows[0].data as Purchase;}
export async function insertPurchase(owner:string,item:Purchase){
  return transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`cases:${owner}`]);
    const count=await client.query("SELECT count(*)::int AS count FROM aegiron_purchases WHERE owner=$1",[owner]);
    if(count.rows[0].count>=20)throw new PurchaseError(429,"This session has reached the 20-case prototype limit.");
    await client.query("INSERT INTO aegiron_purchases(id,owner,data) VALUES($1,$2,$3::jsonb)",[item.id,owner,JSON.stringify(item)]);return item;
  });
}
export async function mutatePurchase(owner:string,id:string,operation:(item:Purchase)=>void){
  return transaction(async client=>{
    const rows=await client.query("SELECT data FROM aegiron_purchases WHERE id=$1 AND owner=$2 FOR UPDATE",[id,owner]);
    if(!rows.rowCount)throw new PurchaseError(404,"Purchase not found in this browser session.");
    const item=rows.rows[0].data as Purchase;operation(item);
    await client.query("UPDATE aegiron_purchases SET data=$1::jsonb WHERE id=$2 AND owner=$3",[JSON.stringify(item),id,owner]);return item;
  });
}
export type QuotaBucket={owner:string;key:string;max:number};
export async function consumeQuota(buckets:QuotaBucket[],message:string){
  await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('aegiron:quotas',0))");
    for(const b of buckets){
      const current=await client.query("SELECT count FROM aegiron_request_limits WHERE owner=$1 AND bucket=$2",[b.owner,b.key]);
      if((current.rows[0]?.count??0)>=b.max)throw new PurchaseError(429,message);
      await client.query("INSERT INTO aegiron_request_limits(owner,bucket,count) VALUES($1,$2,1) ON CONFLICT(owner,bucket) DO UPDATE SET count=aegiron_request_limits.count+1",[b.owner,b.key]);
    }
  });
}
