"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-state" role="alert"><h1>The workspace could not load.</h1><p>Try again to recover the demo view.</p><button className="button primary" onClick={reset}>Try again</button></div>;}
