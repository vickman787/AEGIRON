"use client";
import { useId, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
export function DemoAccessForm(){
  const id=useId();const [code,setCode]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function enter(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError("");
    try{const response=await fetch("/api/demo-access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Access could not be checked.");setCode("");window.location.reload();}
    catch(error){setError(error instanceof Error?error.message:"Please try again.");setBusy(false);}
  }
  return <section className="panel demo-access"><LockKeyhole size={28}/><span className="eyebrow">AEGIRON SANDBOX DEMO</span><h1>Open the workspace</h1><p>Enter the access code shared by the project owner. This keeps the demo’s AI and PayPal sandbox tools available to invited testers and judges.</p><form onSubmit={enter}><div className="field"><label htmlFor={id}>Demo access code</label><input id={id} type="password" value={code} onChange={e=>setCode(e.target.value)} required maxLength={300} autoComplete="off" disabled={busy}/></div>{error&&<p role="alert" className="purchase-alert">{error}</p>}<button className="button primary" disabled={busy||!code.trim()}>{busy?"Checking access…":"Enter workspace"}<ArrowRight size={16}/></button></form><p className="small-copy">Access expires after eight hours. Your case records stay scoped to this browser. This code is a demo gate, not a verified buyer identity.</p></section>;
}
