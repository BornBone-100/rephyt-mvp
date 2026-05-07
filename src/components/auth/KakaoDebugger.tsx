"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
    };
  }
}

type DebugStatus = {
  keyExists: boolean;
  initialized: boolean;
  currentUrl: string;
};

export default function KakaoDebugger() {
  const [status, setStatus] = useState<DebugStatus>({
    keyExists: false,
    initialized: false,
    currentUrl: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    const isInit = window.Kakao?.isInitialized();

    setStatus({
      keyExists: !!key,
      initialized: !!isInit,
      currentUrl: window.location.origin,
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "#00ff00",
        padding: "15px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: 9999,
        fontFamily: "monospace",
        border: "1px solid #444",
        boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#fff", borderBottom: "1px solid #444" }}>
        🛠 Bali Bridge Debugger
      </h4>
      <p>
        <strong>JS KEY 존재:</strong> {status.keyExists ? "✅ 있음" : "❌ 없음 (환경변수 확인 요망)"}
      </p>
      <p>
        <strong>Kakao 초기화:</strong> {status.initialized ? "✅ 성공" : "❌ 실패"}
      </p>
      <p>
        <strong>현재 도메인:</strong> <br />
        {status.currentUrl}
      </p>
      <div style={{ marginTop: "10px", fontSize: "10px", color: "#aaa" }}>
        * 도메인이 카카오 '플랫폼' 설정과 <br />
        완벽히 일치해야 KOE009가 안 뜹니다.
      </div>
    </div>
  );
}
