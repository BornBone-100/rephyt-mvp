"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import RomMmtAssessment, { type RomMmtRecord } from "@/components/RomMmtAssessment";

// 📚 전신 관절별 EBP 특수검사 데이터베이스
const ebpDatabase = {
  cervical: [
    { id: "spurling", name: "Spurling's Test", paper: "Spurling (1944)", purpose: "경추 신경근병증" },
    { id: "distraction", name: "Cervical Distraction", paper: "Viikari-Juntura (1989)", purpose: "신경근 압박 완화" },
    { id: "bakody", name: "Shoulder Abduction (Bakody)", paper: "Bakody (1953)", purpose: "C4-C5 신경근병증" },
    { id: "jackson", name: "Jackson's Compression", paper: "Jackson (1954)", purpose: "신경공 압박 유무" },
    { id: "sharp_purser", name: "Sharp-Purser Test", paper: "Sharp & Purser (1967)", purpose: "환축관절 불안정성" }
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
    { id: "slump", name: "Slump Test", paper: "Maitland (1985)", purpose: "신경계 긴장도" },
    { id: "prone_instability", name: "Prone Instability Test", paper: "Hicks (2005)", purpose: "요추 분절 불안정성" },
    { id: "well_leg_slr", name: "Well-Leg SLR", paper: "Woodhall (1950)", purpose: "대형 디스크 탈출증" }
  ],
  hip: [
    { id: "thomas", name: "Thomas Test", paper: "Thomas (1876)", purpose: "고관절 굴곡근 단축" },
    { id: "faber", name: "FABER (Patrick) Test", paper: "Patrick (1917)", purpose: "천장관절/고관절 병변" },
    { id: "fadir", name: "FADIR Test", paper: "Leunig (1997)", purpose: "고관절 비구순 충돌" },
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
    { id: "ant_drawer_ankle", name: "Anterior Drawer", paper: "Torg (1976)", purpose: "전거비인대(ATFL) 손상" },
    { id: "talar_tilt", name: "Talar Tilt Test", paper: "Laurin (1975)", purpose: "종비인대(CFL) 손상" },
    { id: "thompson", name: "Thompson Test", paper: "Thompson (1962)", purpose: "아킬레스건 파열" },
    { id: "squeeze", name: "Squeeze Test", paper: "Hopkinson (1990)", purpose: "경비인대 결합 손상" },
    { id: "kleiger", name: "Kleiger's Test", paper: "Kleiger (1980)", purpose: "삼각인대/원위경비인대 손상" }
  ]
};

function SoapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId"); 
  const supabase = createClient();

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  
  const [romMmtRecords, setRomMmtRecords] = useState<RomMmtRecord[]>([]);
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSoapGeneration = async () => {
    setIsGenerating(true);
    
    try {
      let rawData = `[환자 평가 데이터]\n`;
      rawData += `■ 주호소 관절: ${selectedJoint.toUpperCase()}\n`;
      rawData += `■ History: ${historyTaking || "특이 진술 없음"}\n`;
      rawData += `■ VAS: ${painScale}/10\n\n`;
      
      rawData += `■ ROM 및 MMT (정밀 평가):\n`;
      if (romMmtRecords.length === 0) {
        rawData += `- (표에 기록된 항목 없음)\n`;
      } else {
        romMmtRecords.forEach((r) => {
          rawData += `- ${r.movement}: AROM ${r.arom}, PROM ${r.prom}, MMT ${r.mmt}, 비고 ${r.note || "-"}\n`;
        });
      }

      rawData += `\n■ 특수 검사 결과:\n`;
      ebpDatabase[selectedJoint as keyof typeof ebpDatabase]?.forEach(test => {
        if (specialTests[test.id]) {
          rawData += `- ${test.name}: ${specialTests[test.id]}\n`;
        }
      });

      const response = await fetch('/api/ai-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptData: rawData }),
      });

      if (!response.ok) throw new Error("AI 서버 에러");

      const aiResult = await response.json();
      setSoapData({
        subjective: aiResult.subjective,
        objective: aiResult.objective,
        assessment: aiResult.assessment,
        plan: aiResult.plan
      });

    } catch (error) {
      alert("AI 차트 생성에 실패했습니다. (API 키 세팅을 확인해주세요)");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSoap = async () => {
    if (!patientId) {
      alert("환자가 선택되지 않았습니다. 목록에서 환자를 선택 후 작성해 주세요.");
      return;
    }
    if (!soapData.subjective || !soapData.objective) {
      alert("먼저 'SOAP 자동 완성' 버튼을 눌러 내용을 생성해 주세요.");
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // supabase-generated 타입과 실제 DB 스키마가 불일치할 수 있어,
    // 여기서는 "from()/insert()"만 최소 인터페이스로 안전하게 타입캐스팅합니다.
    const supabaseForInsert = supabase as unknown as {
      from: (table: string) => {
        insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }>;
      };
    };

    const { error } = await supabaseForInsert
      .from("soap_notes")
      .insert([
        {
          patient_id: patientId,
          created_by: user?.id,
          joint: selectedJoint,
          pain_scale: parseInt(painScale),
          subjective: soapData.subjective,
          objective: soapData.objective,
          assessment: soapData.assessment,
          plan: soapData.plan
        },
      ]);

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      alert("진료 기록이 안전하게 저장되었습니다.");
      router.push(`/dashboard/patients/${patientId}`); 
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-bold text-blue-950">Re:PhyT 하이엔드 임상 평가</h1>
        <p className="mt-1 text-sm text-zinc-600">
          데이터는 정직하고 케어는 전문물리치료사가 정교하게 실행합니다.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 1. 진단 부위 & 문진</h2>
            <select
              className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 mb-6"
              value={selectedJoint}
              onChange={(e) => {
                setSelectedJoint(e.target.value as keyof typeof ebpDatabase | "");
                setSpecialTests({});
                setRomMmtRecords([]);
              }}
            >
              <option value="">진단 부위 선택</option>
              {Object.keys(ebpDatabase).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
            </select>

            <label className="block text-sm font-bold mb-2">병력 청취 (History Taking)</label>
            <textarea className="w-full h-24 bg-zinc-50 rounded-xl p-3 text-sm border border-zinc-100" value={historyTaking} onChange={e => setHistoryTaking(e.target.value)} />
            
            <label className="block text-sm font-bold mt-4 mb-2">통증 척도 (VAS): {painScale}</label>
            <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
          </section>

          {selectedJoint && (
            <>
              <RomMmtAssessment
                title="STEP 2. 정밀 평가 (ROM & MMT)"
                records={romMmtRecords}
                onRecordsChange={setRomMmtRecords}
              />

              <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 3. EBP 특수 검사</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {/* 🚨 여기도 ? 추가 완료! */}
                  {ebpDatabase[selectedJoint as keyof typeof ebpDatabase]?.map(test => (
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

          <button onClick={handleSoapGeneration} disabled={!selectedJoint || isGenerating} className="w-full h-16 bg-orange-500 text-white rounded-2xl font-black shadow-xl hover:bg-orange-600 transition-all flex justify-center items-center gap-2">
            {isGenerating ? (
              <span className="animate-pulse">OpenAI가 전문 임상 추론 중...</span>
            ) : (
              "OpenAI 기반 전문가 SOAP 자동 작성"
            )}
          </button>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-2">
            <span className="bg-orange-500 w-2 h-8 rounded-full"></span> 완성된 전문 SOAP 노트
          </h2>
          {(["subjective", "objective", "assessment", "plan"] as const).map((key) => (
            <div key={key}>
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <label className="mb-2 block text-xs font-black uppercase text-orange-500">
                  {key === "objective" ? "objective (객관적 평가)" : key}
                </label>
                <textarea
                  value={soapData[key]}
                  onChange={(e) => setSoapData({ ...soapData, [key]: e.target.value })}
                  className="h-32 w-full resize-none rounded-2xl border-none bg-zinc-50/50 p-4 text-sm text-zinc-800 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          ))}

          <button onClick={handleSaveSoap} disabled={isSaving} className="w-full h-16 bg-blue-950 text-white rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all mt-6">
            {isSaving ? "진료 기록 보관함에 넣는 중..." : "최종 SOAP 차트 DB 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdvancedSoapPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-bold text-blue-900">차트 로딩 중...</div>}>
      <SoapContent />
    </Suspense>
  );
}