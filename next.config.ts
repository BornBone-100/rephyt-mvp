import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

/** 상위 폴더에 다른 package-lock.json이 있을 때 Turbopack이 잘못된 루트를 잡아 /ko/... 라우트가 404가 되는 문제 방지 */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.nicepay.co.kr",
              "connect-src 'self' https://*.supabase.co https://*.nicepay.co.kr wss://*.supabase.co",
              "frame-src https://*.nicepay.co.kr",
              "img-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
