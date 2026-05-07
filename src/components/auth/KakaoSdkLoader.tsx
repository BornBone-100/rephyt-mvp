"use client";

import Script from "next/script";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
    };
  }
}

export default function KakaoSdkLoader() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        if (!key || typeof window === "undefined" || !window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(key);
        }
      }}
    />
  );
}
