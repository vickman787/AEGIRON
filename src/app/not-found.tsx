import Link from "next/link";
export default function NotFound(){return <div className="empty-state"><div className="eyebrow">404 / NOT FOUND</div><h1>This page is unavailable.</h1><p>Return to the workspace to choose a demo case.</p><Link className="button primary" href="/">Return to overview</Link></div>;}
