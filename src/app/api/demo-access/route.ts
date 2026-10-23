import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/server/purchase-config";
import { jsonBody } from "@/lib/server/purchase-http";
import { consumeQuota } from "@/lib/server/purchase-db";
import { ACCESS_COOKIE, ACCESS_SECONDS, accessRequired, createAccessToken, validAccessCode } from "@/lib/server/demo-access";
import { PurchaseError } from "@/features/purchase/model";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  try{
    if(request.headers.get("origin")!==appOrigin())throw new PurchaseError(403,"Use the configured application origin.");
    if(!accessRequired())throw new PurchaseError(400,"This local workspace does not require a demo code.");
    const body=await jsonBody(request);
    await consumeQuota([{owner:"demo-login",key:`minute:${new Date().toISOString().slice(0,16)}`,max:30}],"Too many demo access attempts. Try again in a minute.");
    if(!validAccessCode(body.code))throw new PurchaseError(401,"That access code was not accepted.");
    const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    response.cookies.set(ACCESS_COOKIE,createAccessToken(),{httpOnly:true,sameSite:"lax",secure:appOrigin().startsWith("https:"),path:"/",maxAge:ACCESS_SECONDS});return response;
  }catch(error){return NextResponse.json({error:error instanceof PurchaseError?error.message:"Demo access could not be checked. Try again later."},{status:error instanceof PurchaseError?error.status:503,headers:{"Cache-Control":"no-store"}});}
}
