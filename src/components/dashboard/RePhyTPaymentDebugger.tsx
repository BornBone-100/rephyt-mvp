"use client";

import { useEffect, useState } from "react";

type PaymentDebugState = {
  sdkLoaded: boolean;
  clickDetected: boolean;
  lastError: string | null;
  configStatus: Record<string, unknown>;
};

export function RePhyTPaymentDebugger() {
  const [debugLog, setDebugLog] = useState<PaymentDebugState>({
    sdkLoaded: false,
    clickDetected: false,
    lastError: null,
    configStatus: {},
  });

  useEffect(() => {
    const checkSDK = () => {
      const nicePay = (window as Window & { NicePay?: unknown }).NicePay;
      setDebugLog((prev) => ({ ...prev, sdkLoaded: !!nicePay }));
    };

    checkSDK();
    const interval = setInterval(checkSDK, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes("NicePay") || e.message.includes("payment")) {
        setDebugLog((prev) => ({ ...prev, lastError: e.message }));
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <div className="mt-10 rounded-[32px] border border-zinc-800 bg-[#080808] p-6 font-mono text-[11px] shadow-2xl">
      <div className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        <span className="font-black uppercase tracking-widest text-zinc-400">
          Payment Logic Inspector v1.0
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h5 className="mb-2 font-bold text-amber-400">[1] SDK_STATUS</h5>
          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="flex justify-between">
              <span>NicePay SDK Loaded:</span>
              <span className={debugLog.sdkLoaded ? "text-green-400" : "font-bold text-red-500"}>
                {debugLog.sdkLoaded ? "READY" : "NOT_FOUND"}
              </span>
            </p>
            <p className="text-[9px] italic text-zinc-500">
              * &apos;NOT_FOUND&apos;일 경우, head 태그에 나이스페이 script가 누락된 것입니다.
            </p>
          </div>
        </section>

        <section>
          <h5 className="mb-2 font-bold text-indigo-400">[2] EVENT_LOG</h5>
          <div className="min-h-[80px] rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            {debugLog.lastError ? (
              <p className="text-red-400">Error: {debugLog.lastError}</p>
            ) : (
              <p className="italic text-zinc-500">버튼 클릭 대기 중... (콘솔 에러 감시 중)</p>
            )}
            <p className="mt-2 text-[9px] text-zinc-600">
              * 버튼을 눌러도 반응이 없다면 &apos;onClick&apos; 함수 바인딩을 확인하세요.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-2 text-[10px] italic text-zinc-500">
        &quot;Data is honest. If the button is silent, check the script.&quot;
      </div>
    </div>
  );
}
