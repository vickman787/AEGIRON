import { Suspense } from "react";
import { PurchaseWorkspace } from "@/components/purchase-flow";
export const metadata={title:"AEGIRON — Agent checkout"};
export default function Page(){return <Suspense fallback={<div className="loading">Loading purchase workspace…</div>}><PurchaseWorkspace/></Suspense>;}
