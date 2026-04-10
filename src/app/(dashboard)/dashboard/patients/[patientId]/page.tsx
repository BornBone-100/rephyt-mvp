"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const supabase = createClient();

  const [patient, setPatient] = useState<any>(null);
  const [soapNotes, setSoapNotes] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [debugError, setDebugError] = useState("");
  
  const [activeTab, setActiveTab] = useState<"soap" | "treatment">("soap");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  
  const [newTreatment, setNewTreatment] = useState("");
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);

  const fetchPatientAndRecords = async () => {
    if (!patientId || patientId === "null" || patientId === "undefined") {
      setDebugError("환자 ID가 정상적으로 전달되지 않았습니다.");
      setIsLoading(false); return;
    }
    setIsLoading(true); setDebugError("");

    try {
      const { data: patientData, error: patientError } = await (supabase as any)
        .from("patients").select("*").eq("id", patientId).maybeSingle();

      if (patientError) throw patientError;
      if (!patientData) throw new Error(`DB에서 해당 환자를 찾을 수 없습니다.`);
      setPatient(patientData);

      const { data: soapData } = await (supabase as any)
        .from("soap_notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      if (soapData) setSoapNotes(soapData);

      const { data: treatmentData } = await (supabase as any)
        .from("treatments").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      if (treatmentData) setTreatments(treatmentData);

    } catch (error: any) {
      setDebugError(error.message || "데이터베이스 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientAndRecords();
  }, [patientId]);

  const handleAddTreatment = async () => {
    if (!newTreatment.trim()) return;
    setIsSubmittingTreatment(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await (supabase as any).from("treatments").insert([{
      patient_id: patientId,
      content: newTreatment,
      created_by: user?.id
    }]);

    if (!error) {
      setNewTreatment("");
      fetchPatientAndRecords();
    } else {
      alert("처치 기록 저장 실패: " + error.message);
    }
    setIsSubmittingTreatment(false);
  };

  // 🗑️ 처치 내역 삭제 함수
  const handleDeleteTreatment = async (logId: string) => {
    if (!confirm("정말로 이 처치 내역을 삭제하시겠습니까?")) return;

    const { error } = await (supabase as any)
      .from("treatments")
      .delete()
      .eq("id", logId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("삭제되었습니다.");
      fetchPatientAndRecords();
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "numeric", hour12: true }).format(date);
  };

  const getVasBadgeStyle = (vas: number) => {
    if (vas >= 7) return "bg-red-50 text-red-600 border-red-200";
    if (vas >= 4) return "bg-orange-50 text-orange-600 border-orange-200";
    return "bg-green-50 text-green-600 border-green-200";
  };

  const sortedNotes = sortOrder === "desc" ? [...soapNotes] : [...soapNotes].reverse();

  const isFirstVisit = patient?.is_first_visit === true;
  const hasPriorCareElsewhere = patient?.is_first_visit === false;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center font-bold text-blue-900 animate-pulse">차트와 타임라인을 동기화하는 중입니다...</div>;
  if (!patient) return <div className="flex min-h-screen items-center justify-center font-bold text-red-500">환자 데이터를 불러오지 못했습니다. 목록으로 돌아가주세요.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8">
        <Link href="/dashboard/patients" className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 mb-4 transition">&larr; 환자 목록으로</Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-blue-950">{patient.name} 환자 차트</h1>
          <Link href={`/dashboard/soap/new?patientId=${patient.id}`}>
            <button className="h-12 rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg transition hover:bg-orange-600">+ 새 SOAP 차트 작성</button>
          </Link>
        </div>
      </div>

      {/* 환자 기본 정보 카드 + 내원/과거력 */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          {isFirstVisit && (
            <div className="border-b border-emerald-100 pb-4">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black leading-tight text-emerald-800 shadow-sm">
                🌱 첫 발병/내원 환자
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-10">
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">성별 / 나이</p>
              <p className="text-lg font-black text-zinc-800">
                {patient.gender} / {patient.age}세
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">연락처</p>
              <p className="text-lg font-black text-zinc-800">{patient.phone || "미입력"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">주 진단명</p>
              <p className="text-lg font-black text-blue-600">{patient.diagnosis || "미입력"}</p>
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="mb-1 text-sm font-bold text-zinc-400">특이사항 (Memo)</p>
              <p className="text-sm font-medium text-zinc-600">{patient.memo || "특이사항 없음"}</p>
            </div>
          </div>
        </div>

        {hasPriorCareElsewhere && (
          <div className="rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/90 to-amber-50/50 p-6 shadow-sm md:p-8">
            <div className="mb-5">
              <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-900 shadow-sm">
                🔄 타 병원 치료 경험 있음
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-orange-200/80 bg-white/80 p-5 shadow-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-orange-700">기존 치료 내역</p>
                <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {patient.past_history?.trim() ? patient.past_history : "입력된 기존 치료 내역이 없습니다."}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-200/80 bg-white/80 p-5 shadow-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-orange-700">증상 변화</p>
                <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {patient.symptom_change?.trim() ? patient.symptom_change : "입력된 증상 변화가 없습니다."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 듀얼 탭 내비게이션 */}
      <div className="flex border-b border-zinc-200 mb-8 gap-8">
        <button 
          onClick={() => setActiveTab("soap")} 
          className={`pb-4 text-lg font-black transition-all ${activeTab === "soap" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-400 hover:text-zinc-600"}`}
        >
          🧠 진단 기록 (SOAP)
        </button>
        <button 
          onClick={() => setActiveTab("treatment")} 
          className={`pb-4 text-lg font-black transition-all ${activeTab === "treatment" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-400 hover:text-zinc-600"}`}
        >
          💆‍♂️ 처치 내역 (Treatment Log)
        </button>
      </div>

      {/* 1. SOAP 진단 기록 탭 */}
      {activeTab === "soap" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
              <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 임상 타임라인 ({soapNotes.length}건)
            </h2>
            {soapNotes.length > 0 && (
              <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                {/* 💡 디테일 수정: 치료순 -> 평가순 */}
                <button onClick={() => setSortOrder("desc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "desc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>최신 평가순</button>
                <button onClick={() => setSortOrder("asc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "asc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>첫 평가순</button>
              </div>
            )}
          </div>

          {soapNotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm text-zinc-500 font-bold">아직 작성된 평가 기록이 없습니다.</div>
          ) : (
            <div className="relative pl-4 md:pl-8">
              <div className="absolute left-[11px] md:left-[27px] top-6 bottom-0 w-[2px] bg-blue-100"></div>
              <div className="space-y-10">
                {sortedNotes.map((note, index) => {
                  const visitNumber = sortOrder === "desc" ? soapNotes.length - index : index + 1;
                  return (
                    <div key={note.id} className="relative">
                      <div className="absolute -left-4 md:-left-8 top-6 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white shadow-sm z-10"></div>
                      <div className="ml-6 md:ml-8 bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
                        <div className="flex flex-col gap-2 mb-6 border-b border-zinc-100 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg">{formatDateTime(note.created_at)}</span>
                            <span className="text-xs font-bold text-zinc-400">#{visitNumber}번째 평가</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-md text-xs border border-zinc-200">진단 부위: {note.joint?.toUpperCase() || '미지정'}</span>
                            <span className={`font-black px-3 py-1 rounded-md text-xs border ${getVasBadgeStyle(note.pain_scale)}`}>VAS: {note.pain_scale}/10</span>
                          </div>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-6">
                          <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                            <p className="text-xs font-black text-orange-600 mb-2 uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Subjective (주관적 호소)</p>
                            <p className="text-sm whitespace-pre-wrap text-zinc-700 leading-relaxed">{note.subjective}</p>
                          </div>
                          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                            <p className="text-xs font-black text-blue-600 mb-2 uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Objective (객관적 평가)</p>
                            <p className="text-sm whitespace-pre-wrap text-zinc-700 leading-relaxed">{note.objective}</p>
                          </div>
                          <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/50">
                            <p className="text-xs font-black text-green-600 mb-2 uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Assessment (평가 및 진단)</p>
                            <p className="text-sm whitespace-pre-wrap text-zinc-700 leading-relaxed">{note.assessment}</p>
                          </div>
                          <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100/50">
                            <p className="text-xs font-black text-purple-600 mb-2 uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Plan (치료 계획)</p>
                            <p className="text-sm whitespace-pre-wrap text-zinc-700 leading-relaxed">{note.plan}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 처치 내역 탭 (P-노트 누적형) */}
      {activeTab === "treatment" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* 🚀 핵심: 다시 복구된 주황색 P-노트 입력 섹션 */}
          <div className="bg-orange-50 p-8 rounded-[2.5rem] border-2 border-orange-200 shadow-sm mb-10">
            <label className="block text-xl font-black text-orange-600 mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm">P</span>
              오늘의 처치 기록 (Plan)
            </label>
            <div className="flex flex-col gap-4">
              <textarea
                value={newTreatment}
                onChange={(e) => setNewTreatment(e.target.value)}
                placeholder="오늘 진행한 도수치료 및 운동요법 내용을 상세히 기록하세요... (엔터키 줄바꿈 가능)"
                className="w-full h-40 rounded-3xl bg-white border-none p-6 text-base shadow-inner focus:ring-2 focus:ring-orange-300 outline-none transition leading-relaxed text-zinc-800"
                style={{ whiteSpace: "pre-wrap" }}
              />
              <button
                onClick={handleAddTreatment}
                disabled={isSubmittingTreatment || !newTreatment.trim()}
                className="h-16 rounded-2xl bg-orange-500 font-black text-white text-lg shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSubmittingTreatment ? "기록 저장 중..." : "오늘의 P-노트 저장하기"}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
              <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 누적 처치 내역 ({treatments.length}건)
            </h2>
          </div>

          {treatments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm text-zinc-500 font-bold">
              아직 작성된 처치 기록이 없습니다. 상단의 주황색 P-노트 칸에 첫 치료를 기록해 보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {treatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="group flex items-start justify-between rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-blue-200"
                >
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-sm font-black text-zinc-400">
                        {new Date(treatment.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-base font-medium leading-relaxed text-zinc-700" style={{ whiteSpace: "pre-wrap" }}>
                      {treatment.content}
                    </p>
                  </div>

                  {/* 🗑️ 선명한 버튼식 삭제 버튼 유지 */}
                  <div className="ml-6 flex-shrink-0">
                    <button
                      onClick={() => handleDeleteTreatment(treatment.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 border border-red-100 transition-all hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200 active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}