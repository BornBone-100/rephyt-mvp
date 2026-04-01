"use client";

import { useState } from "react";
import Link from "next/link";

// 📚 근거 중심(EBP) 평가 데이터베이스 (논문 레퍼런스 포함)
const assessmentDB = {
  shoulder: [
    { id: "neer", name: "Neer Impingement Test", paper: "Neer CS (1983)", type: "특수검사" },
    { id: "hawkins", name: "Hawkins-Kennedy Test", paper: "Hawkins RJ (1980)", type: "특수검사" },
    { id: "emptyCan", name: "Empty Can (Jobe) Test", paper: "Jobe FW (1982)", type: "특수검사" },
    { id: "apley", name: "Apley Scratch Test", paper: "Magee DJ (2014)", type: "가동범위" }
  ],
  knee: [
    { id: "lachman", name: "Lachman Test", paper: "Torg JS (1976)", type: "특수검사" },
    { id: "mcmurray", name: "McMurray Test", paper: "McMurray TP (1937)", type: "특수검사" },
    { id: "valgus", name: "Valgus Stress Test", paper: "Hughston JC (1976)", type: "특수검사" }
  ],
  spine: [
    { id: "slr", name: "Straight Leg Raise (SLR)", paper: "Lasegue C (1864)", type: "특수검사" },
    { id: "kemp", name: "Kemp's Test", paper: "Kemp (1950)", type: "특수검사" }
  ]
};

export default function EvidenceBasedSoapPage() {
  const [selectedJoint, setSelectedJoint] = useState<keyof typeof assessmentDB | "">("");
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [painScale, setPainScale] = useState<string>("5");
  const [isGenerating, setIsGenerating] = useState(false);

  // SOAP 최종 텍스트 데이터
  const [soapData, setSoapData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });

  // 특수검사 결과(+/-) 토글 핸들러
  const handleTestToggle = (testId: string, result: string) => {
    setTestResults(prev => ({
      ...prev,
      [testId]: prev[testId] === result ? "" : result
    }));
  };

  // 🪄 [핵심 알고리즘] 평가 데이터를 기반으로 SOAP 자동 작성
  const generateAutoSOAP = () => {
    setIsGenerating(true);
    
    // 1초 뒤에 생성되는 애니메이션 효과 (나중에 AI API 연동 시 이 부분 대체)
    setTimeout(() => {
      let objectiveText = `[ROM & Special Tests - ${selectedJoint.toUpperCase()}]\n`;
      let assessmentText = `임상적 추론 (Clinical Reasoning):\n`;
      let positiveTests: string[] = [];

      // 선택된 관절의 검사 결과를 문장으로 조립
      if (selectedJoint && assessmentDB[selectedJoint]) {
        assessmentDB[selectedJoint].forEach(test => {
          const result = testResults[test.id];
          if (result) {
            objectiveText += `- ${test.name}: ${result} (Ref: ${test.paper})\n`;
            if (result === "Positive (+)") positiveTests.push(test.name);
          }
        });
      }

      // Objective가 비어있지 않다면 평가(A)와 계획(P)도 논리적으로 도출
      if (positiveTests.length > 0) {
        assessmentText += `환자는 현재 VAS ${painScale}의 통증을 호소하며, ${positiveTests.join(', ')} 검사에서 양성 반응(+)을 보임. 이는 해당 관절 주변 연부조직의 병변 및 기능 부전을 강력히 시사함. 통증 조절 및 가동성 회복을 위한 단계적 재활 접근이 필수적임.`;
      } else {
        assessmentText += `특이한 양성 반응이 관찰되지 않으나, 주관적 통증(VAS ${painScale})을 고려하여 지속적인 모니터링 및 보존적 관리가 요망됨.`;
      }

      const planText = `- 1단계: 통증 조절 및 염증 완화 (Cryotherapy, 초음파 치료)\n- 2단계: 제한된 ROM 회복을 위한 도수치료 (Joint Mobilization)\n- 3단계: 논문 근거 기반 점진적 저항 운동 (Progressive Resistance Exercise) 지도\n- 환자 교육: 일상생활 자세 교정 및 Home Exercise Program(HEP) 안내`;

      setSoapData({
        subjective: `환자 호소: "관절을 움직일 때 뻐근하고 아파요"\n통증 척도: VAS ${painScale}/10\n발현 시기: 최근 무리한 활동 후 악화됨`,
        objective: objectiveText,
        assessment: assessmentText,
        plan: planText
      });

      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-24">
      
      {/* 🔹 헤더 섹션 */}
      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">근거 중심(EBP) SOAP 자동화</h1>
          <p className="mt-1 text-sm text-zinc-600">데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* 🟡 왼쪽 영역: 치료사 평가 입력 패널 (체크리스트) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg">📋</span> 
              1. 임상 평가 입력
            </h2>
            
            {/* 통증 척도 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">통증 강도 (VAS Score): {painScale}</label>
              <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-zinc-400 mt-1"><span>0 (통증 없음)</span><span>10 (극심한 통증)</span></div>
            </div>

            {/* 평가 부위 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">평가 부위 선택</label>
              <select 
                className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50 focus:ring-blue-100"
                value={selectedJoint}
                onChange={(e) => { setSelectedJoint(e.target.value as any); setTestResults({}); }}
              >
                <option value="">부위를 선택하세요</option>
                <option value="shoulder">Shoulder (어깨)</option>
                <option value="knee">Knee (무릎)</option>
                <option value="spine">Spine (척추)</option>
              </select>
            </div>

            {/* 특수 검사 (논문 근거) 리스트 */}
            {selectedJoint && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <label className="block text-sm font-semibold text-zinc-700">근거 기반 특수 검사 (Special Tests)</label>
                {assessmentDB[selectedJoint].map((test) => (
                  <div key={test.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 flex flex-col gap-3 hover:border-blue-200 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{test.name}</p>
                        <p className="text-xs text-blue-600 font-medium">Ref: {test.paper}</p>
                      </div>
                    </div>
                    {/* Positive / Negative 버튼 */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleTestToggle(test.id, "Positive (+)")}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${testResults[test.id] === "Positive (+)" ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                      >
                        Positive (+)
                      </button>
                      <button 
                        onClick={() => handleTestToggle(test.id, "Negative (-)")}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${testResults[test.id] === "Negative (-)" ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                      >
                        Negative (-)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🪄 AI 자동 생성 버튼 */}
          <button 
            onClick={generateAutoSOAP}
            disabled={!selectedJoint || isGenerating}
            className={`w-full flex h-14 items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-lg transition ${!selectedJoint ? 'bg-zinc-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-500/20'}`}
          >
            {isGenerating ? (
              <span className="animate-pulse">데이터 분석 및 차트 생성 중...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                입력 데이터 기반 SOAP 자동 완성
              </>
            )}
          </button>
        </div>

        {/* 🔵 오른쪽 영역: 완성된 SOAP 차트 결과 뷰포트 */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-800 p-1.5 rounded-lg">📝</span> 
            2. 완성된 SOAP 노트
          </h2>
          
          {[
            { key: "subjective", label: "Subjective (주관적 정보)", h: "h-24" },
            { key: "objective", label: "Objective (객관적 검사 결과)", h: "h-36" },
            { key: "assessment", label: "Assessment (임상적 판단)", h: "h-32" },
            { key: "plan", label: "Plan (치료 계획)", h: "h-32" }
          ].map((section) => (
            <div key={section.key} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <label className="block text-sm font-bold text-blue-950 mb-3">{section.label}</label>
              <textarea 
                value={soapData[section.key as keyof typeof soapData]} 
                onChange={(e) => setSoapData({...soapData, [section.key]: e.target.value})}
                placeholder="왼쪽에서 평가를 완료하고 자동 생성 버튼을 누르시면, 논문 근거를 바탕으로 전문적인 차트가 작성됩니다." 
                className={`w-full rounded-xl border-none bg-zinc-50 p-4 text-sm text-zinc-800 resize-none focus:ring-2 focus:ring-blue-100 ${section.h}`} 
              />
            </div>
          ))}

          <div className="pt-4 flex justify-end">
            <button className="h-12 px-10 rounded-xl bg-blue-950 text-sm font-semibold text-white shadow-md transition hover:bg-blue-900">
              최종 SOAP 차트 DB 저장
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}