"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PricingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, [supabase]);

  // 구독하기 버튼 클릭 시 나이스페이 창이 아닌, 우리가 만든 팝업을 엽니다.
  const handleProPaymentClick = () => {
    setIsModalOpen(true);
  };

  const submitBillingInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId) {
      alert("결제를 진행하려면 먼저 로그인이 필요합니다.");
      return;
    }

    // 폼에서 입력받은 데이터 가져오기
    const formData = new FormData(e.currentTarget);
    const requestData = {
      cardNumber: formData.get("cardNumber") as string,
      expMonth: formData.get("expMonth") as string,
      expYear: formData.get("expYear") as string,
      cardPw: formData.get("cardPw") as string,
      idNo: formData.get("idNo") as string,
      userId: userId,
    };

    try {
      // 백엔드 API로 카드 정보 전송
      const res = await fetch("/api/billing/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const result = await res.json();

      if (result.success) {
        alert("🎉 구독 결제 및 등급 업데이트 완벽하게 성공!");
        setIsModalOpen(false);
        
        // 결제 성공 시 하이엔드 임상 평가 화면으로 이동
        window.location.href = "/dashboard/soap/new";
      } else {
        alert(`등록 실패: ${result.message}`);
      }
    } catch (error) {
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
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
    <div className="min-h-screen bg-zinc-50 py-20 px-6 relative">
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
                onClick={plan.name.startsWith("Pro") ? handleProPaymentClick : undefined}
                className={`w-full h-14 rounded-2xl font-black text-lg transition shadow-lg ${plan.color}`}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 text-left bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <h4 className="text-zinc-800 text-sm font-bold mb-4">결제 및 환불 안내 (전자상거래법 기준)</h4>
          <ul className="text-zinc-500 text-xs leading-relaxed space-y-2 list-disc pl-4">
            <li><strong>상품 설명:</strong> 본 상품은 물리치료사를 위한 AI 기반 환자 관리 및 SOAP 차트 자동화 웹 서비스 이용권(디지털 콘텐츠)입니다.</li>
            <li><strong>정기 결제:</strong> Pro 요금제는 1개월 단위의 정기구독 상품으로, 매월 결제일에 등록하신 신용카드로 자동 청구됩니다.</li>
            <li><strong>구독 해지:</strong> 마이페이지 내 [구독 관리]에서 언제든지 수수료 없이 해지하실 수 있으며, 해지 시 다음 결제일부터 청구되지 않습니다.</li>
            <li><strong>환불 정책:</strong> 결제 후 7일 이내에 유료 서비스를 이용하지 않은 경우 전액 환불이 가능합니다. 단, 기능 사용 이력이 있는 경우 해당 월 환불은 불가합니다.</li>
          </ul>
        </div>
      </div>

      {/* 🚀 나이스페이 심사 통과를 위한 커스텀 정기결제 정보 입력 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-blue-950 mb-6">정기결제 카드 정보 입력</h2>
            <form onSubmit={submitBillingInfo} className="space-y-4">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">신용카드 번호</label>
                <input type="text" name="cardNumber" placeholder="숫자만 입력해주세요 (16자리)" required className="w-full p-3 border border-gray-300 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">유효기간 (MM)</label>
                  <input type="text" name="expMonth" placeholder="월 (예: 09)" maxLength={2} required className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">유효기간 (YY)</label>
                  <input type="text" name="expYear" placeholder="년 (예: 25)" maxLength={2} required className="w-full p-3 border border-gray-300 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카드 비밀번호 앞 2자리</label>
                <input type="password" name="cardPw" placeholder="**" maxLength={2} required className="w-full p-3 border border-gray-300 rounded-xl" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">생년월일 (또는 사업자번호)</label>
                <input type="text" name="idNo" placeholder="생년월일 6자리 또는 사업자번호 10자리" required className="w-full p-3 border border-gray-300 rounded-xl" />
                <p className="text-xs text-gray-500 mt-1">개인카드는 생년월일 6자리, 법인카드는 사업자등록번호 10자리</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">취소</button>
                <button type="submit" className="flex-1 p-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600">9,900원 결제하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}