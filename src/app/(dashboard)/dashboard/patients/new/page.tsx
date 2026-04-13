"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function NewPatientPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [memo, setMemo] = useState("");
  
  // 💡 새롭게 추가된 상태값들
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [pastHistory, setPastHistory] = useState("");
  const [symptomChange, setSymptomChange] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gender || !age) {
      alert("이름, 성별, 나이는 필수 입력 항목입니다.");
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("patients").insert([{
      name,
      gender,
      age: parseInt(age),
      phone,
      diagnosis,
      memo,
      is_first_visit: isFirstVisit,
      past_history: isFirstVisit ? null : pastHistory,
      symptom_change: isFirstVisit ? null : symptomChange,
      created_by: user?.id
    }]);

    setIsSubmitting(false);

    if (!error) {
      router.push("/dashboard/patients");
    } else {
      alert("환자 등록 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/patients" className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 mb-6 transition">
          &larr; 환자 목록으로
        </Link>
        <h1 className="text-3xl font-black text-blue-950 mb-8">신규 환자 등록</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm space-y-8">
          
          {/* 1. 기본 인적 사항 */}
          <div>
            <h2 className="text-lg font-black text-zinc-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span> 기본 인적 사항
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">환자 이름 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 outline-none" required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-600 mb-2">성별 *</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 outline-none" required>
                    <option value="">선택</option>
                    <option value="남성">남성</option>
                    <option value="여성">여성</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-600 mb-2">나이 *</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 35" className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">연락처</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="예: 010-1234-5678" className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-600 mb-2">주 진단명</label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="예: 요추 추간판 탈출증" className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 text-sm focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* 💡 2. 내원 이력 및 History Taking (새로 추가된 하이라이트 부분!) */}
          <div>
            <h2 className="text-lg font-black text-zinc-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span> 내원 이력 (History Taking)
            </h2>
            
            <div className="mb-6 bg-zinc-50 p-2 rounded-xl inline-flex gap-1 border border-zinc-200">
              <button type="button" onClick={() => setIsFirstVisit(true)} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${isFirstVisit ? "bg-white text-blue-950 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>
                🌱 첫 발병 / 첫 내원
              </button>
              <button type="button" onClick={() => setIsFirstVisit(false)} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!isFirstVisit ? "bg-white text-orange-600 shadow-sm border border-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}>
                🔄 타 병원/센터 치료 경험 있음
              </button>
            </div>

            {/* 재내원 환자일 경우에만 스르륵 나타나는 입력칸 */}
            {!isFirstVisit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 bg-orange-50/50 p-6 rounded-2xl border border-orange-100/50 mb-6">
                <div>
                  <label className="block text-sm font-black text-orange-800 mb-2">기존 치료 내역</label>
                  <textarea value={pastHistory} onChange={(e) => setPastHistory(e.target.value)} placeholder="예: A신경외과 주사치료 3회, B한의원 침치료 1개월 등" className="w-full h-24 rounded-xl bg-white border border-orange-200 px-4 py-3 text-sm focus:border-orange-500 outline-none resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-black text-orange-800 mb-2">기존 치료 후 증상 변화</label>
                  <textarea value={symptomChange} onChange={(e) => setSymptomChange(e.target.value)} placeholder="예: 주사 맞을 때만 하루 반짝 좋고 다시 똑같이 저림. 물리치료는 효과 없었음." className="w-full h-24 rounded-xl bg-white border border-orange-200 px-4 py-3 text-sm focus:border-orange-500 outline-none resize-none"></textarea>
                </div>
              </div>
            )}
          </div>

          <hr className="border-zinc-100" />

          {/* 3. 기타 메모 */}
          <div>
            <h2 className="text-lg font-black text-zinc-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-zinc-300 rounded-full"></span> 특이사항 (Memo)
            </h2>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="환자의 직업, 취미, 특별히 주의해야 할 금기증 등을 자유롭게 메모하세요." className="w-full h-24 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:border-blue-500 outline-none resize-none"></textarea>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="h-14 rounded-xl bg-blue-950 px-10 font-black text-white shadow-lg transition hover:bg-blue-900 disabled:opacity-50 text-lg">
              {isSubmitting ? "등록 중..." : "환자 등록 완료"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}