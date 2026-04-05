"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function NewPatientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💡 [핵심] DB 서랍장 이름표(Column)와 1000% 똑같이 스펠링을 맞췄습니다!
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "남성",
    diagnosis: "",
    phone: "",
    memo: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("환자 이름은 필수 입력 사항입니다.");
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 💡 DB로 데이터를 쏠 때, 우리가 만든 칸에 정확히 꽂아 넣습니다.
    const { error } = await (supabase as any)
      .from('patients')
      .insert([
        {
          name: formData.name,
          age: parseInt(formData.age) || null, // 숫자로 안전하게 변환
          gender: formData.gender,
          diagnosis: formData.diagnosis,
          phone: formData.phone,
          memo: formData.memo,
          created_by: user?.id
        }
      ]);

    if (error) {
      alert("환자 등록 중 오류가 발생했습니다: " + error.message);
      setIsSubmitting(false);
    } else {
      router.push("/dashboard/patients"); // 성공 시 환자 목록으로 즉시 이동
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 border-b border-zinc-200 pb-6">
          <Link href="/dashboard/patients" className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 mb-4 transition">
            &larr; 돌아가기
          </Link>
          <h1 className="text-3xl font-black text-blue-950">신규 환자 등록</h1>
          <p className="mt-2 text-sm text-zinc-600">Re:PhyT 케어 시스템에 새로운 환자 차트를 등록해 주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <label className="block text-sm font-black text-zinc-800">환자 이름 <span className="text-orange-500">*</span></label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="예: 김성준" />
            </div>

            {/* 나이 입력 */}
            <div className="space-y-2">
              <label className="block text-sm font-black text-zinc-800">나이 (세)</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="예: 33" />
            </div>
          </div>

          {/* 성별 선택 */}
          <div className="space-y-3">
            <label className="block text-sm font-black text-zinc-800">성별</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="gender" checked={formData.gender === "남성"} onChange={() => handleRadioChange("남성")} className="w-5 h-5 accent-blue-600" />
                <span className="text-sm font-medium text-zinc-700">남성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="gender" checked={formData.gender === "여성"} onChange={() => handleRadioChange("여성")} className="w-5 h-5 accent-blue-600" />
                <span className="text-sm font-medium text-zinc-700">여성</span>
              </label>
            </div>
          </div>

          {/* 주 진단명 */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-zinc-800">주 진단명 (Diagnosis)</label>
            <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="예: 요추 추간판 탈출증" />
          </div>

          {/* 연락처 */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-zinc-800">연락처</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="예: 010-1234-5678" />
          </div>

          {/* 특이사항 */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-zinc-800">특이사항 (Memo)</label>
            <textarea name="memo" value={formData.memo} onChange={handleChange} className="w-full h-24 rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none" placeholder="환자의 수술 이력, 기저질환 등을 자유롭게 적어주세요." />
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto md:float-right h-12 rounded-xl bg-blue-950 px-8 font-bold text-white shadow-md transition hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "DB에 저장하는 중..." : "환자 등록 완료"}
            </button>
            <div className="clear-both"></div>
          </div>
        </form>
      </div>
    </div>
  );
}