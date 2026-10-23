import { randomBytes } from "node:crypto";
import { EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_REQUIREMENTS, PurchaseError, addEvent, assertEditable, assertRevision, evaluatePurchase, invalidate, parseOffer, parseRequirements, purchaseReady, text, type Checkout, type Purchase } from "@/features/purchase/model";
import { consumeAiQuota, getPurchase, insertPurchase, mutatePurchase } from "./purchase-db";
import { extractRequirements, extractGeneralRequirements, reviewOffer } from "./purchase-ai";
import { generalExample, generalProposal } from "@/features/purchase/general-examples";
import { appOrigin, paypalCredentials } from "./purchase-config";
import { PayPalClient, approvalUrl, validateAuthorization, validateOrder } from "./paypal";

type Gateway=Pick<PayPalClient,"create"|"order"|"authorize"|"authorization">;
export async function createPurchase(owner:string,mode:unknown,request:unknown,kind:unknown="legacy"):Promise<Purchase> {
  if(kind!=="legacy"&&kind!=="product"&&kind!=="payment")throw new PurchaseError(400,"Choose product purchase or payment instruction.");
  if(mode!=="ai"&&mode!=="example")throw new PurchaseError(400,"Choose AI interpretation or the labeled example.");
  const example=kind==="legacy"?null:generalExample(kind,process.env.PAYPAL_MERCHANT_ID??"");
  const buyerRequest=mode==="example"?(example?.request??EXAMPLE_REQUEST):text(request,"Buyer request",2000);
  if(mode==="ai")await consumeAiQuota(owner);
  const extraction=mode==="example"?{requirements:structuredClone(example?.requirements??EXAMPLE_REQUIREMENTS),summary:"Manually authored example requirements. No AI model was called.",unsupportedRequirements:[],clarificationQuestions:[],provider:"example" as const,model:null,responseId:null,createdAt:new Date().toISOString()}:kind==="legacy"?await extractRequirements(buyerRequest):await extractGeneralRequirements(buyerRequest,kind,process.env.PAYPAL_MERCHANT_ID??"");
  const time=new Date().toISOString();
  const offer=mode==="example"?(example?.offer??EXAMPLE_OFFER):kind==="legacy"?EXAMPLE_OFFER:generalProposal(kind,process.env.PAYPAL_MERCHANT_ID??"");
  const item:Purchase={id:crypto.randomUUID(),revision:1,request:buyerRequest,extraction,requirements:structuredClone(extraction.requirements),confirmed:false,offer:structuredClone(offer),review:null,reviewRun:null,checkout:null,events:[],createdAt:time,updatedAt:time};
  if(kind==="payment")item.boundMerchantId=process.env.PAYPAL_MERCHANT_ID??"";
  if(mode==="ai"&&kind==="product"&&item.offer.details)item.offer.details.attributes=item.requirements.details!.criteria.map(c=>({name:c.name,value:"",unit:c.unit}));
  addEvent(item,"Buyer request recorded",mode==="ai"?"AI extracted structured requirements. Buyer confirmation is required.":"A manually authored example was loaded. No AI inference occurred.");
  return insertPurchase(owner,item);
}
export async function confirmRequirements(owner:string,id:string,revision:unknown,requirements:unknown,consent:unknown) {
  if(consent!==true)throw new PurchaseError(400,"Explicit buyer confirmation is required.");
  const parsed=parseRequirements(requirements);
  return await mutatePurchase(owner,id,item=>{assertRevision(item,revision);assertEditable(item);if(item.requirements.details?.type!==parsed.details?.type)throw new PurchaseError(400,"Create a new case to change the instruction type.");invalidate(item);item.requirements=parsed;item.confirmed=true;addEvent(item,"Buyer requirements confirmed","The buyer explicitly confirmed this structured policy. Earlier checks were invalidated.");});
}
export async function changeOffer(owner:string,id:string,revision:unknown,offer:unknown) {
  const parsed=parseOffer(offer);
  return await mutatePurchase(owner,id,item=>{assertRevision(item,revision);assertEditable(item);if(item.requirements.details?.type!==parsed.details?.type)throw new PurchaseError(400,"The proposal type must match the case.");invalidate(item);item.offer=parsed;addEvent(item,"Merchant offer revised","A new offer revision invalidated all earlier checks. Buyer policy was retained.");});
}
export async function checkPurchase(owner:string,id:string,revision:unknown,mode:unknown) {
  if(mode!=="ai"&&mode!=="rules")throw new PurchaseError(400,"Choose AI review or rules-only review.");
  const run=crypto.randomUUID();
  const current=await mutatePurchase(owner,id,item=>{assertRevision(item,revision);assertEditable(item);if(!item.confirmed)throw new PurchaseError(409,"Confirm the buyer requirements before reviewing an offer.");item.review=null;item.reviewRun=run;addEvent(item,"Verification started",mode==="ai"?"AI offer analysis and deterministic policy checks requested.":"Deterministic policy checks requested. No AI model will be called.");});
  try{
    if(mode==="ai")await consumeAiQuota(owner);
    const checks=evaluatePurchase(current),passed=checks.every(c=>c.passed);
    const analysis=mode==="ai"?await reviewOffer(current):{verdict:passed?"match" as const:"mismatch" as const,summary:passed?"All deterministic purchase rules passed. No AI review was performed.":"Mandatory purchase rules failed. No AI review was performed.",concerns:checks.filter(c=>!c.passed).map(c=>c.explanation),model:null,responseId:null};
    return await mutatePurchase(owner,id,item=>{assertRevision(item,current.revision);if(item.reviewRun!==run)throw new PurchaseError(409,"A newer review replaced this result. Reload the case.");assertEditable(item);item.reviewRun=null;item.review={...analysis,verdict:passed?(analysis.verdict==="match"&&analysis.concerns.length>0?"uncertain":analysis.verdict):"mismatch",mode:mode==="ai"?"openai":"rules",revision:item.revision,checks,checkedAt:new Date().toISOString()};addEvent(item,"Verification completed",purchaseReady(item)?"This revision passed all mandatory checks and AI review. Buyer-approved sandbox checkout is available.":mode==="rules"&&passed?"Mandatory rules passed. A current AI review is still required before PayPal checkout.":"Checkout is blocked by failed checks, uncertain analysis, or unresolved requirements.");});
  }catch(error){await mutatePurchase(owner,id,item=>{if(item.reviewRun===run){item.reviewRun=null;addEvent(item,"Verification incomplete","No new verification result was accepted. Retry after resolving the service error.");}});throw error;}
}
function sameAttempt(item:Purchase,checkout:Checkout) {
  if(item.revision!==checkout.revision||item.checkout?.attemptId!==checkout.attemptId)throw new PurchaseError(409,"This checkout does not belong to the current reviewed revision.");
}
function assertReady(item:Purchase) {if(!purchaseReady(item))throw new PurchaseError(409,"Checkout is blocked. Confirm the requirements and pass fresh AI review and every mandatory rule first. Rules-only testing cannot unlock PayPal.");}
function age(checkout:Checkout) {return Date.now()-Date.parse(checkout.createdAt);}
export async function beginCheckout(owner:string,id:string,revision:unknown,consent:unknown,gateway:Gateway=new PayPalClient()) {
  if(consent!==true)throw new PurchaseError(400,"Explicit consent to this amount, merchant, and revision is required.");
  const {merchantId}=paypalCredentials();const origin=appOrigin();
  const policy=(await getPurchase(owner,id)).requirements.details;
  if(policy?.type==="payment"&&policy.payment?.merchantId!==merchantId)throw new PurchaseError(409,"The confirmed payment recipient does not match the configured PayPal sandbox merchant. Checkout is blocked.");
  const current=await mutatePurchase(owner,id,item=>{
    assertRevision(item,revision);assertReady(item);
    if(item.checkout&&!["failed","canceled"].includes(item.checkout.status)){
      if(item.checkout.merchantId!==merchantId||item.checkout.origin!==origin)throw new PurchaseError(409,"Checkout configuration changed. Reconcile or cancel the existing attempt before starting again.");
      if(!["creating","awaiting-buyer"].includes(item.checkout.status))throw new PurchaseError(409,"Use verification to reconcile the existing checkout. Do not create another order.");
      if(age(item.checkout)>15*60*1000)throw new PurchaseError(409,"This buyer approval session expired. Cancel it before starting another.");
      return;
    }
    const attemptId=crypto.randomUUID();
    item.checkout={attemptId,revision:item.revision,status:"creating",orderId:null,approvalUrl:null,authorizationId:null,amount:item.offer.totalAmount,currency:"USD",merchantId,customId:`${item.id}:r${item.revision}:a${attemptId}`,state:randomBytes(24).toString("hex"),origin,createdAt:new Date().toISOString(),verifiedAt:null,expiresAt:null};
    addEvent(item,"Buyer approved sandbox checkout",`Explicit buyer consent for USD ${item.offer.totalAmount}, configured sandbox merchant, revision ${item.revision}. Order creation reserved with a stable idempotency key.`);
  });
  const checkout=current.checkout!;
  if(checkout.status==="awaiting-buyer")return current;
  const created=await gateway.create(checkout,id);
  if(typeof created.id!=="string"||!/^[A-Z0-9]{6,40}$/.test(created.id))throw new PurchaseError(502,"PayPal returned an invalid order ID. Retry this same attempt.");
  const order=await gateway.order(created.id);
  validateOrder(order,{...checkout,orderId:created.id},id);
  const link=approvalUrl(order);
  return await mutatePurchase(owner,id,item=>{sameAttempt(item,checkout);assertReady(item);if(item.checkout!.status!=="creating")throw new PurchaseError(409,"This checkout changed while PayPal was responding. Reload the case.");item.checkout={...checkout,status:"awaiting-buyer",orderId:created.id!,approvalUrl:link};addEvent(item,"PayPal sandbox order created","Order details matched the reviewed amount, currency, merchant and revision. Waiting for approval in PayPal; no authorization or capture is recorded.");});
}
export async function verifyCheckout(owner:string,id:string,revision:unknown,orderId:unknown,state:unknown,gateway:Gateway=new PayPalClient()) {
  const current=await getPurchase(owner,id);assertRevision(current,revision);assertReady(current);const checkout=current.checkout;
  if(!checkout||checkout.orderId!==orderId||checkout.state!==state||checkout.revision!==current.revision||!["awaiting-buyer","verifying","pending","authorized","attention"].includes(checkout.status))throw new PurchaseError(409,"The PayPal return does not match an active checkout for this case.");
  const credentials=paypalCredentials();if(credentials.merchantId!==checkout.merchantId)throw new PurchaseError(409,"The configured sandbox merchant changed. The existing order cannot be verified under another merchant.");
  const order=await gateway.order(checkout.orderId!);validateOrder(order,checkout,id);
  let authorizations=order.purchase_units![0].payments?.authorizations;
  if(!authorizations?.length){
    if(checkout.authorizationId)throw new PurchaseError(409,"The previously recorded authorization is no longer present in PayPal. No new authorization was attempted.");
    if(age(checkout)>15*60*1000)throw new PurchaseError(409,"Buyer approval session expired. No new authorization was attempted.");
    if(order.status!=="APPROVED")throw new PurchaseError(409,"PayPal has not confirmed buyer approval. Complete approval in PayPal first.");
    await mutatePurchase(owner,id,item=>{sameAttempt(item,checkout);assertReady(item);if(item.checkout!.status==="canceled")throw new PurchaseError(409,"This checkout was canceled.");item.checkout!.status="verifying";addEvent(item,"Sandbox authorization requested","PayPal confirmed buyer approval and order details. The server requested authorization with a stable idempotency key. No capture is requested.");});
    await gateway.authorize(checkout);
    const verifiedOrder=await gateway.order(checkout.orderId!);validateOrder(verifiedOrder,checkout,id);authorizations=verifiedOrder.purchase_units![0].payments?.authorizations;
  }
  if(authorizations?.length!==1||!authorizations[0].id)throw new PurchaseError(409,"PayPal has not returned exactly one verifiable authorization. Retry verification.");
  const authorization=await gateway.authorization(authorizations[0].id);
  if(authorization.id!==authorizations[0].id)throw new PurchaseError(409,"PayPal authorization identity mismatch.");
  try{validateAuthorization(authorization,checkout);}catch(error){await mutatePurchase(owner,id,item=>{sameAttempt(item,checkout);item.checkout!.status="attention";item.checkout!.verifiedAt=new Date().toISOString();addEvent(item,"Provider authorization needs attention","The provider no longer confirms an active authorization matching this purchase. Checkout remains locked; inspect the sandbox account before any further action.");});throw error;}
  return await mutatePurchase(owner,id,item=>{sameAttempt(item,checkout);assertReady(item);if(item.checkout!.status==="canceled")throw new PurchaseError(409,"This checkout was canceled.");const next=authorization.status==="CREATED"?"authorized" as const:"pending" as const;const unchanged=item.checkout!.status===next&&item.checkout!.authorizationId===authorization.id;item.checkout={...item.checkout!,status:next,authorizationId:authorization.id!,verifiedAt:new Date().toISOString(),expiresAt:authorization.expiration_time??null};if(!unchanged)addEvent(item,next==="authorized"?"PayPal sandbox authorization verified":"PayPal authorization pending",next==="authorized"?`Server-verified sandbox authorization for USD ${checkout.amount}, matching this case, revision, currency and merchant. Test funds authorized; no capture or settlement was performed.`:"PayPal returned a pending authorization. This is not a completed authorization; use verification to check again.");});
}
export async function cancelCheckout(owner:string,id:string,revision:unknown,state:unknown) {
  return await mutatePurchase(owner,id,item=>{assertRevision(item,revision);if(!item.checkout||item.checkout.state!==state||!["creating","awaiting-buyer"].includes(item.checkout.status))throw new PurchaseError(409,"Only a checkout awaiting buyer approval can be canceled locally. Reconcile any pending provider outcome first.");item.checkout.status="canceled";addEvent(item,"Checkout canceled locally","This app will not authorize the canceled order. This action does not void any existing provider authorization; none was recorded for this attempt.");});
}
