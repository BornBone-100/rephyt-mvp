"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// 🚨 [핵심] Supabase 클라이언트를 불러옵니다.
import { createClient } from "@/utils/supabase/client"; 

const NewPatientPage = () => {
  const router = useRouter();
  // Supabase 도구 장착
  const supabase = createClient(); 
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "M",
    phone: "",
    diagnosis: "",
    memo: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🚨 [핵심] 실제로 DB에 데이터를 전송하는 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Supabase의 'patients' 테이블에 데이터를 밀어 넣습니다 (insert)
    const { error } = await supabase
      .from('patients')
      .insert([
        {
          name: formData.name,
          age: parseInt(formData.age) || 0, // 나이는 숫자로 변환
          gender: formData.gender,
          phone: formData.phone,
          diagnosis: formData.diagnosis,
          memo: formData.memo
        }
      ]);

    // 2. 만약 에러가 나면 알려줍니다.
    if (error) {
      alert("DB 저장 중 오류가 발생했습니다: " + error.message);
      return;
    }

    // 3. 에러가 없으면 성공!
    alert(`${formData.name} 환자님이 실제 DB에 성공적으로 등록되었습니다!`);
    router.push("/dashboard/patients"); // 등록 후 환자 목록으로 자동 이동
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

      {/* 🔹 입력 폼 디자인 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 p-8 shadow-sm space-y-6 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-6">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-900">환자 이름</span>
            <input name="name" type="text" value={formData.name} onChange={handleInputChange} required placeholder="홍길동" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-900">나이 (세)</span>
            <input name="age" type="number" value={formData.age} onChange={handleInputChange} required placeholder="45" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
          </label>
        </div>

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

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">주진단명 (Diagnosis)</span>
          <input name="diagnosis" type="text" value={formData.diagnosis} onChange={handleInputChange} required placeholder="예: 요추 추간판 탈출증 (L-HIVD)" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>
        
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">연락처</span>
          <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="010-1234-5678" className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>
        
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">특이사항 (Memo)</span>
          <textarea name="memo" value={formData.memo} onChange={handleInputChange} placeholder="환자의 과거 병력, 수술 이력 등을 간략히 작성해 주세요." rows={4} className="w-full rounded-xl border border-zinc-200 p-4 text-sm focus:border-blue-300 focus:ring-blue-100" />
        </label>

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