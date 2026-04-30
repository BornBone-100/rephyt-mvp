"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export function PricingClient({ dict: _dict, lang: _lang }: Props) {
  const params = useParams<{ lang?: string }>();
  const currentLang = params.lang === "en" || params.lang === "ko" ? params.lang : _lang;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const plans = useMemo(() => [
    {
      id: "free" as const,
      name: "Free (무료체험)",
      price: "0",
      description: "입문자를 위한 기본 기능을 먼저 경험해볼 수 있는 플랜입니다.",
      features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
      button: "지금 시작하기",
      color: "bg-zinc-100 text-zinc-600",
    },
    {
      id: "pro" as const,
      name: "Pro (전문가용)",
      price: "5,900",
      description: "전문가용 기능과 AI 분석 지원을 모두 사용할 수 있습니다.",
      features: ["환자 무제한 등록", "AI SOAP 차트 생성", "처치 로그 무제한"],
      button: "구독하기",
      color: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      id: "premium",
      name: "Premium (기관용)",
      price: "99,000",
      description: "기관 단위 운영에 필요한 고급 관리 기능을 제공합니다.",
      features: ["Pro의 모든 기능", "다수 계정 연동", "병원 로고 커스텀"],
      button: "도입 문의",
      color: "bg-blue-950 text-white shadow-blue-200",
    }
  ], []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-[44px] font-black text-blue-950 tracking-tight">서비스 요금제 안내</h1>
          <p className="mt-3 text-zinc-500 font-medium">Re:PhyT AI의 맞춤 플랜으로 활용해보세요.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-[2.5rem] p-10 border shadow-sm flex flex-col justify-between ${plan.id === 'pro' ? 'border-2 border-blue-950 bg-white' : 'bg-white'}`}>
              {/* 카드 상단 내용 */}
              <div>
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mb-6">{plan.description}</p>
                <div className="mb-8">
                    <span className="text-4xl font-black text-blue-950">₩{plan.price}</span>
                    {plan.id !== 'premium' && <span className="text-zinc-400 font-bold ml-1">/ 월</span>}
                </div>
                <ul className="space-y-2 text-sm text-zinc-500 font-medium mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
              </div>
              
              {plan.id === "pro" ? (
                <Link
                  href={`/${currentLang}/billing`}
                  className={`w-full h-14 rounded-2xl font-black text-lg transition ${plan.color} inline-flex items-center justify-center`}
                >
                  {plan.button}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`w-full h-14 rounded-2xl font-black text-lg transition ${plan.color}`}
                >
                  {plan.button}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6 text-xs text-zinc-500 leading-6">
          <p className="font-bold text-zinc-700 mb-2">서비스 요금 안내 (부가세 포함 기준)</p>
          <p>- 월 정기 결제 상품은 등록한 결제 수단으로 매월 자동 결제됩니다.</p>
          <p>- 환불 정책 및 이용 조건은 이용약관/결제 약관을 따릅니다.</p>
          <p>- 결제 실패 시 구독이 일시 중지될 수 있으며, 재결제 후 자동 복구됩니다.</p>
          <p>- 문의: 도입 문의 버튼 또는 고객센터 채널을 이용해 주세요.</p>
        </div>
      </div>
    </div>
  );
}