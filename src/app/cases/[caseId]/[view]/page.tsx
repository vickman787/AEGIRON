import { notFound } from "next/navigation";
import { CaseView } from "@/components/case-view";
export default async function Page({params}:{params:Promise<{caseId:string;view:string}>}){const {caseId,view}=await params;if(!["2405-117","NVME-512"].includes(caseId)||!["instruction","comparison","checkout","evidence"].includes(view))notFound();return <CaseView id={caseId} view={view}/>;}
