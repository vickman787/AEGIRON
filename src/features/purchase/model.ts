import { minorUnits } from "@/lib/cases";
import { evaluateGeneral, parseGeneralOffer, parseGeneralPolicy, type GeneralOffer, type GeneralPolicy } from "./general";

export class PurchaseError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type Requirements = {
  category: "external-ssd" | "product" | "payment" | null;
  details?: GeneralPolicy;
  capacityGb: number | null;
  capacityRule: "exact" | "at-least";
  connector: "USB-C" | "USB-A" | "Thunderbolt" | null;
  brand: string | null;
  minimumWarrantyMonths: number | null;
  maxAmount: string | null;
  currency: "USD" | null;
};
export type Extraction = {
  requirements: Requirements; summary: string; unsupportedRequirements: string[];
  clarificationQuestions: string[]; provider: "openai" | "example";
  model: string | null; responseId: string | null; createdAt: string;
};
export type Offer = {
  category: "external-ssd" | "external-hdd" | "product" | "payment"; capacityGb: number;
  details?: GeneralOffer;
  connector: "USB-C" | "USB-A" | "Thunderbolt"; brand: string;
  warrantyMonths: number; totalAmount: string; currency: "USD"; description: string;
};
export type RuleCheck = { key: string; label: string; passed: boolean; explanation: string };
export type Review = { revision: number; mode: "openai" | "rules"; verdict: "match" | "mismatch" | "uncertain"; summary: string; concerns: string[]; checks: RuleCheck[]; model: string | null; responseId: string | null; checkedAt: string };
export type Checkout = {
  attemptId: string; revision: number; status: "creating" | "awaiting-buyer" | "verifying" | "pending" | "authorized" | "attention" | "canceled" | "failed";
  orderId: string | null; approvalUrl: string | null; authorizationId: string | null;
  amount: string; currency: "USD"; merchantId: string; customId: string; state: string;
  origin: string; createdAt: string; verifiedAt: string | null; expiresAt: string | null;
};
export type EvidenceSnapshot = { requirements: Requirements; offer: Offer; confirmed: boolean; review: Review | null; checkout: Pick<Checkout,"status" | "orderId" | "authorizationId" | "revision" | "amount" | "currency" | "verifiedAt"> | null };
export type PurchaseEvent = { id: string; title: string; detail: string; revision: number; time: string; snapshot: EvidenceSnapshot };
export type Purchase = {
  id: string; revision: number; request: string; extraction: Extraction;
  requirements: Requirements; confirmed: boolean; offer: Offer; review: Review | null;
  reviewRun: string | null; checkout: Checkout | null; events: PurchaseEvent[];
  boundMerchantId?: string;
  createdAt: string; updatedAt: string;
};
export const EXAMPLE_REQUEST = "Find one external SSD with exactly 512GB, USB-C, at least a 24-month warranty, for no more than USD 100 including all charges.";
export const EXAMPLE_REQUIREMENTS: Requirements = { category: "external-ssd", capacityGb: 512, capacityRule: "exact", connector: "USB-C", brand: null, minimumWarrantyMonths: 24, maxAmount: "100.00", currency: "USD" };
export const EXAMPLE_OFFER: Offer = { category: "external-ssd", capacityGb: 256, connector: "USB-C", brand: "Demo Storage", warrantyMonths: 24, totalAmount: "79.00", currency: "USD", description: "Demo merchant offer: portable external SSD, USB-C connection, 256GB capacity, two-year warranty. Sandbox test only; no goods are supplied." };
export function record(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PurchaseError(400,"Expected a JSON object.");
  return value as Record<string,unknown>;
}
export function text(value: unknown, label: string, max=2000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new PurchaseError(400,`${label} is required and must be at most ${max} characters.`);
  return value.trim();
}
function choice<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new PurchaseError(400,`Invalid ${label}.`);
  return value as T;
}
function integer(value:unknown,label:string,min:number,max:number):number {
  if(typeof value!=="number" || !Number.isInteger(value) || value<min || value>max)throw new PurchaseError(400,`${label} must be an integer from ${min} to ${max}.`);
  return value;
}
function amount(value:unknown,label:string) {
  const result=text(value,label,16); const units=minorUnits(result);
  if(units===null || units>50000n)throw new PurchaseError(400,`${label} must be positive and at most USD 500.00, with at most two decimal places.`);
  return `${units/100n}.${(units%100n).toString().padStart(2,"0")}`;
}
function nullable<T>(value:unknown,parse:(input:unknown)=>T):T|null {return value===null?null:parse(value);}
export function parseRequirements(value:unknown):Requirements {
  const data=record(value);
  if(data.details!==undefined){const details=parseGeneralPolicy(data.details);return {category:details.type,details,capacityGb:null,capacityRule:"exact",connector:null,brand:null,minimumWarrantyMonths:null,maxAmount:nullable(data.maxAmount,v=>amount(v,"Budget / instruction amount")),currency:nullable(data.currency,v=>choice(v,["USD"] as const,"currency"))};}
  return {category:nullable(data.category,v=>choice(v,["external-ssd"] as const,"product category")),capacityGb:nullable(data.capacityGb,v=>integer(v,"Capacity",1,16384)),capacityRule:choice(data.capacityRule,["exact","at-least"] as const,"capacity rule"),connector:nullable(data.connector,v=>choice(v,["USB-C","USB-A","Thunderbolt"] as const,"connector")),brand:nullable(data.brand,v=>text(v,"Brand",80)),minimumWarrantyMonths:nullable(data.minimumWarrantyMonths,v=>integer(v,"Minimum warranty",0,120)),maxAmount:nullable(data.maxAmount,v=>amount(v,"Budget")),currency:nullable(data.currency,v=>choice(v,["USD"] as const,"currency"))};
}
export function parseOffer(value:unknown):Offer {
  const data=record(value);
  if(data.details!==undefined){const details=parseGeneralOffer(data.details);return {category:details.type,details,capacityGb:0,connector:"USB-C",brand:"",warrantyMonths:0,totalAmount:amount(data.totalAmount,"Proposal total"),currency:choice(data.currency,["USD"] as const,"proposal currency"),description:text(data.description,"Proposal description",2000)};}
  return {category:choice(data.category,["external-ssd","external-hdd"] as const,"offer category"),capacityGb:integer(data.capacityGb,"Offered capacity",1,16384),connector:choice(data.connector,["USB-C","USB-A","Thunderbolt"] as const,"offer connector"),brand:text(data.brand,"Offered brand",80),warrantyMonths:integer(data.warrantyMonths,"Offered warranty",0,120),totalAmount:amount(data.totalAmount,"Offer total"),currency:choice(data.currency,["USD"] as const,"offer currency"),description:text(data.description,"Merchant description",2000)};
}
export function stringList(value:unknown,label:string):string[] {
  if(!Array.isArray(value)||value.length>12)throw new PurchaseError(400,`Invalid ${label}.`);
  return value.map(v=>text(v,label,300));
}
export function evaluatePurchase(item:Purchase):RuleCheck[] {
  if(item.requirements.details)return evaluateGeneral(item);
  const r=item.requirements,o=item.offer;
  const budget=r.maxAmount===null?null:minorUnits(r.maxAmount),total=minorUnits(o.totalAmount);
  const check=(key:string,label:string,passed:boolean,explanation:string):RuleCheck=>({key,label,passed,explanation});
  return [
    check("consent","Buyer-confirmed requirements",item.confirmed,"The buyer must explicitly confirm the structured requirements."),
    check("scope","Supported product & currency",r.category==="external-ssd"&&r.currency==="USD","This prototype supports one external SSD, priced in USD, up to USD 500.00."),
    check("questions","No unresolved requirements",item.extraction.unsupportedRequirements.length===0&&item.extraction.clarificationQuestions.length===0,"Unmodeled requirements and AI clarification questions must be resolved in a new, complete request; they cannot be waived by an offer."),
    check("category","Product type",r.category!==null&&r.category===o.category,`Requested ${r.category??"unspecified"}; offered ${o.category}.`),
    check("capacity","Storage capacity",r.capacityGb!==null&&(r.capacityRule==="exact"?o.capacityGb===r.capacityGb:o.capacityGb>=r.capacityGb),`Requested ${r.capacityRule==="exact"?"exactly":"at least"} ${r.capacityGb??"unspecified"}GB; offered ${o.capacityGb}GB.`),
    check("budget","Total purchase budget",budget!==null&&total!==null&&total<=budget&&total<=50000n&&r.currency===o.currency,`Budget USD ${r.maxAmount??"unspecified"}; offer total USD ${o.totalAmount}, including all charges.`),
    check("connector","Connector",r.connector===null||r.connector===o.connector,`Requested ${r.connector??"any supported connector"}; offered ${o.connector}.`),
    check("brand","Brand",r.brand===null||r.brand.toLowerCase()===o.brand.toLowerCase(),`Requested ${r.brand??"any brand"}; offered ${o.brand}.`),
    check("warranty","Warranty",r.minimumWarrantyMonths===null||o.warrantyMonths>=r.minimumWarrantyMonths,`Required ${r.minimumWarrantyMonths??0} months; offered ${o.warrantyMonths} months.`),
  ];
}
export function rulesPassed(item:Purchase) {return item.review?.revision===item.revision&&item.reviewRun===null&&evaluatePurchase(item).every(c=>c.passed);}
export function purchaseReady(item:Purchase) {return rulesPassed(item)&&item.review?.mode==="openai"&&item.review.verdict==="match";}
export function assertRevision(item:Purchase,value:unknown) {if(value!==item.revision)throw new PurchaseError(409,"This case changed. Reload it before continuing.");}
export function assertEditable(item:Purchase) {if(item.checkout&&!["canceled","failed"].includes(item.checkout.status))throw new PurchaseError(409,"Checkout locks this revision. Finish or cancel the pending checkout first. An authorized case cannot be edited.");}
export function invalidate(item:Purchase) {item.revision++;item.review=null;item.reviewRun=null;item.checkout=null;}
export function addEvent(item:Purchase,title:string,detail:string) {
  const checkout=item.checkout;
  const snapshot:EvidenceSnapshot=structuredClone({requirements:item.requirements,offer:item.offer,confirmed:item.confirmed,review:item.review,checkout:checkout?{status:checkout.status,orderId:checkout.orderId,authorizationId:checkout.authorizationId,revision:checkout.revision,amount:checkout.amount,currency:checkout.currency,verifiedAt:checkout.verifiedAt}:null});
  item.updatedAt=new Date().toISOString();
  item.events.push({id:crypto.randomUUID(),title,detail,revision:item.revision,time:item.updatedAt,snapshot});
}
