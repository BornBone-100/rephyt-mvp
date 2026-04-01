"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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

export default function AdvancedSoapVoicePage() {
  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  
  // 🎙️ [핵심 추가] 음성 인식 상태 관리
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [romData, setRomData] = useState({ flexion: "", extension: "", abd: "", extRot: "", intRot: "" });
  const [mmtData, setMmtData] = useState({ mainMuscle: "Normal (5/5)" });
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });

  // 🎙️ 음성 인식 초기 세팅 (화면이 켜질 때 브라우저 기능 불러오기)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // 계속 듣기
        recognition.interimResults = true; // 말하는 도중에도 글씨 보여주기
        recognition.lang = "ko-KR"; // 한국어 설정

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          // 말하는 내용을 실시간으로 입력창에 텍스트로 반영
          setHistoryTaking(prev => prev + currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("음성 인식 오류:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 🎙️ 마이크 켜고 끄기 버튼 핸들러
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        // 기존 텍스트에 이어서 작성하도록 띄어쓰기 추가
        setHistoryTaking(prev => prev ? prev + " " : ""); 
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("현재 사용 중인 브라우저에서는 음성 인식을 지원하지 않습니다. 크롬(Chrome)이나 사파리(Safari) 최신 버전을 이용해 주세요.");
      }
    }
  };

  const handleTestToggle = (testId: string, result: string) => {
    setSpecialTests(prev => ({ ...prev, [testId]: prev[testId] === result ? "" : result }));
  };

  const handleRomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRomData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateSoapNotes = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      let subjText = `[주호소 및 문진 - 환자 진술]\n`;
      subjText += historyTaking.trim() !== "" ? `"${historyTaking}"\n` : `"특별한 진술 없음"\n`;
      subjText += `\n[통증 양상]\n- 통증 척도: VAS ${painScale} / 10\n- 진단 부위: ${selectedJoint ? selectedJoint.toUpperCase() : "미지정"}`;

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

      let assetText = `병력 청취 및 주관적 통증(VAS ${painScale}/10)을 종합할 때, ${selectedJoint.toUpperCase()} 부위의 기능적 제한이 확인됨.\n`;
      if (positiveTests.length > 0) {
        assetText += `이학적 검사 결과, ${positiveTests.join(', ')} 에서 양성 반응(+)이 관찰됨. `;
        assetText += `이는 [${relatedPurposes.filter((v, i, a) => a.indexOf(v) === i).join(', ')}] 의 병변을 시사함. `;
        assetText += `현재 ROM 제한 및 MMT(${mmtData.mainMuscle}) 소견을 바탕으로 보존적 물리치료 및 가동성 회복 재활이 요구됨.`;
      } else {
        assetText += `환자가 호소하는 병력과 임상적 증상을 고려하여 연부조직의 과긴장 또는 미세 손상이 의심됨.`;
      }

      let planText = `- 1단계: 통증(VAS ${painScale}) 완화를 위한 한랭치료 및 전기치료 적용\n`;
      planText += `- 2단계: Joint Mobilization 적용으로 ROM 증진 도모\n`;
      planText += `- 3단계: 근력 강화를 위한 저항 운동(PRE) 지도\n`;
      planText += `- 환자 교육: 일상생활 주의사항 및 HEP 안내`;

      setSoapData({ subjective: subjText, objective: objText, assessment: assetText, plan: planText });
      setIsGenerating(false);
    }, 1000); 
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-24">
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">전문가용 EBP 임상 평가 & SOAP 자동화</h1>
        <p className="mt-1 text-sm text-zinc-600">음성 인식으로 문진을 기록하고, 전문 데이터를 결합해 차트를 완성합니다.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-4 border-b pb-3 flex items-center gap-2">
              STEP 1. 기초 평가 & 음성 문진
            </h2>
            
            {/* 🎙️ 마이크 버튼이 포함된 병력 청취 (History Taking) 영역 */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-semibold text-zinc-800">병력 청취 (History Taking)</label>
                <button 
                  onClick={toggleListening}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  {isListening ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-600"></div> 녹음 중... (한 번 더 누르면 종료)
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" /><path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.854v2.896h2.25a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75v-1.5a6.751 6.751 0 0 1-6-6.854v-1.5A.75.75 0 0 1 6 10.5Z" /></svg>
                      마이크 켜기
                    </>
                  )}
                </button>
              </div>
              <textarea 
                value={historyTaking}
                onChange={(e) => setHistoryTaking(e.target.value)}
                placeholder="마이크 버튼을 누르고 환자와 대화하듯 말씀하시면 자동으로 텍스트가 입력됩니다."
                className={`w-full h-28 rounded-xl border p-3 text-sm focus:outline-none resize-none transition-colors ${isListening ? 'border-red-300 bg-red-50/30 ring-2 ring-red-100' : 'border-zinc-200 bg-zinc-50 focus:border-blue-300'}`}
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
                <option>Good (4/5)</option>
                <option>Fair (3/5)</option>
                <option>Poor (2/5)</option>
                <option>Trace (1/5)</option>
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
            {isGenerating ? "문진 및 임상 데이터 분석 중..." : "음성+EBP 데이터 기반 차트 자동 작성"}
          </button>
        </div>

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
                placeholder="왼쪽에서 평가 수치를 입력하고 오렌지색 '자동 작성' 버튼을 누르시면 전문 차트가 완성됩니다." 
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