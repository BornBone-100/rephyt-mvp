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
        console.log("카카오 키 확인:", key);
        if (typeof window === "undefined" || !window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
          if (key) {
            window.Kakao.init(key);
            console.log("카카오 초기화 성공:", window.Kakao.isInitialized());
          } else {
            console.error("카카오 키가 없습니다! 환경변수를 확인하세요.");
          }
        }
      }}
    />
  );
}
