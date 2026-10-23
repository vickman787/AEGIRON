import { PurchaseError, type Purchase } from "@/features/purchase/model";
import * as sqlite from "./purchase-sqlite";
import type { QuotaBucket } from "./purchase-postgres";
export { database } from "./purchase-sqlite";
export function storageMode():"server-postgres"|"server-sqlite"{
 if(process.env.DATABASE_URL)return "server-postgres";
 if(process.env.VERCEL)throw new PurchaseError(503,"Connect a persistent PostgreSQL database before using the hosted workspace.");
 return "server-sqlite";
}
async function store(){return storageMode()==="server-postgres"?await import("./purchase-postgres"):sqlite;}
export async function listPurchases(owner:string){return (await store()).listPurchases(owner);}
export async function getPurchase(owner:string,id:string){return (await store()).getPurchase(owner,id);}
export async function insertPurchase(owner:string,item:Purchase){return (await store()).insertPurchase(owner,item);}
export async function mutatePurchase(owner:string,id:string,operation:(item:Purchase)=>void){return (await store()).mutatePurchase(owner,id,operation);}
export async function consumeQuota(buckets:QuotaBucket[],message:string){return (await store()).consumeQuota(buckets,message);}
export async function consumeAiQuota(owner:string){
 const now=new Date().toISOString(),minute=now.slice(0,16),day=now.slice(0,10);
 await consumeQuota([{owner,key:'ai-minute:'+minute,max:8},{owner,key:'ai-day:'+day,max:50},{owner:'global-ai',key:'minute:'+minute,max:60},{owner:'global-ai',key:'day:'+day,max:200}],"AI request limit reached. Try again later.");
}
