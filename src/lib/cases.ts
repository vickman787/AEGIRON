export type Outcome = "not-started" | "pending" | "authorized" | "canceled" | "failed" | "expired";
export type Instruction = { instructionId: string; type: string; beneficiary: string; account: string; purpose: string; amount: string; currency: string; date: string; document: string };
export type Event = { id: string; time: string; title: string; detail: string; revision: number; snapshot?: {instruction: Instruction; capacity: string; checks?: Check[]; authorization: Outcome; authorizationId: string | null} };
export type Case = { id: string; kind: "payment" | "product"; title: string; subtitle: string; revision: number; checkedRevision: number | null; instruction: Instruction; capacity: string; authorization: Outcome; authorizationRevision: number | null; authorizationStarted: string | null; authorizationId: string | null; events: Event[] };
export type Check = { key: string; label: string; detail: string; status: "passed" | "failed" };
export const CURRENCIES = ["USD", "EUR", "GBP", "NGN"];
export function minorUnits(value: string): bigint | null {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return result > 0n ? result : null;
}
export function money(value: string, currency: string) {
  const units = minorUnits(value);
  if (units === null) return `${currency} —`;
  const whole = (units / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${whole}.${(units % 100n).toString().padStart(2, "0")}`;
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validate(instruction: Instruction): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(instruction)) if (!value.trim()) errors[key] = "This field is required.";
  if (minorUnits(instruction.amount) === null) errors.amount = "Enter a positive amount with at most two decimal places (no commas).";
  if (!CURRENCIES.includes(instruction.currency)) errors.currency = "Select a supported currency.";
  if (!validDate(instruction.date)) errors.date = "Enter a valid payment date.";
  if (instruction.account.trim().length < 6) errors.account = "Enter at least six characters for the demo account reference.";
  if (instruction.purpose.trim().length < 8) errors.purpose = "Describe the purpose using at least eight characters.";
  return errors;
}
export function initialCases(): Case[] {
  const common = { revision: 1, checkedRevision: null, authorization: "not-started" as const, authorizationRevision: null, authorizationStarted: null, authorizationId: null, events: [] };
  return [
    { ...common, id: "2405-117", kind: "payment", title: "Infrastructure phase advance", subtitle: "Atlantic Infrastructure Partners", capacity: "", instruction: { instructionId: "PI-2405-117", type: "Payment instruction", beneficiary: "Atlantic Infrastructure Partners", account: "DEMO-ACCOUNT-7812", purpose: "Infrastructure phase advance", amount: "4850000.00", currency: "USD", date: "2024-05-30", document: "" } },
    { ...common, id: "NVME-512", kind: "product", title: "External NVMe drive", subtitle: "512GB · USB-C · portable storage", capacity: "256", instruction: { instructionId: "PO-NVME-512", type: "Purchase instruction", beneficiary: "Demo Storage Merchant", account: "DEMO-MERCHANT-2048", purpose: "Purchase an external 512GB NVMe drive", amount: "89.00", currency: "USD", date: "2026-10-14", document: "Demo product specification.pdf" } },
  ];
}
export function evaluate(item: Case): Check[] {
  const instruction = item.instruction;
  const valid = Object.keys(validate(instruction)).length === 0;
  const amount = minorUnits(instruction.amount);
  const baseline = initialCases().find(c => c.id === item.id)!;
  const identity = instruction.beneficiary.trim() === baseline.instruction.beneficiary;
  const ownership = instruction.account.trim() === baseline.instruction.account;
  const within = amount !== null && amount <= 500000000n && instruction.currency === "USD";
  const purpose = instruction.purpose.trim() === baseline.instruction.purpose;
  const check = (key: string, label: string, passed: boolean, detail: string): Check => ({ key, label, status: passed ? "passed" : "failed", detail });
  return [
    check("format", "Instruction completeness", valid, valid ? "Required fields and formats are complete." : "Correct the missing or invalid instruction fields."),
    check("identity", "Beneficiary identity", identity, identity ? "Matches the demo beneficiary. No external identity verification." : "Beneficiary differs from the demo source. Restore the expected beneficiary."),
    check("account", "Account ownership", ownership, ownership ? "Matches the demo account reference. Ownership is simulated." : "Account differs from the demo source. Restore the expected account."),
    check("amount", "Amount & currency rules", within, within ? "Within the demo USD 5,000,000 ceiling." : "Demo policy requires USD and a positive amount at or below 5,000,000."),
    check("purpose", "Business intent", purpose, purpose ? "Purpose matches the demo source instruction." : "Purpose differs from the demo source. Restore the expected purpose."),
    check("document", "Supporting documents", !!instruction.document.trim(), instruction.document ? "Demo attachment present; authenticity is not verified." : "Attach a demo supporting document before continuing."),
    ...(item.kind === "product" ? [check("capacity", "Product capacity", item.capacity === "512", item.capacity === "512" ? "Offered 512GB matches the requested 512GB." : `Requested 512GB; offered ${item.capacity}GB. Revise the offer to match.`)] : []),
  ];
}
export function ready(item: Case) {
  return item.checkedRevision === item.revision && evaluate(item).every(c => c.status === "passed");
}
export function status(item: Case) {
  if (item.authorization === "authorized" && item.authorizationRevision === item.revision) return "Authorized (demo)";
  if (item.authorization === "pending") return "Approval pending";
  if (ready(item)) return "Ready for approval";
  if (item.checkedRevision === item.revision) return "Review required";
  return "Checks pending";
}
function log(item: Case, title: string, detail: string): Case {
  return { ...item, events: [...item.events, { id: crypto.randomUUID(), time: new Date().toISOString(), title, detail, revision: item.revision, snapshot: {instruction: {...item.instruction, account: `Demo •••• ${item.instruction.account.slice(-4)}`}, capacity: item.capacity, checks: item.checkedRevision === item.revision ? evaluate(item) : undefined, authorization: item.authorization, authorizationId: item.authorizationId} }] };
}
export type Action = { type: "edit"; instruction: Instruction } | { type: "offer"; capacity: string } | { type: "check" } | { type: "begin" } | { type: "finish"; outcome: "authorized" | "canceled" | "failed" | "expired" };
export function transition(item: Case, action: Action): Case {
  if (action.type === "edit" || action.type === "offer") {
    const revised = { ...item, revision: item.revision + 1, checkedRevision: null, authorization: "not-started" as const, authorizationRevision: null, authorizationStarted: null, authorizationId: null, ...(action.type === "edit" ? { instruction: Object.fromEntries(Object.entries(action.instruction).map(([k,v]) => [k,v.trim()])) as Instruction } : { capacity: action.capacity }) };
    return log(revised, "Revision created", "Previous checks and approval were invalidated.");
  }
  if (action.type === "check") {
    if (item.authorization === "pending") return item;
    const passed = evaluate(item).filter(c => c.status === "passed").length;
    return log({ ...item, checkedRevision: item.revision }, "Demo checks completed", `${passed} of ${evaluate(item).length} checks passed. External checks are simulated.`);
  }
  if (action.type === "begin") {
    if (!ready(item) || item.authorization === "authorized" || item.authorization === "pending") return item;
    return log({ ...item, authorization: "pending", authorizationRevision: item.revision, authorizationStarted: new Date().toISOString() }, "Buyer approval requested", "Awaiting an explicit simulated buyer decision. No provider contacted.");
  }
  if (!ready(item) || item.authorization !== "pending" || item.authorizationRevision !== item.revision) return item;
  const started = item.authorizationStarted ? Date.parse(item.authorizationStarted) : NaN;
  const expired = !Number.isFinite(started) || started > Date.now() || Date.now() - started > 15 * 60 * 1000;
  const outcome = expired ? "expired" : action.outcome;
  return log({ ...item, authorization: outcome, authorizationId: outcome === "authorized" ? `SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null }, `Simulated approval ${outcome}`, outcome === "authorized" ? `${money(item.instruction.amount, item.instruction.currency)} approved in demo. No funds authorized, captured, or transferred.` : "No funds were moved. You can restart the simulated approval.");
}
