import type { NextRequest } from "next/server";
import { PurchaseError } from "@/features/purchase/model";
import { getPurchase } from "@/lib/server/purchase-db";
import { jsonBody, purchaseApi } from "@/lib/server/purchase-http";
import { beginCheckout, cancelCheckout, changeOffer, checkPurchase, confirmRequirements, verifyCheckout } from "@/lib/server/purchase-service";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,context:Context){return purchaseApi(request,async owner=>({purchase:await getPurchase(owner,(await context.params).id)}));}
export async function POST(request:NextRequest,context:Context){return purchaseApi(request,async owner=>{const {id}=await context.params;const body=await jsonBody(request);let purchase;switch(body.action){case "requirements":purchase=await confirmRequirements(owner,id,body.revision,body.requirements,body.consent);break;case "offer":purchase=await changeOffer(owner,id,body.revision,body.offer);break;case "review":purchase=await checkPurchase(owner,id,body.revision,body.mode);break;case "checkout":purchase=await beginCheckout(owner,id,body.revision,body.consent);break;case "verify":purchase=await verifyCheckout(owner,id,body.revision,body.orderId,body.state);break;case "cancel":purchase=await cancelCheckout(owner,id,body.revision,body.state);break;default:throw new PurchaseError(400,"Unsupported purchase action.");}return {purchase};});}
