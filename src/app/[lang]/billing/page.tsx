"use client";

import { useState, useEffect } from "react";
// 대표님이 제안하신 전역 클라이언트 임포트
import { createClient } from "@/utils/supabase/client";

type DebugData = {
  sentData: string;
  response: {
    resultCode?: string;
    resultMsg?: string;
  };
  timestamp?: string;
  checkPoints: {
    idNoLen: number;
    expDate: string;
  };
};

export default function BillingPage() {
  const supabase = createClient(); // 전역 설정된 클라이언트 사용
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [sessionInfo, setSessionInfo] = useState({
    status: "Checking...",
    email: "None",
    token: "None",
  });

  // 1. 실시간 세션 감시 (전역 키 체계와 완벽 동기화)
  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSessionInfo({
          status: "✅ Logged In",
          email: session.user.email || "Found",
          token: "✅ Found",
        });
      } else {
        setSessionInfo({ status: "❌ Not Logged In", email: "None", token: "❌ Missing" });
      }
    };

    void syncSession();
    // 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      cardNo: formData.get("cardNo")?.toString().replace(/[^0-9]/g, ""),
      expYear: formData.get("expYear"),
      expMonth: formData.get("expMonth"),
      idNo: formData.get("idNo"),
      cardPw: formData.get("cardPw"),
    };

    try {
      // 🚨 [핵심] 현재 세션을 가져와서 토큰이 있는지 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        alert("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        window.location.href = "/ko/login";
        return;
      }

      const response = await fetch("/api/billing-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setDebugData(null);
        alert("5,900원 결제 및 Pro 구독이 완료되었습니다!");
        window.location.href = "/";
      } else {
        setDebugData(result?.debug ?? null);
        alert("실패: " + (result.message || "카드 정보를 확인해 주세요."));
      }
    } catch (error) {
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#020617", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", color: "#ffffff", fontFamily: "sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "450px", textAlign: "center" }}>
        {/* 상단 Pricing Plan (디자인 유지) */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: "100px", fontSize: "12px", fontWeight: "700", color: "#3b82f6", marginBottom: "16px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            Pricing Plan
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: "800", marginBottom: "12px" }}>Re:PhyT Pro</h1>
          <div style={{ fontSize: "28px", fontWeight: "700" }}>
            5,900 <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "400" }}>/ month (VAT 포함)</span>
          </div>
        </div>

        {/* 메인 폼 (스크린샷 02:39:15 디자인 100% 유지) */}
        <div style={{ backgroundColor: "#0f172a", padding: "40px 32px", borderRadius: "24px", border: "1px solid #1e293b", textAlign: "left" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "28px" }}>구독하기</h3>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>카드 번호</label>
              <input type="text" name="cardNo" placeholder="0000 0000 0000 0000" maxLength={19} required style={{ width: "100%", padding: "14px 16px", backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#ffffff", outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>유효기간 (년)</label>
                <input type="text" name="expYear" placeholder="YY" maxLength={2} required style={{ width: "100%", padding: "14px 16px", backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#ffffff", outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>유효기간 (월)</label>
                <input type="text" name="expMonth" placeholder="MM" maxLength={2} required style={{ width: "100%", padding: "14px 16px", backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#ffffff", outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>생년월일 / 사업자번호</label>
                <input type="text" name="idNo" placeholder="6자리 또는 10자리" maxLength={10} required autoComplete="off" style={{ width: "100%", padding: "14px 16px", backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#ffffff", outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "8px" }}>비밀번호 앞 2자리</label>
                <input type="password" name="cardPw" placeholder="**" maxLength={2} required autoComplete="new-password" style={{ width: "100%", padding: "14px 16px", backgroundColor: "#020617", border: "1px solid #334155", borderRadius: "12px", color: "#ffffff", outline: "none" }} />
              </div>
            </div>

            <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "18px", backgroundColor: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: "700", cursor: isLoading ? "not-allowed" : "pointer" }}>
              {isLoading ? "처리 중..." : "구독 시작하기"}
            </button>
          </form>

          {debugData && (
            <div className="mt-8 p-4 bg-slate-900 text-green-400 font-mono text-xs rounded-lg border border-green-500/30">
              <h3 className="text-sm font-bold mb-2 text-white border-b border-green-500/30 pb-1">
                🕵️ [RE:PhyT] 결제 수사 본부 - 진단 리포트
              </h3>

              <div className="space-y-2">
                <p><span className="text-slate-400">결과 코드:</span> <span className="text-red-400 font-bold">{debugData.response.resultCode}</span></p>
                <p><span className="text-slate-400">결과 메시지:</span> {debugData.response.resultMsg}</p>

                <div className="mt-4 p-2 bg-black/50 rounded">
                  <p className="text-blue-400 font-bold mb-1">[나이스페이 전송 원본 데이터]</p>
                  <p className="break-all">{debugData.sentData}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className={`p-2 rounded ${debugData.checkPoints.idNoLen === 6 || debugData.checkPoints.idNoLen === 10 ? "bg-green-900/20" : "bg-red-900/40"}`}>
                    <p>식별번호(IDNo) 길이: {debugData.checkPoints.idNoLen}</p>
                    <small className="text-slate-400">(개인 6 / 법인 10)</small>
                  </div>
                  <div className="p-2 bg-green-900/20 rounded">
                    <p>만료일(Exp): {debugData.checkPoints.expDate}</p>
                    <small className="text-slate-400">(YYMM 형식)</small>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-700">
                <p className="text-yellow-400 font-bold">💡 조치 사항:</p>
                <ul className="list-disc ml-4 text-slate-300">
                  <li>IDNo가 {debugData.checkPoints.idNoLen}자리인데, 카드 종류와 맞습니까?</li>
                  <li>비밀번호 앞 2자리가 확실히 맞습니까?</li>
                  <li>나이스페이 관리자 페이지에서 <b>'해당 카드사 빌링'</b>이 '사용'입니까?</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* [통합 디버그 박스] */}
      <div style={{ position: "fixed", bottom: "20px", right: "20px", padding: "15px", backgroundColor: "#0f172a", border: "1px solid #3b82f6", borderRadius: "12px", fontSize: "11px", color: "#94a3b8", zIndex: 10000 }}>
        <div style={{ color: "#3b82f6", fontWeight: "bold", marginBottom: "8px" }}>UNIFIED SESSION CHECK</div>
        <p>• Status: <span style={{ color: sessionInfo.status.includes("✅") ? "#4ade80" : "#f87171" }}>{sessionInfo.status}</span></p>
        <p>• User: {sessionInfo.email}</p>
        <p>• Token: {sessionInfo.token}</p>
      </div>
    </div>
  );
}
