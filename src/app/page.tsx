import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Page(){
  return <main id="main" className="brand-home">
    <Image className="brand-home-background" src="/brand/homepage-background-full.png" alt="" fill sizes="100vw" priority unoptimized/>
    <div className="brand-home-content">
      <h1 className="sr-only">AEGIRON — Verify intent. Protect every payment.</h1>
      <Image className="brand-home-logo" src="/brand/aegiron-option-06-full.png" alt="AEGIRON — Verify intent. Protect every payment." width={810} height={220} priority unoptimized/>
      <p className="brand-home-tagline">precision fintech,<br/>engineered clarity.</p>
      <Link className="brand-home-enter" href="/purchase?view=overview">Enter workspace<ArrowRight size={21}/></Link>
    </div>
    <Image className="brand-home-platform" src="/brand/homepage-platform-full.png" alt="" width={1672} height={432} sizes="100vw" unoptimized/>
  </main>;
}
