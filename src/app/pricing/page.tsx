"use client";

import React from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (opts: any) => void;
    };
  }
}

export default function PricingPage() {
  const handleProPayment = () => {
    const authNice = window.AUTHNICE;

    if (!authNice) {
      alert("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID?.trim();
    if (!clientId) {
      alert("결제 설정이 필요합니다. NEXT_PUBLIC_NICEPAY_CLIENT_ID를 확인해 주세요.");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? window.location.origin;
    const returnUrl = `${baseUrl}/api/payment/callback`;

    authNice.requestPay({
      clientId,
      method: "card",
      orderId: `rephyt_${Date.now()}`,
      amount: 9900,
      goodsName: "Re:PhyT Pro 1개월 정기구독", // 상품명 명확히 기재
      returnUrl,
      fnError(result: any) {
        alert(`결제 실패: ${result.errorMsg || result.msg || "알 수 없는 오류"}`);
      },
    });
  };

  const plans = [
    {
      name: "Free (무료체험)",
      price: "0",
      description: "Re:PhyT의 핵심 기능을 체험해볼 수 있는 베이직 플랜입니다. 개인 물리치료사 분들의 간단한 차트 관리에 적합합니다.",
      features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
      button: "지금 시작하기",
      color: "bg-zinc-100 text-zinc-600",
    },
    {
      name: "Pro (전문가용)",
      price: "9,900",
      description: "환자 데이터가 많은 프리랜서 및 병원 치료사에게 최적화된 무제한 AI 솔루션입니다. (1개월 단위 정기결제)",
      features: ["환자 무제한 등록", "AI SOAP 자동 완성", "P-노트 무한 누적", "PDF 차트 내보내기"],
      button: "구독하기",
      color: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      name: "Premium (기관용)",
      price: "99,000",
      description: "다수의 치료사가 함께 근무하는 병원/센터 단위에 적합한 엔터프라이즈 맞춤형 관리 솔루션입니다.",
      features: ["Pro의 모든 기능", "다수 계정 연동 (원장+선생님)", "병원 로고 커스텀", "우선 고객 지원"],
      button: "도입 문의",
      color: "bg-blue-950 text-white shadow-blue-200",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6">
      <Script 
        src="https://pay.nicepay.co.kr/v1/js/" 
        strategy="afterInteractive"
      />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-blue-950 tracking-tight">서비스 요금제 안내</h1>
          <p className="text-zinc-500 font-medium text-lg">Re:PhyT AI와 함께 물리치료의 질을 높이세요.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="bg-white rounded-[2.5rem] p-10 border border-zinc-200 shadow-sm flex flex-col justify-between hover:shadow-xl transition duration-300"
            >
              <div>
                <h3 className="text-xl font-black text-zinc-800 mb-2">{plan.name}</h3>
                {/* 🚀 심사 통과를 위한 요금제별 상세 설명 추가 */}
                <p className="text-sm text-zinc-500 mb-6 min-h-[3rem]">{plan.description}</p>
                
                <div className="mb-8">
                  <span className="text-4xl font-black text-blue-950">₩{plan.price}</span>
                  <span className="text-zinc-400 font-bold ml-1">/ 월</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-600 font-medium text-sm">
                      <span className="text-orange-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={plan.name.startsWith("Pro") ? handleProPayment : undefined}
                className={`w-full h-14 rounded-2xl font-black text-lg transition shadow-lg ${plan.color}`}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>

        {/* 🚀 심사 통과를 위한 하단 법적 고지 및 환불 규정 상세화 */}
        <div className="mt-20 text-left bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <h4 className="text-zinc-800 text-sm font-bold mb-4">결제 및 환불 안내 (전자상거래법 기준)</h4>
          <ul className="text-zinc-500 text-xs leading-relaxed space-y-2 list-disc pl-4">
            <li><strong>상품 설명:</strong> 본 상품은 물리치료사를 위한 AI 기반 환자 관리 및 SOAP 차트 자동화 웹 서비스 이용권(디지털 콘텐츠)입니다.</li>
            <li><strong>정기 결제:</strong> Pro 요금제는 1개월 단위의 정기구독 상품으로, 매월 결제일에 등록하신 신용카드로 자동 청구됩니다.</li>
            <li><strong>구독 해지:</strong> 마이페이지 내 [구독 관리]에서 언제든지 수수료 없이 해지하실 수 있으며, 해지 시 다음 결제일부터 청구되지 않습니다. (남은 기간 동안 서비스 유지)</li>
            <li><strong>환불 정책:</strong> 결제 후 7일 이내에 AI 차트 생성 등의 유료 서비스를 이용하지 않은 경우 전액 환불이 가능합니다. 단, 이미 유료 기능을 사용한 이력이 있는 경우 해당 월의 환불은 불가합니다.</li>
            <li><strong>결제 수단:</strong> 신용카드 결제만 지원합니다. (모든 결제 금액은 부가세 10%가 포함된 가격입니다.)</li>
            <li><strong>고객 센터:</strong> 010-5900-6834 (대표 김성준) / 운영시간: 평일 10:00 ~ 18:00 (주말 및 공휴일 휴무)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}