import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PurchaseError } from "@/features/purchase/model";

export const ACCESS_COOKIE="aegiron_demo_access";
export const ACCESS_SECONDS=8*60*60;
function secret(){
  const code=process.env.AEGIRON_DEMO_ACCESS_CODE;
  if(!code&&process.env.VERCEL)throw new PurchaseError(503,"Set the hosted demo access code before opening the workspace.");
  if(code&&code.length<16)throw new PurchaseError(503,"The demo access code must contain at least 16 characters.");
  return code;
}
export function accessRequired(){return !!secret();}
export function validAccessCode(value:unknown){
  const code=secret();
  return !!code&&typeof value==="string"&&value.length<=300&&timingSafeEqual(createHash("sha256").update(value).digest(),createHash("sha256").update(code).digest());
}
export function createAccessToken(now=Date.now()){
  const code=secret();if(!code)throw new PurchaseError(503,"Demo access is not configured.");
  const payload=`${Math.floor(now/1000)+ACCESS_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256",code).update(payload).digest("hex")}`;
}
export function validAccessToken(value:string|undefined,now=Date.now()){
  const code=secret();if(!code)return true;
  if(!value||!/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value))return false;
  const [expires,nonce,signature]=value.split(".");const seconds=Math.floor(now/1000);
  if(Number(expires)<=seconds||Number(expires)>seconds+ACCESS_SECONDS)return false;
  return timingSafeEqual(Buffer.from(signature,"hex"),createHmac("sha256",code).update(`${expires}.${nonce}`).digest());
}
