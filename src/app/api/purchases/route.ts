import type { NextRequest } from "next/server";
import { integrationStatus } from "@/lib/server/purchase-config";
import { listPurchases } from "@/lib/server/purchase-db";
import { jsonBody, purchaseApi } from "@/lib/server/purchase-http";
import { createPurchase } from "@/lib/server/purchase-service";
export const runtime="nodejs";
export async function GET(request:NextRequest){return purchaseApi(request,async owner=>({config:integrationStatus(),purchases:await listPurchases(owner)}));}
export async function POST(request:NextRequest){return purchaseApi(request,async owner=>{const body=await jsonBody(request);return {purchase:await createPurchase(owner,body.mode,body.request,body.kind)};});}
