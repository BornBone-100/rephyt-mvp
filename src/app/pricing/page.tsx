"use client";

import React from "react";
import Script from "next/script";

export default function PricingPage() {
  const handlePayment = () => {
    const { NicePay } = window as any;

    if (!NicePay) {
      alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침 후 다시 시도해주세요.");
      return;
    }

    NicePay.requestPayment({
      clientId: process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID,
      method: "card",
      orderId: `rephyt_${new Date().getTime()}`,
      amount: 9900,
      goodsName: "Re:PhyT Pro 1개월 구독",
      returnUrl: "https://rephyt-ai.vercel.app/api/payment/callback",
      fnError: function (result: any) {
        alert(`결제 실패: ${result.msg}`);
      },
    });
  };

  return (
    <>
      {/* 요금제 페이지에 직접 나이스페이 스크립트 삽입 */}
      <Script
        src="https://pg-sdk.nicepay.co.kr/v1/latest/js/nicepay.js"
        strategy="lazyOnload"
      />

      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm rounded-3xl border-2 border-orange-500 bg-white p-8 text-center shadow-xl">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Re:PhyT Pro</h2>
          <p className="mb-6 font-medium text-gray-500">물리치료사를 위한 전문 AI 솔루션</p>

          <div className="mb-8">
            <span className="text-4xl font-black text-blue-950">9,900원</span>
            <span className="ml-1 text-gray-400">/월</span>
          </div>

          <ul className="mb-8 space-y-4 text-left">
            <li className="flex items-center text-sm text-gray-600">✅ AI SOAP 무제한 생성</li>
            <li className="flex items-center text-sm text-gray-600">✅ 환자 데이터 무제한 검색/관리</li>
            <li className="flex items-center text-sm text-gray-600">✅ 월간 환자 분석 리포트 제공</li>
          </ul>

          <button
            onClick={handlePayment}
            className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg transition-all hover:bg-orange-600"
          >
            지금 구독 시작하기
          </button>
        </div>
      </div>
    </>
  );
}
