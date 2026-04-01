"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// 📚 전신 관절별 EBP(근거중심) 특수검사 데이터베이스 (부위별 5개 이상)
const ebpDatabase = {
  cervical: [
    { id: "spurling", name: "Spurling's Test", paper: "Spurling (1944)", purpose: "경추 신경근병증" },
    { id: "distraction", name: "Cervical Distraction", paper: "Viikari-Juntura (1989)", purpose: "신경근 압박 완화 확인" },
    { id: "bakody", name: "Shoulder Abduction (Bakody)", paper: "Bakody (1953)", purpose: "C4-C5 신경근병증" },
    { id: "jackson", name: "Jackson's Compression", paper: "Jackson (1954)", purpose: "신경공 압박 유무" },
    { id: "sharp_purser", name: "Sharp-Purser Test", paper: "Sharp & Purser (1967)", purpose: "환축관절(C1-C2) 불안정성" }
  ],
  shoulder: [
    { id: "neer", name: "Neer Test", paper: "Neer (1983)", purpose: "견봉하 충돌증후군" },
    { id: "hawkins", name: "Hawkins-Kennedy", paper: "Hawkins (1980)", purpose: "극상근 충돌" },
    { id: "emptycan", name: "Empty Can (Jobe)", paper: "Jobe (1982)", purpose: "극상근 건병증/파열" },
    { id: "obrien", name: "O'Brien Test", paper: "O'Brien (1998)", purpose: "SLAP 병변" },
    { id: "speed", name: "Speed's Test", paper: "Speed (1966)", purpose: "이두근 장두 건염" },
    { id: "yergason", name: "Yergason's Test", paper: "Yergason (1931)", purpose: "이두근 건 탈구/건염" }
  ],
  lumbar: [
    { id: "slr", name: "Straight Leg Raise (SLR)", paper: "Lasegue (1864)", purpose: "요추 디스크(L4-S1)" },
    { id: "kemp", name: "Kemp's Test", paper: "Kemp (1950)", purpose: "후관절 증후군/협착증" },
    { id: "slump", name: "Slump Test", paper: "Maitland (1985)", purpose: "신경계 긴장도(Dural Tension)" },
    { id: "prone_instability", name: "Prone Instability Test", paper: "Hicks (2005)", purpose: "요추 분절 불안정성" },
    { id: "well_leg_slr", name: "Well-Leg SLR", paper: "Woodhall (1950)", purpose: "대형 디스크 탈출증" }
  ],
  hip: [
    { id: "thomas", name: "Thomas Test", paper: "Thomas (1876)", purpose: "고관절 굴곡근 단축" },
    { id: "faber", name: "FABER (Patrick) Test", paper: "Patrick (1917)", purpose: "천장관절/고관절 병변" },
    { id: "fadir", name: "FADIR Test", paper: "Leunig (1997)", purpose: "고관절 비구순 충돌(FAI)" },
    { id: "trendelenburg", name: "Trendelenburg Sign", paper: "Trendelenburg (1895)", purpose: "중둔근 약화" },
    { id: "scour", name: "Scour Test", paper: "Magee (2014)", purpose: "고관절 골관절염/비구순 파열" }
  ],
  knee: [
    { id: "lachman", name: "Lachman Test", paper: "Torg (1976)", purpose: "전방십자인대(ACL)" },
    { id: "mcmurray", name: "McMurray Test", paper: "McMurray (1937)", purpose: "반월상 연골판" },
    { id: "valgus", name: "Valgus Stress Test", paper: "Hughston (1976)", purpose: "내측측부인대(MCL)" },
    { id: "varus", name: "Varus Stress Test", paper: "Hughston (1976)", purpose: "외측측부인대(LCL)" },
    { id: "apley", name: "Apley's Compression", paper: "Apley (1947)", purpose: "반월상 연골판 파열 확인" }
  ],
  ankle: [
    { id: "ant_drawer_ankle", name: "Anterior Drawer (Ankle)", paper: "Torg (1976)", purpose: "전거비인대(ATFL) 손상" },
    { id: "talar_tilt", name: "Talar Tilt Test", paper: "Laurin (1975)", purpose: "종비인대(CFL) 손상" },
    { id: "thompson", name: "Thompson Test", paper: "Thompson (1962)", purpose: "아킬레스건 파열" },
    { id: "squeeze", name: "Squeeze Test", paper: "Hopkinson (1990)", purpose: "경비인대 결합(Syndesmosis) 손상" },
    { id: "kleiger", name: "Kleiger's Test", paper: "Kleiger (1980)", purpose: "삼각인대/원위경비인대 손상" }
  ]
};

// 관절별 움직임 정의 (ROM & MMT용)
const jointMovements = {
  cervical: ["Flexion", "Extension", "Lat_Flexion", "Rotation"],
  shoulder: ["Flexion", "Extension", "Abduction", "Int_Rotation", "Ext_Rotation"],
  lumbar: ["Flexion", "Extension", "Lat_Flexion", "Rotation"],
  hip: ["Flexion", "Extension", "Abduction", "Adduction", "Int_Rotation", "Ext_Rotation"],
  knee: ["Flexion", "Extension"],
  ankle: ["Dorsiflexion", "Plantarflexion", "Inversion", "Eversion"]
};

const mmtGrades = ["5 (Normal)", "4 (Good)", "3 (Fair)", "2 (Poor)", "1 (Trace)", "0 (Zero)"];

export default function RePhyTAdvancedSoapPage() {
  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ROM & MMT 데이터 상태 (움직임별로 동적 관리)
  const [romValues, setRomValues] = useState<Record<string, string>>({});
  const [mmtValues, setMmtValues] = useState<Record<string, string>>({});
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [isGenerating, setIsGenerating] = useState(false);

  // 음성 인식 설정 (생략 - 이전 코드와 동일)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ko-KR";
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setHistoryTaking(prev => prev + transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); }
    else { recognitionRef.current?.start(); setIsListening(true); }
  };

  const handleSoapGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // 1. Subjective
      const subj = `[History Taking]\n"${historyTaking || "특이 진술 없음"}"\n\nVAS: ${painScale}/10\n부위: ${selectedJoint.toUpperCase()}`;

      // 2. Objective (각 움직임별 ROM/MMT 매핑)
      let obj = `[ROM & MMT Profile]\n`;
      jointMovements[selectedJoint as keyof typeof jointMovements]?.forEach(m => {
        obj += `${m}: ROM ${romValues[m] || "-"}° / MMT ${mmtValues[m] || "-"}\n`;
      });

      obj += `\n[Special Tests]\n`;
      let posTests: string[] = [];
      ebpDatabase[selectedJoint as keyof typeof ebpDatabase]?.forEach(t => {
        if (specialTests[t.id]) {
          obj += `- ${t.name}: ${specialTests[t.id]}\n`;
          if (specialTests[t.id] === "Positive (+)") posTests.push(t.name);
        }
      });

      // 3. Assessment & Plan (생략 - 논리적 기반 생성)
      setSoapData({
        subjective: subj,
        objective: obj,
        assessment: `환자는 ${selectedJoint} 평가에서 ${posTests.length > 0 ? posTests.join(", ") + " 양성 소견을 보임." : "명확한 양성 반응은 없으나"} ROM 및 MMT 저하를 바탕으로 기능 부전이 확인됨.`,
        plan: `- 1단계: 통증 제어\n- 2단계: 가동성 및 근력(MMT 등급) 증진\n- 3단계: 기능적 재트레이닝`
      });
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold text-blue-950">Re:PhyT 하이엔드 임상 평가</h1>
        <p className="mt-1 text-sm text-zinc-600">데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 1. 진단 부위 & 문진</h2>
            <select className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 mb-6" value={selectedJoint} onChange={e => setSelectedJoint(e.target.value as any)}>
              <option value="">진단 부위 선택</option>
              {Object.keys(ebpDatabase).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>

            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold">History Taking</label>
              <button onClick={toggleListening} className={`text-xs p-2 rounded-lg font-bold ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                {isListening ? "녹음 중..." : "음성 인식 켜기"}
              </button>
            </div>
            <textarea className="w-full h-24 bg-zinc-50 rounded-xl p-3 text-sm border border-zinc-100" value={historyTaking} onChange={e => setHistoryTaking(e.target.value)} />
          </section>

          {selectedJoint && (
            <>
              <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 2. ROM & MMT (움직임별)</h2>
                <div className="space-y-6">
                  {jointMovements[selectedJoint as keyof typeof jointMovements].map(move => (
                    <div key={move} className="space-y-2 border-b border-zinc-50 pb-4">
                      <p className="text-sm font-black text-blue-900 underline decoration-orange-300">{move}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="ROM (°)" className="h-10 rounded-lg border border-zinc-200 px-3 text-xs" onChange={e => setRomValues({...romValues, [move]: e.target.value})} />
                        <select className="h-10 rounded-lg border border-zinc-200 px-2 text-xs bg-zinc-50" onChange={e => setMmtValues({...mmtValues, [move]: e.target.value})}>
                          <option value="">MMT Grade</option>
                          {mmtGrades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 3. EBP 특수 검사</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {ebpDatabase[selectedJoint as keyof typeof ebpDatabase].map(test => (
                    <div key={test.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <p className="text-sm font-bold">{test.name} <span className="text-[10px] text-blue-500">Ref: {test.paper}</span></p>
                      <div className="flex gap-2 mt-2">
                        {["Positive (+)", "Negative (-)"].map(res => (
                          <button key={res} onClick={() => setSpecialTests({...specialTests, [test.id]: res})} className={`flex-1 h-8 rounded-lg text-[10px] font-bold border transition ${specialTests[test.id] === res ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <button onClick={handleSoapGeneration} disabled={!selectedJoint || isGenerating} className="w-full h-16 bg-orange-500 text-white rounded-2xl font-black shadow-xl hover:bg-orange-600 transition-all">
            {isGenerating ? "데이터 분석 중..." : "EBP 기반 SOAP 자동 완성"}
          </button>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-2">
            <span className="bg-orange-500 w-2 h-8 rounded-full"></span> 완성된 전문 SOAP 노트
          </h2>
          {["subjective", "objective", "assessment", "plan"].map(key => (
            <div key={key} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
              <label className="block text-xs font-black uppercase text-orange-500 mb-2">{key}</label>
              <textarea value={soapData[key as keyof typeof soapData]} readOnly className="w-full h-40 bg-zinc-50/50 border-none rounded-2xl p-4 text-sm text-zinc-800 resize-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}