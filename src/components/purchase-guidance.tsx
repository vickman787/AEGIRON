import type { Purchase } from "@/features/purchase/model";
import { purchaseReady, rulesPassed } from "@/features/purchase/model";

export function PurchaseGuidance({item,view}:{item:Purchase;view:"instruction"|"comparison"|"checkout"|"evidence"}) {
  const payment=item.requirements.details?.type==="payment";
  const authorized=item.checkout?.status==="authorized";
  let title="",copy="";
  if(view==="instruction"&&item.checkout&&!["failed","canceled"].includes(item.checkout.status)){
    title="These requirements are locked to your checkout";
    copy=authorized?"This revision has a verified authorization. Open Evidence to inspect the record, or start a new instruction for another purchase.":"Open Buyer approval to continue or reconcile the existing checkout. These requirements cannot be changed while that checkout is active.";
  }else if(view==="instruction"){
    title="1. Check what you asked for";
    copy="These fields describe your requirements, not the merchant’s offer. Keep them as requested. Correct anything the interpretation missed, then tick the confirmation checkbox and confirm below. You’ll enter the proposal on the next screen.";
  }else if(view==="comparison"){
    if(authorized){title="This revision is authorized";copy="This saved revision is locked. Open Evidence to inspect or export the record. Start a new instruction for a different purchase.";}
    else if(item.checkout&&!["failed","canceled"].includes(item.checkout.status)){title="Continue your existing checkout";copy="This revision is locked while checkout is active. Open Buyer approval to complete approval or verify the existing order.";}
    else if(!item.offer.totalAmount){title=payment?"2. Enter the proposed payment":"2. Enter what the merchant is offering";copy="Fill the open proposal form below with the actual offered details and total. Leave your confirmed requirements as they are. Save the proposal, then choose Review saved offer with AI.";}
    else if(purchaseReady(item)){title="Next: your final approval";copy="The saved proposal passed AI review and every required check. Choose Continue to buyer approval to inspect the amount and deliberately start PayPal sandbox checkout.";}
    else if(rulesPassed(item)){title="Next: review with AI";copy="The rules passed. Choose Review saved offer with AI below; rules-only testing cannot unlock checkout.";}
    else if(item.review?.revision===item.revision){title="Fix the proposal, then check again";copy=payment?"Open Edit payment proposal and correct each mismatch. Update the description too, save, and review again. Keep the confirmed payment instruction unchanged unless your intent has changed.":"Open Edit merchant test offer and correct each mismatch. Update the description too, save, and review again. Change the offered details, not your original requirements, when correcting an offer.";}
    else{title="Next: review the saved proposal";copy="Inspect the comparison, then choose Review saved offer with AI below. If you edit the proposal, save it first: review checks the saved revision.";}
  }else if(view==="checkout"){
    if(authorized){title="Authorization verified — save your evidence";copy="PayPal confirmed the sandbox authorization. No capture was requested. Open Evidence and choose Export purchase evidence to save the record.";}
    else if(item.checkout?.status==="creating"){title="Next: continue the same order attempt";copy="Use Retry same order creation if the response was interrupted. This continues the reserved attempt. Do not start a second checkout for the same approval.";}
    else if(item.checkout?.status==="awaiting-buyer"){title="Next: approve in PayPal, then return here";copy="Use Approve in PayPal sandbox and sign in with your separate sandbox buyer account. After approving, return here and choose Verify PayPal approval on server. Your developer-account login is different.";}
    else if(item.checkout&&["verifying","pending","attention"].includes(item.checkout.status)){title="Next: verify the existing order";copy="Use Verify PayPal approval on server to check the provider’s actual outcome. Keep this order; do not start another checkout while its outcome is unresolved.";}
    else if(purchaseReady(item)){title="3. Approve this exact amount";copy="Check the details, tick the approval checkbox and choose Create PayPal sandbox order. You’ll then approve with your sandbox buyer account. A successful review alone does not authorize funds.";}
    else{title="Return to the comparison first";copy="Choose Review purchase details, resolve the mismatches and run a fresh AI review. Buyer approval becomes available only when all checks pass.";}
  }else{
    title=authorized?"4. Save the decision record":"Evidence so far";
    copy=authorized?"This flow is complete. Choose Export purchase evidence below to download the instruction, reviewed revisions, decisions and provider identifiers.":"You can export the checks recorded so far. This case has no verified authorization yet; return to Buyer approval when the required checks pass.";
  }
  return <aside className="step-guidance" aria-label="What to do next"><strong>{title}</strong><p>{copy}</p></aside>;
}
