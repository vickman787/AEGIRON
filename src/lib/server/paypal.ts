import { PurchaseError, type Checkout } from "@/features/purchase/model";
import { minorUnits } from "@/lib/cases";
import { paypalCredentials } from "./purchase-config";
import type { Fetcher } from "./purchase-ai";
const BASE="https://api-m.sandbox.paypal.com";
type Money={currency_code?:string;value?:string};
export type PayPalAuthorization={id?:string;status?:string;amount?:Money;expiration_time?:string};
export type PayPalOrder={id?:string;intent?:string;status?:string;purchase_units?:{reference_id?:string;custom_id?:string;amount?:Money;payee?:{merchant_id?:string};payments?:{authorizations?:PayPalAuthorization[];captures?:unknown[]}}[];links?:{rel?:string;href?:string}[]};
export class PayPalClient {
  private token:string|null=null;
  constructor(private fetcher:Fetcher=fetch){}
  private async request(path:string,method:string,body?:unknown,key?:string):Promise<unknown>{
    if(!this.token){const {clientId,secret}=paypalCredentials();let result:Response;try{result=await this.fetcher(`${BASE}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",signal:AbortSignal.timeout(20000)});}catch{throw new PurchaseError(502,"PayPal sandbox could not be reached. Retry this same checkout attempt.");}if(!result.ok)throw new PurchaseError(502,"PayPal sandbox rejected its app credentials or is unavailable.");const data=await result.json() as {access_token?:unknown};if(typeof data.access_token!=="string")throw new PurchaseError(502,"PayPal sandbox returned an invalid access token.");this.token=data.access_token;}
    let response:Response;try{response=await this.fetcher(`${BASE}${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,"Content-Type":"application/json",Prefer:"return=representation",...(key?{"PayPal-Request-Id":key}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});}catch{throw new PurchaseError(502,"PayPal sandbox did not confirm the outcome. Retry verification; do not start another purchase.");}
    if(!response.ok)throw new PurchaseError(response.status===422?409:502,response.status===422?"PayPal sandbox could not complete this operation in its current state. Retry verification after buyer approval.":"PayPal sandbox is unavailable or rejected the request. Retry this same attempt.");
    try{return await response.json();}catch{throw new PurchaseError(502,"PayPal sandbox returned an unreadable result. Retry verification.");}
  }
  async create(checkout:Checkout,caseId:string):Promise<PayPalOrder>{
    return await this.request("/v2/checkout/orders","POST",{intent:"AUTHORIZE",purchase_units:[{reference_id:caseId,custom_id:checkout.customId,payee:{merchant_id:checkout.merchantId},description:"AEGIRON sandbox authorization for a buyer-confirmed instruction. No goods supplied.",amount:{currency_code:"USD",value:checkout.amount}}],payment_source:{paypal:{experience_context:{brand_name:"AEGIRON",shipping_preference:"NO_SHIPPING",user_action:"CONTINUE",return_url:`${checkout.origin}/purchase?case=${caseId}&paypal=return&state=${checkout.state}`,cancel_url:`${checkout.origin}/purchase?case=${caseId}&paypal=cancel&state=${checkout.state}`}}}},`c-${checkout.attemptId.replaceAll("-","")}`) as PayPalOrder;
  }
  async order(id:string){return await this.request(`/v2/checkout/orders/${encodeURIComponent(id)}`,"GET") as PayPalOrder;}
  async authorize(checkout:Checkout){return await this.request(`/v2/checkout/orders/${encodeURIComponent(checkout.orderId!)}/authorize`,"POST",{},`a-${checkout.attemptId.replaceAll("-","")}`) as PayPalOrder;}
  async authorization(id:string){return await this.request(`/v2/payments/authorizations/${encodeURIComponent(id)}`,"GET") as PayPalAuthorization;}
}
function sameAmount(amount:Money|undefined,expected:string){return typeof amount?.value==="string"&&amount.currency_code==="USD"&&minorUnits(amount.value)!==null&&minorUnits(amount.value)===minorUnits(expected);}
export function validateOrder(order:PayPalOrder,checkout:Checkout,caseId:string){
  const units=order.purchase_units;const unit=units?.[0];
  if(order.id!==checkout.orderId||order.intent!=="AUTHORIZE"||units?.length!==1||unit?.reference_id!==caseId||unit?.custom_id!==checkout.customId||unit?.payee?.merchant_id!==checkout.merchantId||!sameAmount(unit?.amount,checkout.amount)||unit?.payments?.captures?.length)throw new PurchaseError(409,"PayPal order details do not match this case, revision, merchant, or amount. Authorization is blocked.");
}
export function validateAuthorization(authorization:PayPalAuthorization,checkout:Checkout){
  if(!authorization.id||!sameAmount(authorization.amount,checkout.amount)||!["CREATED","PENDING"].includes(authorization.status??""))throw new PurchaseError(409,"The provider has not confirmed a valid authorization for this purchase.");
  const expires=authorization.expiration_time?Date.parse(authorization.expiration_time):NaN;
  if(authorization.status==="CREATED"&&(!Number.isFinite(expires)||expires<=Date.now()))throw new PurchaseError(409,"The PayPal authorization is missing a valid future expiration.");
}
export function approvalUrl(order:PayPalOrder){
  const href=order.links?.find(l=>l.rel==="payer-action"||l.rel==="approve")?.href;
  if(!href)throw new PurchaseError(502,"PayPal did not provide a buyer approval link.");
  try{const url=new URL(href);if(url.protocol!=="https:"||!["www.sandbox.paypal.com","sandbox.paypal.com"].includes(url.hostname)||url.username||url.password)throw new Error("host");return url.href;}catch{throw new PurchaseError(502,"PayPal returned an unexpected approval address.");}
}
