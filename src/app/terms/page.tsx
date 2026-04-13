"use client";

import { useState } from "react";
import Link from "next/link";

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  return (
    <div className="min-h-screen bg-white p-6 md:p-20">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-zinc-400 hover:text-zinc-900 font-bold text-sm mb-10 inline-block">
          &larr; 홈으로 돌아가기
        </Link>

        <div className="flex gap-8 border-b border-zinc-100 mb-10">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`pb-4 text-xl font-black transition-all ${activeTab === "terms" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-300"}`}
          >
            이용약관
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`pb-4 text-xl font-black transition-all ${activeTab === "privacy" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-300"}`}
          >
            개인정보처리방침
          </button>
        </div>

        <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed space-y-8">
          {activeTab === "terms" ? (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-3xl font-black text-zinc-900 mb-6">서비스 이용약관</h1>
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800">제 1 조 (목적)</h3>
                <p>
                  본 약관은 Re:PhyT(이하 &quot;회사&quot;)가 제공하는 AI SOAP 자동 생성 및 환자 관리 서비스(이하
                  &quot;서비스&quot;)의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
                </p>
                <h3 className="text-lg font-bold text-zinc-800">제 2 조 (이용요금 및 결제)</h3>
                <p>
                  회사는 유료 서비스를 제공하며, 이용자는 회사가 정한 요금 체계에 따라 월 구독료 등을 지불해야 합니다.
                  결제는 포트원을 통한 신용카드 및 간편결제를 지원합니다.
                </p>
                <h3 className="text-lg font-bold text-zinc-800">제 3 조 (환불 정책)</h3>
                <p>
                  디지털 콘텐츠 특성상 서비스 이용 내역이 있는 경우 환불이 제한될 수 있으며, 상세 내용은 관련 법령에
                  따릅니다.
                </p>
              </section>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-3xl font-black text-zinc-900 mb-6">개인정보처리방침</h1>
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-800">1. 수집하는 개인정보 항목</h3>
                <p>
                  회사는 회원가입 및 서비스 제공을 위해 이메일, 이름, 연락처, 환자 진단 및 처치 기록 데이터를
                  수집합니다.
                </p>
                <h3 className="text-lg font-bold text-zinc-800">2. 개인정보의 이용 목적</h3>
                <p>
                  수집된 정보는 서비스 제공, AI 차트 생성 알고리즘 고도화, 본인 확인 및 고객 응대 목적으로만
                  사용됩니다.
                </p>
                <h3 className="text-lg font-bold text-zinc-800">3. 개인정보의 보유 및 이용기간</h3>
                <p>회원 탈퇴 시까지 보유하며, 법령에서 정한 기간 동안 안전하게 보관 후 파기합니다.</p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
