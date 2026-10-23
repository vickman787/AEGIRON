import type { Metadata } from "next";
import "./globals.css";
import { CaseProvider } from "@/components/store";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {title: "AEGIRON — The final check", description: "Buyer-controlled verification for AI-assisted purchases, with server-enforced checks and PayPal sandbox authorization."};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><CaseProvider><Shell>{children}</Shell></CaseProvider></body></html>; }
