"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// --- [추가] 블랙 디버깅 박스 컴포넌트 ---
function RePhyTPaymentInspector({ 
  sdkLoaded, 
  nicepayStartExists, 
  currentLang, 
  envMid 
}: { 
  sdkLoaded: boolean; 
  nicepayStartExists: boolean; 
  currentLang: string;
  envMid: string | undefined;
}) {
  return (
    <div className="mt-10 p-6 bg-[#080808] rounded-[32px] border border-zinc-800 font-mono text-[10px] shadow-2xl text-zinc-300">
      <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-zinc-400 font-black uppercase tracking-widest">Payment Logic Inspector v1.1</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-zinc-500 mb-1">SDK & Window Status</p>
          <p>SDK Loaded: <span className={sdkLoaded ? "text-green-400" : "text-red-500"}>{sdkLoaded ? "YES" : "NO"}</span></p>
          <p>nicepayStart: <span className={nicepayStartExists ? "text-green-400" : "text-red-500"}>{nicepayStartExists ? "READY" : "NOT_FOUND"}</span></p>
        </div>
        <div>
          <p className="text-zinc-500 mb-1">Environment</p>
          <p>Language: <span className="text-indigo-400">{currentLang}</span></p>
          <p>MID Config: <span className={envMid ? "text-green-400" : "text-amber-500"}>{envMid ? "OK" : "TEST_MODE"}</span></p>
        </div>
      </div>
      <div className="mt-3 p-2 bg-zinc-900 rounded border border-zinc-800 text-[9px] text-zinc-500">
        * 버튼 무반응 시: nicepayStart가 READY인지 확인하세요. NO라면 스크립트 로드 전략을 변경해야 합니다.
      </div>
    </div>
  );
}

declare global {
  interface Window {
    nicepayStart?: (authData: Record<string, string>) => void;
    NicePay?: {
      nicepayStart?: (authData: Record<string, string>) => void;
    };
    AUTHNICE?: {
      requestPay?: (
        payload: Record<string, string> & {
          fnError: (err: { errorMsg?: string }) => void;
        },
      ) => void;
    };
  }
}

type PricingDict = {
  pricing: {
    title: string;
    price: string;
    features: string[];
    button: string;
  };
};

type Props = {
  dict: PricingDict;
  lang: "ko" | "en";
};

export function PricingClient({ dict, lang }: Props) {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const currentLang = params.lang === "en" || params.lang === "ko" ? params.lang : lang;
  const base = `/${currentLang}`;
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [finalAmount] = useState(5900);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKoPayLoading, setIsKoPayLoading] = useState(false);
  const [isNicepayReady, setIsNicepayReady] = useState(false);
  const supabase = createClient();
  const envMid = process.env.NEXT_PUBLIC_NICEPAY_MID?.trim();
  const niceMid = envMid || "nictest00m";

  // --- [디버깅용 상태] ---

  useEffect(() => {
    setIsMounted(true);

    // 브라우저 마운트 후 0.5초 간격으로 결제 엔진 준비 상태를 확인합니다.
    const checkInterval = setInterval(() => {
      if (typeof window !== "undefined" && window.AUTHNICE) {
        setIsNicepayReady(true);
        console.log("✅ Re:PhyT 결제 엔진 시동 완료");
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    void getUser();
  }, [supabase]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const handleSubscribe = async () => {
    console.log("💳 handleSubscribe 시작됨");
    const user = await getUser();

    if (!user) {
      console.log("❌ 유저 없음: 로그인 페이지로 이동");
      router.push(`${base}/login`);
      return;
    }

    const userEmail = user.email ?? "";
    const nextUserId = user.id;
    const buyerName = user.user_metadata?.full_name || userEmail.split("@")[0] || "Re:PhyT User";

    if (currentLang === "ko") {
      console.log("🇰🇷 한국어 결제 로직 진입");
      setIsKoPayLoading(true);

      let nicepayEngine = window.AUTHNICE;
      if (!nicepayEngine || !nicepayEngine.requestPay) {
        console.error("🚨 [Re:PhyT] 엔진을 찾지 못해 재시도합니다...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryEngine = window.AUTHNICE;
        if (!retryEngine || !retryEngine.requestPay) {
          setIsKoPayLoading(false);
          alert("결제 모듈이 아직 준비되지 않았습니다. 1~2초 후 다시 눌러주세요.");
          return;
        }
        nicepayEngine = retryEngine;
      }

      try {
        const orderId = `rephyt_${Date.now()}`;
        const amount = "5900"; // 실제 가격 5900원 동기화
        console.log("🛰️ 서버로 서명 요청 중...");
        
        const signRes = await fetch("/api/payments/nicepay/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId, amount, goodsName: "Re:PhyT Pro 구독",
            userId: nextUserId, buyerName, buyerEmail: userEmail,
            returnUrl: `${window.location.origin}/api/payments/nicepay/callback`,
            mid: niceMid,
          }),
        });

        const signData = await signRes.json();
        console.log("📡 서명 응답 데이터:", signData);
        console.log("authData keys", Object.keys(signData?.authData || {}));
        console.log("authData sample", signData?.authData);

        if (signData.success && signData.authData) {
          console.log("🚀 [Re:PhyT] 진짜 결제창 호출합니다!");
          const nicepay = window.AUTHNICE;
          if (nicepay?.requestPay) {
            const paymentParams = {
              ...signData.authData,
              clientId: signData.authData.MID,
              fnError: (err: { errorMsg?: string }) => {
                console.error("❌ 결제 에러:", err);
                alert(`결제 중 오류가 발생했습니다: ${err.errorMsg ?? "알 수 없는 오류"}`);
                setIsKoPayLoading(false);
              },
            };

            nicepay.requestPay(paymentParams);
          } else {
            window.nicepayStart?.(signData.authData);
          }
        } else {
          setIsKoPayLoading(false);
          alert(signData.message || "결제 준비 실패");
        }
      } catch (err) {
        console.error("🔥 결제 프로세스 에러:", err);
        setIsKoPayLoading(false);
      } finally {
        setIsKoPayLoading(false);
      }
      return;
    }

    // 해외 결제 로직
    const checkoutUrl = `https://rephyt.lemonsqueezy.com/checkout/buy/fe0a7082-3aa9-4a17-bbd2-c9cee85ae282?checkout[email]=${encodeURIComponent(userEmail)}&checkout[custom][user_id]=${encodeURIComponent(nextUserId)}`;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  // ... (submitBillingInfo 및 plans 설정 코드는 동일하여 생략, 기존 코드 유지하세요)

  const plans = useMemo(() => [
    {
      id: "free" as const,
      name: "Free (무료체험)",
      price: "0",
      description: "Re:PhyT의 핵심 기능을 체험해볼 수 있는 베이직 플랜입니다.",
      features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
      button: "지금 시작하기",
      color: "bg-zinc-100 text-zinc-600",
    },
    {
      id: "pro" as const,
      name: dict.pricing.title,
      priceFull: dict.pricing.price,
      price: "",
      description: currentLang === "en" ? "Unlimited AI for clinicians." : "무제한 AI 솔루션입니다. (1개월 정기결제)",
      features: dict.pricing.features,
      button: dict.pricing.button,
      color: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      id: "premium" as const,
      name: "Premium (기관용)",
      price: "99,000",
      description: "병원/센터 단위 맞춤형 관리 솔루션입니다.",
      features: ["Pro의 모든 기능", "다수 계정 연동", "병원 로고 커스텀"],
      button: "도입 문의",
      color: "bg-blue-950 text-white shadow-blue-200",
    }
  ], [dict, currentLang]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* ... 상단 타이틀 생략 ... */}
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-[2.5rem] p-10 border shadow-sm flex flex-col justify-between ${plan.id === 'pro' ? 'border-2 border-blue-950 bg-white' : 'bg-white'}`}>
              {/* 카드 상단 내용 */}
              <div>
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mb-6">{plan.description}</p>
                <div className="mb-8">
                    <span className="text-4xl font-black text-blue-950">{plan.priceFull || `₩${plan.price}`}</span>
                    {plan.id !== 'premium' && <span className="text-zinc-400 font-bold ml-1">/ 월</span>}
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => plan.id === "pro" ? void handleSubscribe() : undefined}
                disabled={plan.id === "pro" && isKoPayLoading}
                className={`w-full h-14 rounded-2xl font-black text-lg transition ${plan.color}`}
              >
                {isKoPayLoading && plan.id === 'pro' ? "결제창 준비 중..." : plan.button}
              </button>
            </div>
          ))}
        </div>

        {/* --- [추가] 하단 디버깅 박스 배치 --- */}
        <RePhyTPaymentInspector 
          sdkLoaded={isNicepayReady} 
          nicepayStartExists={isNicepayReady}
          currentLang={currentLang}
          envMid={envMid}
        />

        {/* ... 안내 문구 및 모달 생략 (기존 코드 유지) ... */}
      </div>
    </div>
  );
}