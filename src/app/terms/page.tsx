"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function TermsPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  // URL 파라미터에 따라 탭 자동 전환 (예: /terms?tab=privacy)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "privacy") setActiveTab("privacy");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 네비게이션 */}
      <nav className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-blue-950">
            Re:PhyT
          </Link>
          <Link href="/" className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition">
            홈으로 돌아가기
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <div className="flex gap-8 border-b border-zinc-100 mb-12">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`pb-4 text-lg md:text-xl font-black transition-all ${activeTab === "terms" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-300 hover:text-zinc-500"}`}
          >
            서비스 이용약관
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`pb-4 text-lg md:text-xl font-black transition-all ${activeTab === "privacy" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-300 hover:text-zinc-500"}`}
          >
            개인정보처리방침
          </button>
        </div>

        <div className="text-zinc-600 leading-relaxed space-y-10">
          {activeTab === "terms" ? (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black text-zinc-900 mb-8">서비스 이용약관</h1>
              <section className="space-y-6 text-sm md:text-base">
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">제 1 조 (목적)</h3>
                  <p>
                    본 약관은 Re:PhyT(이하 &quot;회사&quot;)가 제공하는 AI SOAP 자동 생성 및 환자 관리 서비스(이하
                    &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로
                    합니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">제 2 조 (이용요금 및 결제)</h3>
                  <p>
                    회사는 유료 서비스를 제공하며, 이용자는 회사가 정한 요금 체계(월 구독료 등)에 따라 비용을 지불해야
                    합니다. 결제는 포트원(PortOne)을 통한 신용카드 및 간편결제를 지원하며, 모든 결제 정보는 안전하게
                    암호화되어 처리됩니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">제 3 조 (환불 및 청약철회)</h3>
                  <p>
                    디지털 콘텐츠 서비스의 특성상, 이용 내역이 존재하거나 결제 후 일정 기간이 경과한 경우 전자상거래법
                    등 관련 법령에 따라 환불이 제한될 수 있습니다.
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black text-zinc-900 mb-8">개인정보처리방침</h1>
              <p className="mb-6 text-sm font-semibold text-zinc-500">
                상호명: 리피트 (Re: PhyT)
              </p>
              <section className="space-y-6 text-sm md:text-base">
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">1. 수집하는 개인정보 항목</h3>
                  <p>회사는 원활한 서비스 제공을 위해 아래와 같은 정보를 수집합니다.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>필수항목: 이메일, 성명, 소속 병원/기관명, 결제 기록</li>
                    <li>서비스 이용 과정에서 생성되는 정보: 환자 평가 데이터(S, O, A), 처치 기록(P)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">2. 개인정보의 수집 및 이용 목적</h3>
                  <p>
                    수집된 개인정보는 회원 관리, 서비스 제공 및 고도화(AI 추론 알고리즘 개선), 유료 결제 처리 및 고객
                    응대 목적으로 사용됩니다. 수집된 환자 데이터는 익명화 처리되어 분석될 수 있습니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">3. 개인정보의 보유 및 이용기간</h3>
                  <p>
                    원칙적으로 회원 탈퇴 시까지 정보를 보유하며, 법령에서 정한 기간(전자상거래법 등) 동안은 해당 법령에
                    따라 보관 후 파기합니다.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-800 mb-2">4. 개인정보의 파기절차 및 방법</h3>
                  <p>
                    회사는 수집 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 전자적 파일 형태의 정보는 기록을
                    재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm font-bold text-zinc-400">
          로딩 중...
        </div>
      }
    >
      <TermsPageContent />
    </Suspense>
  );
}
