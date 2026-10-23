import type { NextConfig } from "next";
const config: NextConfig = { poweredByHeader: false, devIndicators: false, async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"}]}];} };
export default config;
