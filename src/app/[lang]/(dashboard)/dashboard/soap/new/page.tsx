"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ebpDatabase } from "@/constants/assessmentData";
import RomMmtAssessment, { type RomMmtRecord } from "@/components/RomMmtAssessment";

type PlanTier = "basic" | "pro" | "enterprise";

function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const t = (raw ?? "basic").toLowerCase();
  if (t === "pro") return "pro";
  if (t === "enterprise") return "enterprise";
  return "basic";
}

function SoapContent() {
  const router = useRouter();
  const routeParams = useParams();
  const lang = routeParams.lang as string;
  const base = `/${lang}`;
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId"); 
  const supabase = useMemo(() => createClient(), []);

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [targetLanguage, setTargetLanguage] = useState("Korean-Mixed");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");
  
  // 🕒 [날짜/시간 수동 선택 상태 추가]
  const [treatmentDate, setTreatmentDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

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
        const { data, error } = await supabase.from("profiles").select("plan_tier").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        setPlanTier(error ? "basic" : normalizePlanTier(data?.plan_tier));
      } catch { if (!cancelled) setPlanTier("basic"); } finally { if (!cancelled) setPlanTierLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const handleSoapGeneration = async () => {
    setIsGenerating(true);
    try {
      let rawData = `[환자 평가 데이터]\n■ 주호소 관절: ${selectedJoint.toUpperCase()}\n■ History: ${historyTaking}\n■ VAS: ${painScale}/10\n\n■ ROM 및 MMT:\n`;
      romMmtRecords.forEach(r => { rawData += `- ${r.movement}: AROM ${r.arom}, PROM ${r.prom}, MMT ${r.mmt}\n`; });
      rawData += `\n■ 특수 검사:\n`;
      ebpDatabase[selectedJoint as keyof typeof ebpDatabase]?.forEach(test => {
        if (specialTests[test.id]) rawData += `- ${test.name}: ${specialTests[test.id]}\n`;
      });

      const response = await fetch('/api/ai-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptData: rawData, language: targetLanguage }),
      });
      const aiResult = await response.json();
      setSoapData({ subjective: aiResult.subjective, objective: aiResult.objective, assessment: aiResult.assessment, plan: aiResult.plan });
    } catch { alert("AI 생성 실패"); } finally { setIsGenerating(false); }
  };

  const handleSaveSoap = async () => {
    if (!patientId) return alert("환자 미선택");
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // 수동 선택한 시간을 반영하여 저장
    const { error } = await supabase.from("soap_notes").insert([{
      patient_id: patientId,
      created_by: user?.id,
      joint: selectedJoint,
      pain_scale: parseInt(painScale),
      subjective: soapData.subjective,
      objective: soapData.objective,
      assessment: soapData.assessment,
      plan: soapData.plan,
      created_at: new Date(treatmentDate).toISOString() // 🕒 선택한 날짜로 저장
    }]);

    if (error) alert("저장 실패"); else { alert("저장 완료"); router.push(`${base}/dashboard/patients/${patientId}`); }
    setIsSaving(false);
  };

  const handleAiGenerateClick = () => {
    if (planTier === "basic") {
      alert("Pro 요금제 전용 기능입니다.");
      router.push(`${base}/dashboard/pricing`);
      return;
    }
    void handleSoapGeneration();
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 p-6 md:p-10 overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto w-full">
        
        <header className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold text-blue-950">Re:PhyT 하이엔드 임상 평가</h1>
          <p className="mt-1 text-sm text-zinc-600 font-medium">실제 치료 현장을 위한 2단 분리형 스마트 차트</p>
        </header>

        {/* 🚀 [강제 2단 레이아웃] 화면이 넓을 때 무조건 50:50 분할 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start w-full">
          
          {/* [좌측 영역] 입력 폼 */}
          <div className="space-y-8 w-full">
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 1. 진단 부위 & 문진 시간 설정</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">진단 부위</label>
                  <select
                    className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 font-bold"
                    value={selectedJoint}
                    onChange={(e) => setSelectedJoint(e.target.value as keyof typeof ebpDatabase | "")}
                  >
                    <option value="">부위 선택</option>
                    {Object.keys(ebpDatabase).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                  </select>
                </div>
                
                {/* 🕒 날짜/시간 수동 선택 추가 */}
                <div>
                  <label className="block text-xs font-bold text-orange-400 mb-2 uppercase">진료/처치 일시 (수동 선택)</label>
                  <input 
                    type="datetime-local" 
                    className="w-full h-12 rounded-xl bg-orange-50/50 border border-orange-200 px-4 font-bold text-orange-700 outline-none focus:ring-2 focus:ring-orange-200"
                    value={treatmentDate}
                    onChange={(e) => setTreatmentDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">출력 언어 선택</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 font-bold"
                >
                  <option value="Korean-Mixed">한국어 + 영문 의학용어 (기본)</option>
                  <option value="English">100% English (영문 차트)</option>
                  <option value="Japanese">日本語 (일본어)</option>
                  <option value="Chinese">中文 (중국어)</option>
                  <option value="Russian">Русский (러시아어)</option>
                </select>
              </div>

              <label className="block text-sm font-bold mb-2">병력 청취 (History Taking)</label>
              <textarea className="w-full h-24 bg-zinc-50 rounded-xl p-3 text-sm border border-zinc-100" value={historyTaking} onChange={e => setHistoryTaking(e.target.value)} />
              
              <label className="block text-sm font-bold mt-4 mb-2">통증 척도 (VAS): {painScale}</label>
              <input type="range" min="0" max="10" value={painScale} onChange={(e) => setPainScale(e.target.value)} className="w-full accent-orange-500" />
            </section>

            {selectedJoint && (
              <>
                <RomMmtAssessment title="STEP 2. 정밀 평가 (ROM & MMT)" records={romMmtRecords} onRecordsChange={setRomMmtRecords} />
                <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">STEP 3. EBP 특수 검사</h2>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {ebpDatabase[selectedJoint]?.map(test => (
                      <div key={test.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-sm font-bold">{test.name} <span className="text-[10px] text-blue-500 font-normal">Ref: {test.paper}</span></p>
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

            <button
              type="button"
              onClick={handleAiGenerateClick}
              disabled={planTierLoading || isGenerating}
              className={
                planTier === "basic"
                  ? "flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-700 font-black text-white shadow-xl transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  : "flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 font-black text-white shadow-xl transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              {planTierLoading ? (
                <span className="animate-pulse text-sm">요금제 확인 중...</span>
              ) : planTier === "basic" ? (
                "🔒 AI 임상 추론 (Pro 전용)"
              ) : isGenerating ? (
                <span className="animate-pulse">🧠 AI 임상 추론 분석 중...</span>
              ) : (
                "🧠 OpenAI 자동 작성"
              )}
            </button>
          </div>

          {/* [우측 영역] 결과창 - sticky로 화면에 고정 */}
          <div className="space-y-4 xl:sticky xl:top-10 w-full">
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
              {isSaving ? "저장 중..." : "최종 SOAP 차트 DB 저장"}
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