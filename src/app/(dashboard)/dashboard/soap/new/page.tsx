"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import RomMmtAssessment, { type RomMmtRecord } from "@/components/RomMmtAssessment";

// 📚 [데이터 100% 보존] 성준 님의 EBP 특수검사 DB
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

function SoapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId"); 
  const supabase = createClient();

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState(""); 
  const [treatmentDate, setTreatmentDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const [romMmtRecords, setRomMmtRecords] = useState<RomMmtRecord[]>([]);
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});
  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  
  // 🚀 누적 처치 내역 상태 (실시간 삭제 반영을 위함)
  const [pastRecords, setPastRecords] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 로드 (환자의 기존 처치 내역 불러오기)
  useEffect(() => {
    if (patientId) {
      const fetchPastRecords = async () => {
        const { data, error } = await supabase
          .from("soap_notes")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        if (data) setPastRecords(data);
      };
      fetchPastRecords();
    }
  }, [patientId]);

  // 🗑️ [핵심 추가] 처치 내역 삭제 함수
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("정말로 이 진료 기록을 삭제하시겠습니까? 복구할 수 없습니다.")) return;

    const { error } = await supabase
      .from("soap_notes")
      .delete()
      .eq("id", recordId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("기록이 정상적으로 삭제되었습니다.");
      // 화면에서 즉시 제거
      setPastRecords(prev => prev.filter(r => r.id !== recordId));
    }
  };

  const handleSaveSoap = async () => {
    if (!patientId) return alert("환자 미선택");
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await (supabase as any).from("soap_notes").insert([{
      patient_id: patientId,
      created_by: user?.id,
      joint: selectedJoint,
      pain_scale: parseInt(painScale),
      subjective: soapData.subjective,
      objective: soapData.objective,
      assessment: soapData.assessment,
      plan: soapData.plan,
      created_at: new Date(treatmentDate).toISOString()
    }]).select();

    if (error) alert("저장 실패"); 
    else {
      alert("저장 완료");
      if (data) setPastRecords(prev => [data[0], ...prev]); // 새 기록 상단 추가
      router.push(`/dashboard/patients/${patientId}`); 
    }
    setIsSaving(false);
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-[1700px] mx-auto w-full">
        
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-black text-blue-950">Re:PhyT 하이엔드 임상 평가</h1>
          <p className="mt-1 text-zinc-500">데이터는 정직하고 케어는 정교하게 실행합니다.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
          
          {/* [좌측 영역] 입력 섹션 */}
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-bold text-blue-950 mb-6 border-b pb-3 font-black">STEP 1. 진단 및 시간 설정</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <select className="h-14 rounded-2xl bg-zinc-50 border border-zinc-200 px-4 font-bold" value={selectedJoint} onChange={(e) => setSelectedJoint(e.target.value as any)}>
                  <option value="">부위 선택</option>
                  {Object.keys(ebpDatabase).map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                </select>
                <input type="datetime-local" className="h-14 rounded-2xl bg-orange-50/30 border border-orange-200 px-4 font-bold text-orange-700" value={treatmentDate} onChange={(e) => setTreatmentDate(e.target.value)} />
              </div>
              <textarea className="w-full h-32 bg-zinc-50 rounded-2xl p-4 text-sm border border-zinc-100 focus:ring-2 focus:ring-blue-100 outline-none leading-relaxed" style={{ whiteSpace: 'pre-wrap' }} placeholder="환자 병력 입력 (줄바꿈 가능)" value={historyTaking} onChange={e => setHistoryTaking(e.target.value)} />
            </section>

            {/* 🚀 누적 처치 내역 리스트 (삭제 버튼 포함) */}
            <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-bold text-blue-950 mb-6 flex items-center justify-between">
                <span>📊 누적 처치 내역 ({pastRecords.length}건)</span>
              </h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {pastRecords.length === 0 ? (
                  <p className="text-center py-10 text-zinc-400 text-sm">기존 진료 기록이 없습니다.</p>
                ) : (
                  pastRecords.map((record) => (
                    <div key={record.id} className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 relative group transition-all hover:border-zinc-300">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          {new Date(record.created_at).toLocaleString('ko-KR')}
                        </span>
                        {/* 🗑️ 삭제 버튼 */}
                        <button 
                          onClick={() => handleDeleteRecord(record.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-bold transition-all"
                        >
                          삭제하기
                        </button>
                      </div>
                      <p className="text-sm font-bold text-zinc-800 uppercase tracking-tight mb-1">{record.joint}</p>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-normal" style={{ whiteSpace: 'pre-wrap' }}>{record.subjective}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* [우측 영역] 결과 섹션 (Sticky 고정) */}
          <div className="space-y-4 xl:sticky xl:top-10">
            <h2 className="text-2xl font-black text-blue-950 mb-6 flex items-center gap-2">
              <span className="bg-orange-500 w-2.5 h-10 rounded-full"></span> 완성된 전문 SOAP 노트
            </h2>
            {(["subjective", "objective", "assessment", "plan"] as const).map((key) => (
              <div key={key} className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
                <label className="mb-2 block text-xs font-black uppercase text-orange-500">{key}</label>
                <textarea
                  value={soapData[key]}
                  onChange={(e) => setSoapData({ ...soapData, [key]: e.target.value })}
                  style={{ whiteSpace: 'pre-wrap' }}
                  className="h-36 w-full resize-none rounded-2xl border-none bg-zinc-50/50 p-4 text-sm leading-relaxed text-zinc-800"
                />
              </div>
            ))}
            <button onClick={handleSaveSoap} disabled={isSaving} className="w-full h-20 bg-blue-950 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-blue-900 transition-all mt-6">
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