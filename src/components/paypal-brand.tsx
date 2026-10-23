import Image from "next/image";

export function PayPalBrand(){
  return <div className="paypal-brand"><span>PayPal sandbox</span><Image src="/brand/paypal-mark-canva.png" alt="PayPal" width={61} height={60} unoptimized/></div>;
}
