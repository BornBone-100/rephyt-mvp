"use client";

import { useState } from "react";
import Link from "next/link";

// 📚 전문가용 EBP(근거중심) 특수검사 데이터베이스
const ebpDatabase = {
  cervical: [
    { id: "spurling", name: "Spurling's Test", paper: "Spurling & Scoville (1944)", purpose: "경추 신경근병증" },
    { id: "distraction", name: "Cervical Distraction", paper: "Viikari-Juntura (1989)", purpose: "경추 신경근병증 완화" }
  ],
  shoulder: [
    { id: "neer", name: "Neer Impingement Test", paper: "Neer CS (1983)", purpose: "견봉하 충돌증후군" },
    { id: "hawkins", name: "Hawkins-Kennedy", paper: "Hawkins RJ (1980)", purpose: "견봉하 충돌증후군" },
    { id: "emptycan", name: "Empty Can (Jobe)", paper: "Jobe FW (1982)", purpose: "극상근 건병증/파열" }
  ],
  lumbar: [
    { id: "slr", name: "Straight Leg Raise (SLR)", paper: "Lasegue C (1864)", purpose: "요추 추간판 탈출증" },
    { id: "kemp", name: "Kemp's Test", paper: "Kemp (1950)", purpose: "후관절 증후군" }
  ],
  knee: [
    { id: "lachman", name: "Lachman Test", paper: "Torg JS (1976)", purpose: "전방십자인대(ACL) 파열" },
    { id: "mcmurray", name: "McMurray Test", paper: "McMurray TP (1937)", purpose: "반월상 연골판 파열" },
    { id: "valgus", name: "Valgus Stress Test", paper: "Hughston JC (1976)", purpose: "내측측부인대(MCL) 손상" },
    { id: "apley", name: "Apley's Compression", paper: "Apley AG (1947)", purpose: "반월상 연골판 파열" }
  ]
};

export default function AdvancedSoapPage() {
  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  
  // 🚨 [핵심 추가] 병력 청취(History Taking) 상태 관리
  const [historyTaking, setHistoryTaking] = useState("");
  
  const [romData, setRomData] = useState({ flexion: "", extension: "", abd: "", extRot: "", intRot: "" });
  const [mmtData, setMmtData] = useState({ mainMuscle: "Normal (5/5)" });
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });

  const handleTestToggle = (testId: string, result: string) => {
    setSpecialTests(prev => ({ ...prev, [testId]: prev[testId] === result ? "" : result }));
  };

  const handleRomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRomData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🪄 [핵심] History Taking을 포함한 자동 변환 로직
  const generateSoapNotes = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      // 1. Subjective (주관적 정보 - History Taking 반영)
      let subjText = `[주호소 및 병력 청취 (History Taking)]\n`;
      if (historyTaking.trim() !== "") {
        subjText += `환자 진술: "${historyTaking}"\n`;
      } else {
        subjText += `환자 진술: "해당 관절 부위의 통증 및 불편감 호소"\n`;
      }
      subjText += `\n[통증 양상]\n`;
      subjText += `- 통증 척도: VAS ${painScale} / 10\n`;
      subjText += `- 진단 부위: ${selectedJoint ? selectedJoint.toUpperCase() : "미지정"}`;

      // 2. Objective (객관적 데이터 정리)
      let objText = `[ROM - 관절가동범위]\n`;
      if(romData.flexion) objText += `- Flexion: ${romData.flexion}°\n`;
      if(romData.extension) objText += `- Extension: ${romData.extension}°\n`;
      if(romData.abd) objText += `- Abduction: ${romData.abd}°\n`;
      if(romData.extRot || romData.intRot) objText += `- Rotation (ER/IR): ${romData.extRot || "N/A"}° / ${romData.intRot || "N/A"}°\n`;
      
      objText += `\n[MMT - 도수근력검사]\n- 주동근 등급: ${mmtData.mainMuscle}\n\n[Special Tests - 특수 검사]\n`;
      
      let positiveTests: string[] = [];
      let relatedPurposes: string[] = [];

      if (selectedJoint && ebpDatabase[selectedJoint]) {
        ebpDatabase[selectedJoint].forEach(test => {
          const result = specialTests[test.id];
          if (result) {
            objText += `- ${test.name}: ${result}\n`;
            if (result === "Positive (+)") {
              positiveTests.push(test.name);
              relatedPurposes.push(test.purpose);
            }
          }
        });
      }

      // 3. Assessment (임상적 추론)
      let assetText = `병력 청취 및 주관적 통증(VAS ${painScale}/10)을 종합할 때, ${selectedJoint.toUpperCase()} 부위의 기능적 제한이 확인됨.\n`;
      if (positiveTests.length > 0) {
        assetText += `이학적 검사 결과, ${positiveTests.join(', ')} 에서 양성 반응(+)이 관찰됨. `;
        assetText += `이는 [${relatedPurposes.filter((v, i, a) => a.indexOf(v) === i).join(', ')}] 의 병변을 강력히 시사함. `;
        assetText += `현재 ROM 제한 및 MMT(${mmtData.mainMuscle}) 소견을 바탕으로 즉각적인 통증 제어 및 가동성 회복 재활이 요구됨.`;
      } else {
        assetText += `특수 검사상 특이 양성 징후는 관찰되지 않으나, 환자가 호소하는 병력과 임상적 증상을 고려하여 연부조직의 과긴장 또는 미세 손상이 의심됨.`;
      }

      // 4. Plan (치료 계획)
      let planText = `- 1단계 (통증 제어): 통증(VAS ${painScale}) 완화를 위한 물리적 인자 치료 적용\n`;
      planText += `- 2단계 (가동성 회복): Joint Mobilization 및 연부조직 이완술(MFR) 적용\n`;
      planText += `- 3단계 (기능 증진): 근력(${mmtData.mainMuscle}) 강화를 위한 능동-보조 및 저항 운동 교육\n`;
      planText += `- 환자 교육: 일상생활 자세 교정 및 자가 운동 프로그램(HEP) 처방`;

      setSoapData({
        subjective: subjText,
        objective: objText,
        assessment: assetText,
        plan: planText
      });

      setIsGenerating(false);
    }, 1000); 
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-24">
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">전문가용 EBP 임상 평가 & SOAP 자동화</h1>
        <p className="mt-1 text-sm text-zinc-600">데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* 🟡 왼쪽: 하이엔드 임상 평가 입력 패널 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-4 border-b pb-3">STEP 1. 기초 평가 & 문진</h2>
            
            {/* 🚨 새로 추가된 병력 청취 (History Taking) 입력칸 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">병력 청취 (History Taking)</label>
              <textarea 
                value={historyTaking}
                onChange={(e) => setHistoryTaking(e.target.value)}
                placeholder="예) 3일 전 무거운 물건을 들다가 '뚝' 소리와 함께 통증 발생함. 밤에 잘 때 쑤시고 팔을 올리기 힘듦."
                className="w-full h-24 rounded-xl border border-zinc-200 p-3 text-sm focus:ring-blue-100 resize-none bg-zinc-50"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">통증 척도 (VAS): {painScale}</label>
              <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-800 mb-2">진단 부위 (Joint)</label>
              <select className="w-full h-11 rounded-xl border border-zinc-200 px-4 text-sm bg-zinc-50" value={selectedJoint} onChange={(e) => { setSelectedJoint(e.target.value as any); setSpecialTests({}); }}>
                <option value="">부위를 선택하세요</option>
                <option value="cervical">Cervical (경추)</option>
                <option value="shoulder">Shoulder (어깨)</option>
                <option value="lumbar">Lumbar (요추)</option>
                <option value="knee">Knee (무릎)</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-zinc-800">ROM (관절가동범위)</label>
              <div className="grid grid-cols-2 gap-3">
                <input name="flexion" placeholder="Flexion" value={romData.flexion} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" />
                <input name="extension" placeholder="Extension" value={romData.extension} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" />
                <input name="abd" placeholder="Abduction" value={romData.abd} onChange={handleRomChange} className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" />
                <div className="flex gap-2">
                   <input name="extRot" placeholder="ER" value={romData.extRot} onChange={handleRomChange} className="w-1/2 h-10 rounded-lg border border-zinc-200 px-3 text-sm" />
                   <input name="intRot" placeholder="IR" value={romData.intRot} onChange={handleRomChange} className="w-1/2 h-10 rounded-lg border border-zinc-200 px-3 text-sm" />
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

          {selectedJoint && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-blue-950 mb-4 border-b pb-3">STEP 2. EBP 특수 검사</h2>
              <div className="space-y-3">
                {ebpDatabase[selectedJoint].map((test) => (
                  <div key={test.id} className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
                    <p className="text-sm font-bold text-zinc-900 mb-2">{test.name} <span className="text-xs text-blue-600 font-normal">({test.paper})</span></p>
                    <div className="flex gap-2">
                      <button onClick={() => handleTestToggle(test.id, "Positive (+)")} className={`flex-1 h-8 rounded-lg text-xs font-semibold border ${specialTests[test.id] === "Positive (+)" ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-zinc-200 text-zinc-600'}`}>Positive (+)</button>
                      <button onClick={() => handleTestToggle(test.id, "Negative (-)")} className={`flex-1 h-8 rounded-lg text-xs font-semibold border ${specialTests[test.id] === "Negative (-)" ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-zinc-200 text-zinc-600'}`}>Negative (-)</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={generateSoapNotes} disabled={!selectedJoint || isGenerating} className={`w-full flex h-14 items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-lg transition ${!selectedJoint ? 'bg-zinc-300' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {isGenerating ? "문진 및 임상 추론 분석 중..." : "EBP 데이터 기반 SOAP 자동 작성"}
          </button>
        </div>

        {/* 🔵 오른쪽: 완성된 SOAP 차트 결과 */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg">📝</span> 
            완성된 전문 SOAP 노트
          </h2>
          
          {[
            { key: "subjective", label: "Subjective (주관적 정보)", h: "h-32" },
            { key: "objective", label: "Objective (객관적 검사 결과)", h: "h-40" },
            { key: "assessment", label: "Assessment (임상적 판단)", h: "h-40" },
            { key: "plan", label: "Plan (치료 계획)", h: "h-36" }
          ].map((section) => (
            <div key={section.key} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <label className="block text-sm font-bold text-blue-950 mb-3">{section.label}</label>
              <textarea 
                value={soapData[section.key as keyof typeof soapData]} 
                onChange={(e) => setSoapData({...soapData, [section.key]: e.target.value})}
                placeholder="왼쪽에서 문진(History Taking)과 평가 수치를 입력하고 오렌지색 '자동 작성' 버튼을 누르시면 전문 차트가 완성됩니다." 
                className={`w-full rounded-xl border-none bg-zinc-50 p-4 text-sm text-zinc-800 resize-none focus:ring-2 focus:ring-blue-100 ${section.h}`} 
              />
            </div>
          ))}

          <div className="pt-4 flex justify-end">
            <button className="h-12 px-10 rounded-xl bg-blue-950 text-sm font-semibold text-white shadow-md transition hover:bg-blue-900">
              최종 차트 환자 DB에 저장
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}