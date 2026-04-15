"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

type NicePayErrorResult = { msg?: string };

type NicePayRequestPaymentOptions = {
  clientId: string;
  method: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  mallReserved?: string;
  fnError?: (result: NicePayErrorResult) => void;
};

declare global {
  interface Window {
    NicePay?: {
      requestPayment: (opts: NicePayRequestPaymentOptions) => void;
    };
  }
}

const PRO_AMOUNT = 29_900;

export default function PricingPage() {
  const supabase = useMemo(() => createClient(), []);

  const handleProPayment = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID?.trim();
    if (!clientId) {
      alert("결제 설정이 필요합니다. NEXT_PUBLIC_NICEPAY_CLIENT_ID를 확인해 주세요.");
      return;
    }

    const NicePay = window.NicePay;
    if (!NicePay?.requestPayment) {
      alert("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? window.location.origin;
    const returnUrl = `${baseUrl}/api/payment/callback`;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      alert("구독 결제를 위해 먼저 로그인해 주세요.");
      window.location.href = "/login";
      return;
    }

    NicePay.requestPayment({
      clientId,
      method: "card",
      orderId: `order_${user.id}_${Date.now()}`,
      amount: PRO_AMOUNT,
      goodsName: "Re:PhyT AI Pro 1개월 구독",
      returnUrl,
      mallReserved: user.id,
      fnError(result: NicePayErrorResult) {
        alert(`결제 실패: ${result.msg ?? "알 수 없는 오류"}`);
      },
    });
  }, [supabase]);

  const plans = [
    {
      tier: "free" as const,
      name: "Free (무료체험)",
      price: "0",
      features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
      button: "지금 시작하기",
      color: "bg-zinc-100 text-zinc-600",
    },
    {
      tier: "pro" as const,
      name: "Pro (전문가용)",
      price: "29,900",
      features: ["환자 무제한 등록", "AI SOAP 자동 완성", "P-노트 무한 누적", "PDF 차트보내기"],
      button: "구독하기",
      color: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      tier: "premium" as const,
      name: "Premium (기관용)",
      price: "99,000",
      features: ["Pro의 모든 기능", "다수 계정 연동 (원장+선생님)", "병원 로고 커스텀", "우선 고객 지원"],
      button: "도입 문의",
      color: "bg-blue-950 text-white shadow-blue-200",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold text-zinc-400 transition hover:text-zinc-800"
          >
            ← 홈으로
          </Link>
        </div>

        <div className="mb-16 space-y-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-blue-950 md:text-5xl">
            서비스 요금제 안내
          </h1>
          <p className="text-lg font-medium text-zinc-500">Re:PhyT AI와 함께 물리치료의 질을 높이세요.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-[2.5rem] border border-zinc-200 bg-white p-10 shadow-sm transition duration-300 hover:shadow-xl"
            >
              <div>
                <h3 className="mb-4 text-xl font-black text-zinc-800">{plan.name}</h3>
                <div className="mb-8">
                  <span className="text-4xl font-black text-blue-950">₩{plan.price}</span>
                  <span className="ml-1 font-bold text-zinc-400">/ 월</span>
                </div>
                <ul className="mb-10 space-y-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                      <span className="font-bold text-orange-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className={`h-14 w-full rounded-2xl text-lg font-black shadow-lg transition ${plan.color}`}
                onClick={() => {
                  if (plan.tier === "pro") {
                    handleProPayment();
                    return;
                  }
                  if (plan.tier === "free") {
                    window.location.href = "/login";
                    return;
                  }
                  window.location.href = "tel:01059006834";
                }}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-[2rem] border border-zinc-100 bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-sm font-bold text-zinc-400">결제 안내</p>
          <p className="text-xs leading-relaxed text-zinc-600">
            모든 결제는 부가세 포함 가격이며, 구독 해지는 마이페이지에서 언제든 가능합니다.
            <br />
            결제 관련 문의: 010-5900-6834 (김성준 대표)
          </p>
        </div>
      </div>
    </div>
  );
}
