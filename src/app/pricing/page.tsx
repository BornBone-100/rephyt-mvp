"use client";

import React from 'react';
import Script from 'next/script'; 

// 🚀 전역 객체 이름이 NicePay에서 AUTHNICE로 변경되었습니다.
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

    // 💡 최신 규격의 호출 메서드입니다.
    authNice.requestPay({
      clientId,
      method: "card",
      orderId: `rephyt_${Date.now()}`,
      amount: 9900,
      goodsName: "Re:PhyT Pro 1개월 구독",
      returnUrl,
      fnError(result: any) {
        // 에러 메시지 키값도 최신 규격에 맞게 보완했습니다.
        alert(`결제 실패: ${result.errorMsg || result.msg || "알 수 없는 오류"}`);
      },
    });
  };

  const plans = [
    {
      name: "Free (무료체험)",
      price: "0",
      features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
      button: "지금 시작하기",
      color: "bg-zinc-100 text-zinc-600",
    },
    {
      name: "Pro (전문가용)",
      price: "9,900",
      features: ["환자 무제한 등록", "AI SOAP 자동 완성", "P-노트 무한 누적", "PDF 차트 내보내기"],
      button: "구독하기",
      color: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      name: "Premium (기관용)",
      price: "99,000",
      features: ["Pro의 모든 기능", "다수 계정 연동 (원장+선생님)", "병원 로고 커스텀", "우선 고객 지원"],
      button: "도입 문의",
      color: "bg-blue-950 text-white shadow-blue-200",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6">
      {/* 🚀 완전히 교체된 나이스페이 최신 공식 SDK 주소 */}
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
                <h3 className="text-xl font-black text-zinc-800 mb-4">{plan.name}</h3>
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

        <div className="mt-20 text-center bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <p className="text-zinc-400 text-sm font-bold mb-2">결제 안내</p>
          <p className="text-zinc-600 text-xs leading-relaxed text-center">
            모든 결제는 부가세 포함 가격이며, 구독 해지는 마이페이지에서 언제든 가능합니다.
            <br />
            결제 관련 문의: 010-5900-6834 (김성준 대표)
          </p>
        </div>
      </div>
    </div>
  );
}
