"use client";

import { useState } from "react";
import Link from "next/link";

type SpeechToTextStatus = "idle" | "listening" | "error" | "done";

const NewSoapNotePage = () => {
  const [soapData, setSoapData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });

  const [isRecording, setIsRecording] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>, section: keyof typeof soapData) => {
    setSoapData((prev) => ({ ...prev, [section]: e.target.value }));
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      alert("음성 녹음을 중지합니다.");
    } else {
      setIsRecording(true);
      alert("마이크 사용 권한을 요청합니다. (음성 녹음 시작!)");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("새 SOAP 노트가 성공적으로 작성되었습니다! (DB 연결은 다음 단계에서 진행합니다)");
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
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">새 SOAP 차트 작성</h1>
          <p className="mt-1 text-sm text-zinc-600">환자님의 전문적인 SOAP 차트를 음성인식과 함께 작성해 주세요.</p>
        </div>
      </div>

      {/* 🔹 음성인식 컨트롤러 */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
            <div className={`rounded-full p-4 ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white text-blue-900 border border-zinc-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
            </div>
            <div>
                <h3 className="font-bold text-lg text-blue-950">음성 인식 진료 차팅</h3>
                <p className="text-sm text-blue-800">환자와 대화하며 차트를 자동으로 작성할 수 있습니다.</p>
            </div>
        </div>
        
        <button onClick={toggleRecording} type="button" className={`flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm font-semibold shadow-md transition w-full md:w-auto ${isRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d={`${isRecording ? 'M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z' : 'M12 4.5v15m7.5-7.5h-15'}` } />
            </svg>
            {isRecording ? "녹음 중지 및 텍스트 변환" : "음성인식 시작"}
        </button>
      </div>

      {/* 🔹 SOAP 차트 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {[
          { key: "subjective", label: "Subjective (주관적 정보)" },
          { key: "objective", label: "Objective (객관적 검사 결과)" },
          { key: "assessment", label: "Assessment (임상적 판단)" },
          { key: "plan", label: "Plan (치료 계획)" }
        ].map((section) => (
            <label key={section.key} className="block space-y-2 bg-white rounded-2xl border border-zinc-100 p-7 shadow-sm transition hover:border-blue-100">
                <span className="text-lg font-bold text-blue-950">{section.label}</span>
                <textarea value={soapData[section.key as keyof typeof soapData]} onChange={(e) => handleInputChange(e, section.key as keyof typeof soapData)} rows={6} className="w-full rounded-xl border border-zinc-200 p-5 text-sm transition focus:border-blue-300 focus:ring-blue-100" />
            </label>
        ))}

        <div className="pt-6 flex justify-end">
            <button type="submit" className="h-12 px-10 rounded-xl bg-blue-950 text-sm font-semibold text-white shadow-md transition hover:bg-blue-900">
                SOAP 노트 제출 완료
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewSoapNotePage;