// src/app/(dashboard)/dashboard/patients/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

// 🏥 실제 연결 전까지 사용할 빈 환자 목록 (ux/ui 확인용)
// 나중에 성준님이 Supabase DB 연동하면 이 자리에 데이터가 채워집니다.
const PatientsPage = () => {
  const [patients, setPatients] = useState<any[]>([]); // 초기값은 빈 배열

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      
      {/* 🔹 헤더 섹션: Re:PhyT 브랜드 아이덴티티 적용 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">Re:PhyT 환자 관리</h1>
          <p className="mt-2 text-sm font-medium text-zinc-600">
            데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다
          </p>
        </div>
        
        {/* 🔹 [ux/ui 포인트] 포인트 오렌지 신규 환자 등록 버튼 (클릭 시 이동) */}
        <Link href="/dashboard/patients/new">
          <button className="flex h-12 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            신규 환자 등록
          </button>
        </Link>
      </div>

      {/* 🔹 환자 목록 섹션 */}
      {patients.length === 0 ? (
        // 🚨 [ux/ui 핵심] 환자가 없을 때 보여주는 '빈 상태(Empty State)' 디자인
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-20 px-6 text-center shadow-sm">
          <div className="rounded-full bg-blue-50 p-4 text-blue-900 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900">아직 등록된 환자가 없습니다.</h3>
          <p className="mt-2 text-zinc-600 max-w-sm">
            Re:PhyT의 첫 번째 환자를 등록하고 전문적인 케어를 시작해 보세요. <br />
            오렌지색 '신규 환자 등록' 버튼을 누르면 시작할 수 있습니다.
          </p>
        </div>
      ) : (
        // 환자가 있을 때 테이블 디자인 (나중에 연동 시 사용)
        <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
            {/* 테이블 코드는 아까와 동일하므로 생략 */}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;