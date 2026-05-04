import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

/**
 * 홈 디렉터리 등 상위에 다른 package.json이 있어도,
 * 이 저장소(Next 앱) 루트만 확실히 가리키도록 탐색한다.
 * Turbopack이 ~/package.json 기준으로 tailwindcss를 찾다 실패하는 문제를 막는다.
 */
function findAppRoot(): string {
  const seeds = [process.cwd(), path.dirname(fileURLToPath(import.meta.url))];

  for (const seed of seeds) {
    let dir = path.resolve(seed);
    for (let i = 0; i < 12; i++) {
      const pkg = path.join(dir, "package.json");
      const appDir = path.join(dir, "src", "app");
      const nextMod = path.join(dir, "node_modules", "next");
      if (fs.existsSync(pkg) && fs.existsSync(appDir) && fs.existsSync(nextMod)) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return path.dirname(fileURLToPath(import.meta.url));
}

const turbopackRoot = findAppRoot();

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
