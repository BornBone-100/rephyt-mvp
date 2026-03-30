// src/app/(dashboard)/dashboard/patients/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NewPatientPage = () => {
  const router = useRouter();
  
  // 환자 입력 폼 상태 관리
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "M",
    phone: "",
    diagnosis: "",
    memo: ""
  });

  // 입력값 변경 함수
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 폼 제출 함수 (DB 연결 전 ux/ui 확인용)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("신규 환자 데이터 (DB로 보낼 예정):", formData);
    // [기능 Stubs] 나중에 성준님이 여기에 Supabase 'insert' 코드를 넣으면 됩니다.
    alert(`${formData.name} 환자님이 성공적으로 등록되었습니다. (DB 연결은 나중에!)`);
    router.push("/dashboard/patients"); // 등록 후 환자 목록으로 이동
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      
      {/* 🔹 헤더 섹션 */}
      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center gap-4">
        <Link href="/dashboard/patients" className="text-zinc-500 hover:text-zinc-900">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">신규 환자 등록</h1>
          <p className="mt-1 text-sm text-zinc-600">Re:PhyT 케어 시스템의 새로운 환자 정보를 입력해 주세요.</p>
        </div>
      </div>

      {/* 🔹 입력 폼 디자인 (전문가용 차트 스타일) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm space-y-6 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* 이름 */}
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-900">환자 이름</span>
            <input name="name" type="text" value={formData.name} onChange={handleInputChange} required placeholder="홍길동" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
          </label>
          
          {/* 나이 */}
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-900">나이 (세)</span>
            <input name="age" type="number" value={formData.age} onChange={handleInputChange} required placeholder="45" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
          </label>
        </div>

        {/* 성별 라디오 버튼 [ux/ui 포인트] */}
        <div className="space-y-2">
            <span className="text-sm font-semibold text-zinc-900">성별</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input name="gender" type="radio" value="M" checked={formData.gender === 'M'} onChange={handleInputChange} className="h-4 w-4 text-orange-500 border-zinc-300 focus:ring-orange-200" />
                    <span className="text-sm text-zinc-800">남성</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input name="gender" type="radio" value="F" checked={formData.gender === 'F'} onChange={handleInputChange} className="h-4 w-4 text-orange-500 border-zinc-300 focus:ring-orange-200" />
                    <span className="text-sm text-zinc-800">여성</span>
                </label>
            </div>
        </div>

        {/* 주진단명 [ux/ui 메디컬 블루 테마 적용] */}
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">주진단명 (Diagnosis)</span>
          <input name="diagnosis" type="text" value={formData.diagnosis} onChange={handleInputChange} required placeholder="예: 요추 추간판 탈출증 (L-HIVD)" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>
        
        {/* 전화번호 */}
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">연락처</span>
          <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="010-1234-5678" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>
        
        {/* 기타 특이사항 */}
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">특이사항 (Memo)</span>
          <textarea name="memo" value={formData.memo} onChange={handleInputChange} placeholder="환자의 과거 병력, 수술 이력 등을 간략히 작성해 주세요." rows={4} className="w-full rounded-xl border border-zinc-200 p-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>

        {/* 제출 버튼: 전문적인 메디컬 블루 테마 적용 */}
        <div className="pt-6 flex justify-end">
            <button type="submit" className="h-12 px-10 rounded-xl bg-blue-950 text-sm font-semibold text-white shadow-md transition hover:bg-blue-900">
                환자 등록 완료
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewPatientPage;