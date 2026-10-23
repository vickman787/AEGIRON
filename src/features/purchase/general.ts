import { PurchaseError, record, text, type Offer, type Purchase, type Requirements, type RuleCheck } from "./model";
import { minorUnits } from "@/lib/cases";

export type Criterion={name:string;kind:"text"|"number";operator:"equals"|"at-least"|"at-most";value:string;unit:string};
export type Attribute={name:string;value:string;unit:string};
export type PaymentFields={beneficiary:string|null;purpose:string|null;reference:string|null;merchantId:string};
export type GeneralPolicy={type:"product"|"payment";title:string|null;quantity:number|null;criteria:Criterion[];payment:PaymentFields|null};
export type GeneralOffer={type:"product"|"payment";title:string;quantity:number;attributes:Attribute[];payment:PaymentFields|null};
export const normalize=(v:string)=>v.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
function nullableText(v:unknown,label:string,max=160){return v===null?null:text(v,label,max);}
function quantity(v:unknown,nullable=false){if(v===null&&nullable)return null;if(typeof v!=="number"||!Number.isInteger(v)||v<1||v>1000)throw new PurchaseError(400,"Quantity must be an integer from 1 to 1000.");return v;}
function kind(v:unknown):"product"|"payment"{if(v!=="product"&&v!=="payment")throw new PurchaseError(400,"Choose product purchase or payment instruction.");return v;}
function unit(v:unknown){if(typeof v!=="string"||v.length>40)throw new PurchaseError(400,"Unit must be at most 40 characters.");return v.trim();}
function decimal(v:string){if(!/^\d{1,12}(\.\d{1,6})?$/.test(v))throw new PurchaseError(400,"Numeric specifications must be non-negative decimals, up to six decimal places, without units in the value.");const [whole,fraction=""]=v.split(".");return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,"0"));}
function unique<T extends {name:string}>(items:T[]){if(new Set(items.map(i=>normalize(i.name))).size!==items.length)throw new PurchaseError(400,"Specification names must be unique.");return items;}
export function parseCriteria(value:unknown):Criterion[]{
  if(!Array.isArray(value)||value.length>16)throw new PurchaseError(400,"Use at most 16 named specifications.");
  return unique(value.map(raw=>{const d=record(raw);const name=text(d.name,"Specification name",80),value=text(d.value,"Required value",160),u=unit(d.unit);if(d.kind!=="text"&&d.kind!=="number")throw new PurchaseError(400,"Specification kind must be text or number.");if(!["equals","at-least","at-most"].includes(String(d.operator)))throw new PurchaseError(400,"Invalid comparison operator.");if(d.kind==="text"&&d.operator!=="equals")throw new PurchaseError(400,"Text specifications require exact matching.");if(d.kind==="number")decimal(value);return {name,kind:d.kind,operator:d.operator as Criterion["operator"],value,unit:u};}));
}
function payment(value:unknown):PaymentFields|null {if(value===null)return null;const d=record(value);return {beneficiary:nullableText(d.beneficiary,"Beneficiary label"),purpose:nullableText(d.purpose,"Payment purpose",300),reference:nullableText(d.reference,"Payment reference"),merchantId:typeof d.merchantId==="string"?d.merchantId.trim():""};}
export function parseGeneralPolicy(value:unknown):GeneralPolicy {
  const d=record(value),type=kind(d.type);const result:GeneralPolicy={type,title:nullableText(d.title,"Item / instruction title"),quantity:quantity(d.quantity,true),criteria:parseCriteria(d.criteria),payment:payment(d.payment)};
  if(type==="payment"&&(result.criteria.length||result.quantity!==null))throw new PurchaseError(400,"Payment instructions do not contain product specifications or quantity.");
  if(type==="product"&&result.payment)throw new PurchaseError(400,"Product requests cannot contain payment-instruction fields.");return result;
}
export function parseGeneralOffer(value:unknown):GeneralOffer {
  const d=record(value),type=kind(d.type);if(!Array.isArray(d.attributes)||d.attributes.length>24)throw new PurchaseError(400,"Use at most 24 offered specifications.");
  const attributes=unique(d.attributes.map(raw=>{const a=record(raw);return {name:text(a.name,"Offered specification name",80),value:text(a.value,"Offered value",160),unit:unit(a.unit)};}));
  const result:GeneralOffer={type,title:text(d.title,"Item / instruction title",160),quantity:quantity(d.quantity)!,attributes,payment:payment(d.payment)};
  if(type==="payment"&&attributes.length)throw new PurchaseError(400,"Payment proposals do not contain product specifications.");if(type==="product"&&result.payment)throw new PurchaseError(400,"Product offers cannot contain payment-instruction fields.");return result;
}
export function generalRequirements(details:GeneralPolicy,maxAmount:string|null):Requirements {return {category:details.type,details,capacityGb:null,capacityRule:"exact",connector:null,brand:null,minimumWarrantyMonths:null,maxAmount,currency:"USD"};}
export function generalProposal(type:"product"|"payment",merchantId=""):Offer {return {category:type,details:{type,title:"",quantity:1,attributes:[],payment:type==="payment"?{beneficiary:null,purpose:null,reference:null,merchantId}:null},capacityGb:0,connector:"USB-C",brand:"",warrantyMonths:0,totalAmount:"",currency:"USD",description:""};}
export function evaluateGeneral(item:Purchase):RuleCheck[]{
  const r=item.requirements,d=r.details!,o=item.offer,p=o.details;const check=(key:string,label:string,passed:boolean,explanation:string)=>({key,label,passed,explanation});const budget=r.maxAmount===null?null:minorUnits(r.maxAmount),total=minorUnits(o.totalAmount);
  const checks=[check("consent","Buyer-confirmed instruction",item.confirmed,"The buyer must confirm the structured instruction."),check("scope","Supported instruction & currency",["product","payment"].includes(d.type)&&r.currency==="USD"&&o.currency==="USD","Sandbox authorization supports USD totals up to 500.00; no live payments or bank transfers."),check("questions","No unresolved requirements",item.extraction.unsupportedRequirements.length===0&&item.extraction.clarificationQuestions.length===0,"Resolve unsupported instructions and clarification questions in a complete new request."),check("type","Instruction type",!!p&&d.type===p.type,"The proposal must have the same type as the confirmed instruction."),check("budget",d.type==="payment"?"Exact payment amount":"Total purchase budget",budget!==null&&total!==null&&total<=50000n&&(d.type==="payment"?total===budget:total<=budget),`${d.type==="payment"?"Exact instructed amount":"Maximum total"}: USD ${r.maxAmount??"not specified"}; proposed total USD ${o.totalAmount}.`)];
  if(d.type==="product"){
    checks.push(check("title","Item",!!d.title&&!!p&&normalize(d.title)===normalize(p.title),`Requested ${d.title??"not specified"}; proposed ${p?.title??"not specified"}.`),check("quantity","Quantity",d.quantity!==null&&d.quantity===p?.quantity,`Requested ${d.quantity??"not specified"}; proposed ${p?.quantity??"not specified"}.`));
    for(const c of d.criteria){const a=p?.attributes.find(a=>normalize(a.name)===normalize(c.name));let passed=!!a&&normalize(a.unit)===normalize(c.unit);if(passed&&a){if(c.kind==="text")passed=normalize(a.value)===normalize(c.value);else{try{const actual=decimal(a.value),expected=decimal(c.value);passed=c.operator==="equals"?actual===expected:c.operator==="at-least"?actual>=expected:actual<=expected;}catch{passed=false;}}}checks.push(check(`spec:${normalize(c.name)}`,c.name,passed,`Required ${c.operator} ${c.value}${c.unit?` ${c.unit}`:""}; proposed ${a?`${a.value}${a.unit?` ${a.unit}`:""}`:"not declared"}.`));}
  }else{
    checks.push(check("recipientBinding","Configured sandbox recipient",!!item.boundMerchantId&&d.payment?.merchantId===item.boundMerchantId,"The confirmed recipient must match the merchant bound to this case by the server."));
    for(const [key,label] of [["beneficiary","Beneficiary label"],["purpose","Payment purpose"],["reference","Payment reference"],["merchantId","PayPal recipient ID"]] as const){const expected=d.payment?.[key],actual=p?.payment?.[key];checks.push(check(key,label,!!expected&&!!actual&&(key==="merchantId"?expected===actual:normalize(expected)===normalize(actual)),`Expected ${expected||"not specified"}; proposed ${actual||"not specified"}. Labels and references are compared, not independently authenticated.`));}
  }
  return checks;
}
export function caseTitle(item:Purchase){return item.requirements.details?item.offer.details?.title||item.requirements.details.title||"Instruction":`${item.offer.capacityGb}GB external SSD`;}
export function caseSubject(item:Purchase){return item.requirements.details?.type==="payment"?"Payment instruction":item.requirements.details?"Product purchase":`${item.offer.connector}`;}
export function generalRows(item:Purchase){
  const r=item.requirements,d=r.details!,p=item.offer.details;const rows:{key:string;label:string;request:string;offer:string}[]=[{key:"type",label:"Instruction type",request:d.type,offer:p?.type??"—"}];
  if(d.type==="product")rows.push({key:"title",label:"Item",request:d.title??"—",offer:p?.title||"—"},{key:"quantity",label:"Quantity",request:String(d.quantity??"—"),offer:String(p?.quantity??"—")},...d.criteria.map(c=>({key:`spec:${normalize(c.name)}`,label:c.name,request:`${c.operator} ${c.value} ${c.unit}`.trim(),offer:(()=>{const a=p?.attributes.find(a=>normalize(a.name)===normalize(c.name));return a?.value.trim()?`${a.value} ${a.unit}`.trim():"Not entered";})()})));
  else for(const [key,label] of [["beneficiary","Beneficiary label"],["purpose","Payment purpose"],["reference","Payment reference"],["merchantId","PayPal recipient ID"]] as const)rows.push({key,label,request:d.payment?.[key]||"—",offer:p?.payment?.[key]||"—"});
  rows.push({key:"budget",label:d.type==="payment"?"Exact amount":"Total price",request:`${d.type==="payment"?"Exactly":"Up to"} USD ${r.maxAmount??"—"}`,offer:`USD ${item.offer.totalAmount||"—"}`});return rows;
}
