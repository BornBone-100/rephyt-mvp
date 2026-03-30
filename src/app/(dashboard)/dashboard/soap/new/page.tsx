// src/app/(dashboard)/dashboard/soap/new/page.tsx
"use client";

import { useState, useRef } from "react";

// 음성 인식 관련 타입 정의 (나중에 성준님의 로직으로 대체하세요)
type SpeechToTextStatus = "idle" | "listening" | "error" | "done";

const NewSoapNotePage = () => {
  // SOAP 입력 상태 관리
  const [soapData, setSoapData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });

  // 음성 인식 관련 상태
  const [isRecording, setIsRecording] = useState(false);
  const [sttStatus, setSttStatus] = useState<SpeechToTextStatus>("idle");
  // [기능 Stubs] 여기에 실제 음성인식 인스턴스(예: webkitSpeechRecognition)를 저장할 ref를 나중에 넣으세요.
  // const recognitionRef = useRef<any>(null);

  // 입력값 변경 함수
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>, section: keyof typeof soapData) => {
    setSoapData((prev) => ({ ...prev, [section]: e.target.value }));
  };

  // 🚨 [핵심 기능] 음성 인식 시작/중지 함수 (성준님의 ux/ui를 기억해서 만듭니다!)
  const toggleRecording = () => {
    if (isRecording) {
      // 녹음 중지 로직
      setIsRecording(false);
      setSttStatus("done");
      // [기능 Stubs] recognitionRef.current.stop(); 나중에 넣으세요.
      alert("음성 녹음을 중지합니다. (실제 음성-텍스트 변환은 나중에!)");
      // 성준님이 어플 만들때 쓰던 stt 로직을 호출해서soapData.subjective에 텍스트를 채우면 됩니다.
      setSoapData(prev => ({...prev, subjective: prev.subjective + "\n[음성 녹음 내용이 여기에 채워집니다 (Stubs)]"}))
    } else {
      // 녹음 시작 로직
      setIsRecording(true);
      setSttStatus("listening");
      // [기능 Stubs] recognitionRef.current.start(); 나중에 넣으세요.
      alert("마이크 사용 권한을 요청합니다. (음성 녹음 시작!)");
    }
  };

  // SOAP 제출 함수
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("새 SOAP 노트 데이터 (DB로 보낼 예정):", soapData);
    // [기능 Stubs] 나중에 성준님이 여기에 Supabase 'insert' 코드를 넣으면 됩니다.
    alert("새 SOAP 노트가 성공적으로 제출되었습니다. (DB 연결은 나중에!)");
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      
      {/* 🔹 헤더 섹션 */}
      <div className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">새 SOAP 차트 작성</h1>
          <p className="mt-1 text-sm text-zinc-600">김성준 환자님의 전문적인 SOAP 차트를 음성인식과 함께 작성해 주세요.</p>
      </div>

      {/* 🔹 [ux/ui 핵심] 음성인식(녹음기) 컨트롤러 (메디컬 테마 적용) */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            {/* 녹음 아이콘 및 상태 (애니메이션 효과) */}
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
        
        {/* 🚨 [ux/ui 포인트] 포인트 오렌지 컬러 녹음 버튼 (성준님이 쓰던 그 디자인!) */}
        <button onClick={toggleRecording} className={`flex h-12 items-center gap-2 rounded-xl px-7 text-sm font-semibold shadow-md transition ${isRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d={`${isRecording ? 'M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z' : 'M12 4.5v15m7.5-7.5h-15'}` } />
            </svg>
            {isRecording ? "녹음 중지 및 텍스트 변환" : "음성인식 시작"}
        </button>
      </div>

      {/* 🔹 SOAP 차트 입력 폼 (전문가용 디자인 테마) */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {[
          { key: "subjective", label: "Subjective (주관적 정보)", placeholder: "환자가 호소하는 통증의 양상, 강도, 부위 등을 음성으로 입력하거나 직접 작성해 주세요." },
          { key: "objective", label: "Objective (객관적 검사 결과)", placeholder: "물리치료사가 측정한 ROM, 근력 검사, 특수 검사 등의 객관적 데이터를 기록해 주세요." },
          { key: "assessment", label: "Assessment (임상적 판단)", placeholder: "검사 결과를 바탕으로 내린 진단적 판단과 치료 목표(Goal Setting)를 작성해 주세요." },
          { key: "plan", label: "Plan (치료 계획)", placeholder: "향후 시행할 치료의 내용(매뉴얼, 운동), 주/월별 치료 스케줄을 기록해 주세요." }
        ].map((section) => (
            <label key={section.key} className="block space-y-2 bg-white rounded-2xl border border-zinc-100 p-7 shadow-sm transition hover:border-blue-100">
                <span className="text-lg font-bold text-blue-950">{section.label}</span>
                <textarea value={soapData[section.key as keyof typeof soapData]} onChange={(e) => handleInputChange(e, section.key as keyof typeof soapData)} placeholder={section.placeholder} rows={6} className="w-full rounded-xl border border-zinc-200 p-5 text-sm transition focus:border-blue-300 focus:ring-blue-100 focus:bg-zinc-50/50" />
            </label>
        ))}

        {/* 제출 버튼: 메디컬 블루 테마 적용 */}
        <div className="pt-6 flex justify-end">
            <button type="submit" className="h-12 px-10 rounded-xl bg-blue-950 text-sm font-semibold text-white shadow-md transition hover:bg-blue-900">
                새 SOAP 노트 제출 완료
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewSoapNotePage;