import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PurchaseError, record } from "@/features/purchase/model";
import { appOrigin } from "./purchase-config";
import { ACCESS_COOKIE, validAccessToken } from "./demo-access";
const COOKIE="aegiron_purchase_session";
export async function purchaseApi(request:NextRequest,action:(owner:string)=>unknown|Promise<unknown>) {
  try{
    if(request.method!=="GET"&&request.headers.get("origin")!==appOrigin())throw new PurchaseError(403,"This request must come from the configured AEGIRON application origin.");
    if(!validAccessToken(request.cookies.get(ACCESS_COOKIE)?.value))throw new PurchaseError(401,"Enter the demo access code to open this workspace.");
    const existing=request.cookies.get(COOKIE)?.value;
    const token=existing&&/^[a-f0-9]{64}$/.test(existing)?existing:randomBytes(32).toString("hex");
    const owner=createHash("sha256").update(token).digest("hex");
    const data=await action(owner);const response=NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
    if(token!==existing)response.cookies.set(COOKIE,token,{httpOnly:true,sameSite:"lax",secure:appOrigin().startsWith("https:"),path:"/",maxAge:60*60*24*7});
    return response;
  }catch(error){const known=error instanceof PurchaseError;return NextResponse.json({...(known&&error.status===401?{code:"DEMO_ACCESS_REQUIRED"}:{}),error:known?error.message:"The server could not complete this operation. No success was recorded."},{status:known?error.status:500,headers:{"Cache-Control":"no-store"}});}
}
export async function jsonBody(request:NextRequest) {
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new PurchaseError(415,"Send an application/json request.");
  const reader=request.body?.getReader();if(!reader)throw new PurchaseError(400,"A JSON body is required.");
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384){await reader.cancel();throw new PurchaseError(413,"Request body exceeds the 16KB limit.");}chunks.push(part.value);}}finally{reader.releaseLock();}
  try{return record(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{throw new PurchaseError(400,"Invalid JSON object.");}
}
