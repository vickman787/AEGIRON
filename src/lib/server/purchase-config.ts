import { PurchaseError } from "@/features/purchase/model";
import { storageMode } from "./purchase-db";
export function appOrigin() {
  const value=process.env.AEGIRON_APP_ORIGIN||"http://127.0.0.1:3000";
  try{const url=new URL(value);if(url.username||url.password||url.pathname!=="/"||url.search||url.hash||!["http:","https:"].includes(url.protocol)||(url.protocol==="http:"&&!["localhost","127.0.0.1","[::1]"].includes(url.hostname)))throw new Error("origin");return url.origin;}catch{throw new PurchaseError(503,"Set AEGIRON_APP_ORIGIN to the application's origin (HTTPS for hosting).");}
}
export function integrationStatus() {return {aiConfigured:!!process.env.OPENAI_API_KEY,aiModel:process.env.OPENAI_MODEL||"gpt-4.1-mini",paypalConfigured:!!(process.env.PAYPAL_CLIENT_ID&&process.env.PAYPAL_CLIENT_SECRET&&process.env.PAYPAL_MERCHANT_ID),environment:"sandbox" as const,storage:storageMode()};}
export function paypalCredentials(){const {PAYPAL_CLIENT_ID:clientId,PAYPAL_CLIENT_SECRET:secret,PAYPAL_MERCHANT_ID:merchantId}=process.env;if(!clientId||!secret||!merchantId)throw new PurchaseError(503,"PayPal sandbox setup is required. Add the sandbox Client ID, Secret, and merchant ID to .env.local.");return {clientId,secret,merchantId};}
