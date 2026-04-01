"use client";

import { useState } from "react";
import Link from "next/link";

// 📚 전문가용 EBP(근거중심) 특수검사 데이터베이스 (지속 확장 가능)
const ebpDatabase = {
  cervical: [
    { id: "spurling", name: "Spurling's Test", paper: "Spurling & Scoville (1944)", purpose: "경추 신경근병증" },
    { id: "distraction", name: "Cervical Distraction", paper: "Viikari-Juntura (1989)", purpose: "경추 신경근병증 완화" },
    { id: "bakody", name: "Shoulder Abduction (Bakody's)", paper: "Bakody (1953)", purpose: "C4-C5 신경근 압박" }
  ],
  shoulder: [
    { id: "neer", name: "Neer Impingement Test", paper: "Neer CS (1983)", purpose: "견봉하 충돌증후군" },
    { id: "hawkins", name: "Hawkins-Kennedy", paper: "Hawkins RJ (1980)", purpose: "견봉하 충돌증후군" },
    { id: "emptycan", name: "Empty Can (Jobe)", paper: "Jobe FW (1982)", purpose: "극상근 건병증/파열" },
    { id: "droparm", name: "Drop Arm Test", paper: "Codman EA (1934)", purpose: "회전근개 전층 파열" },
    { id: "obrien", name: "O'Brien's Test (Active Compression)", paper: "O'Brien SJ (1998)", purpose: "SLAP 병변" },
    { id: "yergason", name: "Yergason's Test", paper: "Yergason RM (1931)", purpose: "이두근 건염" }
  ],
  lumbar: [
    { id: "slr", name: "Straight Leg Raise (SLR)", paper: "Lasegue C (1864)", purpose: "요추 추간판 탈출증 (L4-S1)" },
    { id: "kemp", name: "Kemp's Test (Quadrant)", paper: "Kemp (1950)", purpose: "후관절 증후군" },
    { id: "thomas", name: "Thomas Test", paper: "Thomas HO (1876)", purpose: "고관절 굴곡근 단축" },
    { id: "faber", name: "FABER (Patrick's) Test", paper: "Patrick HT (1917)", purpose: "천장관절 병변" }
  ],
  knee: [
    { id: "lachman", name: "Lachman Test", paper: "Torg JS (1976)", purpose: "전방십자인대(ACL) 파열" },
    { id: "anterior_drawer", name: "Anterior Drawer Test", paper: "Girgis FG (1975)", purpose: "전방십자인대(ACL) 파열" },
    { id: "mcmurray", name: "McMurray Test", paper: "McMurray TP (1937)", purpose: "반월상 연골판 파열" },
    { id: "apley", name: "Apley's Compression", paper: "Apley AG (1947)", purpose: "반월상 연골판 파열" },
    { id: "valgus", name: "Valgus Stress Test", paper: "Hughston JC (1976)", purpose: "내측측부인대(MCL) 손상" }
  ]
};

export default function ProfessionalEvaluationPage() {
  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  
  // 평가 데이터 상태 관리
  const [romData, setRomData] = useState({ flexion: "", extension: "", abd: "", extRot: "", intRot: "" });
  const [mmtData, setMmtData] = useState({ mainMuscle: "Normal (5)" });
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  const [isCompiling, setIsCompiling] = useState(false);
  const [aiPromptData, setAiPromptData] = useState("");

  const handleTestToggle = (testId: string, result: string) => {
    setSpecialTests(prev => ({ ...prev, [testId]: prev[testId] === result ? "" : result }));
  };

  const handleRomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRomData(prev => ({ ...prev, [name]: value }));
  };

  // 🪄 [AI 연동 준비 단계] 입력된 모든 데이터를 AI 프롬프트용 텍스트로 압축 조립
  const compileDataForAI = () => {
    setIsCompiling(true);
    
    setTimeout(() => {
      let rawData = `[환자 평가 데이터 (이 데이터를 기반으로 SOAP를 작성해 줘)]\n`;
      rawData += `■ 주호소 관절: ${selectedJoint.toUpperCase()}\n`;
      rawData += `■ 통증 척도(VAS): ${painScale} / 10\n\n`;
      
      rawData += `■ 관절가동범위 (ROM)\n`;
      rawData += `- Flexion: ${romData.flexion || "N/A"}°\n`;
      rawData += `- Extension: ${romData.extension || "N/A"}°\n`;
      rawData += `- Abduction: ${romData.abd || "N/A"}°\n`;
      rawData += `- External/Internal Rotation: ${romData.extRot || "N/A"}° / ${romData.intRot || "N/A"}°\n\n`;

      rawData += `■ 도수근력검사 (MMT): ${mmtData.mainMuscle}\n\n`;

      rawData += `■ 특수 검사 (Special Tests)\n`;
      let positiveCount = 0;
      if (selectedJoint && ebpDatabase[selectedJoint]) {
        ebpDatabase[selectedJoint].forEach(test => {
          const result = specialTests[test.id];
          if (result) {
            rawData += `- ${test.name} (${test.purpose}) [Ref: ${test.paper}]: ${result}\n`;
            if (result === "Positive (+)") positiveCount++;
          }
        });
      }
      
      if (positiveCount === 0) rawData += `- 유의미한 양성 반응 없음\n`;

      rawData += `\n▶ AI 지시사항: 위 평가 데이터를 바탕으로 물리치료사 관점의 전문적인 SOAP 노트를 작성해. Objective에는 수치를 정확히 명시하고, Assessment에는 논문 근거를 바탕으로 한 임상적 추론을, Plan에는 3단계 재활 계획을 포함해.`;

      setAiPromptData(rawData);
      setIsCompiling(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-24">
      
      {/* 🔹 헤더 섹션 */}
      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">전문가용 EBP 임상 평가</h1>
          <p className="mt-1 text-sm text-zinc-600">데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* 🟡 왼쪽: 하이엔드 임상 평가 입력 패널 */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-7 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-3">STEP 1. 기초 평가 & ROM/MMT</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">통증 척도 (VAS): {painScale}</label>
              <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">진단 부위 (Joint)</label>
              <select className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50" value={selectedJoint} onChange={(e) => { setSelectedJoint(e.target.value as any); setSpecialTests({}); }}>
                <option value="">부위를 선택하세요</option>
                <option value="cervical">Cervical (경추)</option>
                <option value="shoulder">Shoulder (견관절)</option>
                <option value="lumbar">Lumbar (요추)</option>
                <option value="knee">Knee (슬관절)</option>
              </select>
            </div>

            {/* ROM & MMT 입력부 */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-zinc-800">ROM (관절가동범위) - Active/Passive</label>
              <div className="grid grid-cols-2 gap-3">
                <input name="flexion" placeholder="Flexion (예: 150)" value={romData.flexion} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:ring-blue-100" />
                <input name="extension" placeholder="Extension (예: 45)" value={romData.extension} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:ring-blue-100" />
                <input name="abd" placeholder="Abduction (예: 160)" value={romData.abd} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:ring-blue-100" />
                <div className="flex gap-2">
                   <input name="extRot" placeholder="ER" value={romData.extRot} onChange={handleRomChange} className="w-1/2 h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:ring-blue-100" />
                   <input name="intRot" placeholder="IR" value={romData.intRot} onChange={handleRomChange} className="w-1/2 h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:ring-blue-100" />
                </div>
              </div>
              
              <label className="block text-sm font-semibold text-zinc-800 pt-3">MMT (도수근력검사)</label>
              <select className="w-full h-10 rounded-lg border border-zinc-200 px-4 text-sm bg-zinc-50" value={mmtData.mainMuscle} onChange={(e) => setMmtData({mainMuscle: e.target.value})}>
                <option>Normal (5/5)</option>
                <option>Good (4/5) - 저항에 다소 밀림</option>
                <option>Fair (3/5) - 중력 이겨냄</option>
                <option>Poor (2/5) - 중력 제거 시 움직임</option>
                <option>Trace (1/5) - 근수축만 촉지</option>
              </select>
            </div>
          </div>

          {/* 특수 검사 영역 */}
          {selectedJoint && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-7 shadow-sm animate-in fade-in">
              <h2 className="text-lg font-bold text-blue-950 mb-4 border-b pb-3">STEP 2. EBP 특수 검사 (Special Tests)</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {ebpDatabase[selectedJoint].map((test) => (
                  <div key={test.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-blue-200 transition">
                    <div className="mb-3">
                      <p className="text-sm font-bold text-zinc-900">{test.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">목적: {test.purpose} | <span className="text-blue-600">Ref: {test.paper}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTestToggle(test.id, "Positive (+)")} className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${specialTests[test.id] === "Positive (+)" ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>Positive (+)</button>
                      <button onClick={() => handleTestToggle(test.id, "Negative (-)")} className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${specialTests[test.id] === "Negative (-)" ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>Negative (-)</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🔵 오른쪽: 데이터 컴파일 및 AI 전송 대기 상태 */}
        <div className="space-y-6">
          <button onClick={compileDataForAI} disabled={!selectedJoint || isCompiling} className={`w-full flex h-16 items-center justify-center gap-2 rounded-xl text-lg font-bold text-white shadow-lg transition ${!selectedJoint ? 'bg-zinc-300' : 'bg-blue-950 hover:bg-blue-900'}`}>
            {isCompiling ? "데이터 조립 중..." : "AI 프롬프트용 데이터 컴파일 (API 전송 대기)"}
          </button>

          <div className="bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-800">
            <h3 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              Compiled Data (Ready for LLM)
            </h3>
            <textarea 
              readOnly 
              value={aiPromptData} 
              placeholder="왼쪽에서 평가를 입력하고 버튼을 누르면, AI에게 전달될 '완벽하게 구조화된 원시 데이터(프롬프트)'가 이곳에 생성됩니다. 다음 단계에서 이 데이터를 OpenAI API로 쏘아 올립니다."
              className="w-full h-[500px] rounded-xl border-none bg-zinc-800/50 p-4 text-sm text-zinc-300 font-mono resize-none focus:outline-none" 
            />
          </div>
        </div>

      </div>
    </div>
  );
}