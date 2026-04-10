"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import RomMmtAssessment, { type RomMmtRecord } from "@/components/RomMmtAssessment";

// 📚 EBP 데이터베이스 (원본 유지)
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

type PlanTier = "basic" | "pro" | "enterprise";

function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const t = (raw ?? "basic").toLowerCase();
  if (t === "pro") return "pro";
  if (t === "enterprise") return "enterprise";
  return "basic";
}

function SoapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId"); 
  const supabase = createClient();

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  const [treatmentDate, setTreatmentDate] = useState(""); 
  
  const [romMmtRecords, setRomMmtRecords] = useState<RomMmtRecord[]>([]);
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [planTier, setPlanTier] = useState<PlanTier>("basic");
  const [planTierLoading, setPlanTierLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { if (!cancelled) setPlanTierLoading(false); return; }
        const { data, error } = await (supabase as any).from("profiles").select("plan_tier").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        setPlanTier(error ? "basic" : normalizePlanTier(data?.plan_tier));
      } catch (e) { if (!cancelled) setPlanTier("basic"); } finally { if (!cancelled) setPlanTierLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSoapGeneration = async () => {
    setIsGenerating(true);
    try {
      let rawData = `■ 관절: ${selectedJoint.toUpperCase()}\n■ History: ${historyTaking}\n■ VAS: ${painScale}\n`;
      const response = await fetch('/api/ai-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptData: rawData }),
      });
      const aiResult = await response.json();
      setSoapData({ subjective: aiResult.subjective, objective: aiResult.objective, assessment: aiResult.assessment, plan: aiResult.plan });
    } catch (error) { alert("AI 생성 실패"); } finally { setIsGenerating(false); }
  };

  const handleSaveSoap = async () => {
    if (!patientId) return alert("환자 미선택");
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("soap_notes").insert([{
      patient_id: patientId, created_by: user?.id, joint: selectedJoint, pain_scale: parseInt(painScale),
      subjective: soapData.subjective, objective: soapData.objective, assessment: soapData.assessment, plan: soapData.plan
    }]);
    if (error) alert("저장 실패"); else { alert("저장 완료"); router.push(`/dashboard/patients/${patientId}`); }
    setIsSaving(false);
  };

  const handleAiGenerateClick = () => {
    if (planTier === "basic") {
      alert("해당 기능은 Pro 요금제부터 사용 가능합니다. 요금제 안내 페이지로 이동합니다.");
      router.push("/dashboard/pricing");
      return;
    }
    void handleSoapGeneration();
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 p-4 md:p-8 overflow-x-hidden">
      {/* 컨테이너 너비를 최대로 확장 */}
      <div className="w-full max-w-[1920px] mx-auto">
        
        <header className="mb-10 border-b pb-6">
          <h1 className="text-3xl font-black text-blue-950">Re:PhyT 하이엔드 임상 평가</h1>
          <p className="text-zinc-500 mt-2">데이터 중심의 고도화된 물리치료 솔루션</p>
        </header>

        {/* 🚀 핵심: flex-row와 w-1/2를 사용하여 무조건 절반씩 나눔 */}
        <div className="flex flex-col xl:flex-row gap-10 items-start">
          
          {/* [좌측 영역] 입력 폼 */}
          <div className="w-full xl:w-1/2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-bold text-blue-950 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span> STEP 1. 진단 부위 & 문진
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <select className="h-14 rounded-2xl bg-zinc-50 border border-zinc-200 px-4 font-bold" value={selectedJoint} onChange={(e) => setSelectedJoint(e.target.value as any)}>
                  <option value="">부위 선택</option>
                  {Object.keys(ebpDatabase).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                </select>
                <input type="datetime-local" className="h-14 rounded-2xl bg-zinc-50 border border-zinc-200 px-4" value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} />
              </div>
              <textarea className="w-full h-32 bg-zinc-50 rounded-2xl p-4 border border-zinc-100 mb-6" placeholder="환자 병력 및 호소 내용을 적어주세요." value={historyTaking} onChange={e => setHistoryTaking(e.target.value)} />
              <label className="block font-bold mb-2">통증 척도 (VAS): {painScale}</label>
              <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
            </section>

            {selectedJoint && (
              <>
                <RomMmtAssessment title="STEP 2. 정밀 평가 (ROM & MMT)" records={romMmtRecords} onRecordsChange={setRomMmtRecords} />
                <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h2 className="text-xl font-bold text-blue-950 mb-6 border-b pb-4">STEP 3. EBP 특수 검사</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {ebpDatabase[selectedJoint]?.map(test => (
                      <div key={test.id} className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-sm font-bold mb-3">{test.name}</p>
                        <div className="flex gap-2">
                          {["Positive (+)", "Negative (-)"].map(res => (
                            <button key={res} onClick={() => setSpecialTests({...specialTests, [test.id]: res})} className={`flex-1 h-10 rounded-xl text-xs font-black border transition ${specialTests[test.id] === res ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-zinc-200 text-zinc-600'}`}>
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

            <button onClick={handleAiGenerateClick} className="w-full h-20 bg-orange-500 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-orange-600 transition-all">
              🧠 OpenAI 전문 임상 추론 실행
            </button>
          </div>

          {/* [우측 영역] 결과창 - sticky로 화면에 고정 */}
          <div className="w-full xl:w-1/2 space-y-4 xl:sticky xl:top-8">
            <h2 className="text-2xl font-black text-blue-950 mb-6 flex items-center gap-2">
              <span className="bg-orange-500 w-3 h-10 rounded-full shadow-lg shadow-orange-200"></span> 완성된 전문 SOAP 노트
            </h2>
            {(["subjective", "objective", "assessment", "plan"] as const).map((key) => (
              <div key={key} className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
                <label className="mb-3 block text-xs font-black uppercase text-orange-500 tracking-widest">{key}</label>
                <textarea
                  value={soapData[key]}
                  onChange={(e) => setSoapData({ ...soapData, [key]: e.target.value })}
                  className="w-full h-32 resize-none rounded-2xl border-none bg-zinc-50/70 p-4 text-base leading-relaxed text-zinc-800 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            ))}
            <button onClick={handleSaveSoap} className="w-full h-20 bg-blue-950 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-blue-900 transition-all mt-6">
              💾 최종 SOAP 차트 DB 저장
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function AdvancedSoapPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SoapContent />
    </Suspense>
  );
}