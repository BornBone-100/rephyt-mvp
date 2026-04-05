"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const supabase = createClient();

  const [patient, setPatient] = useState<any>(null);
  const [soapNotes, setSoapNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugError, setDebugError] = useState("");
  
  // 💡 정렬 스위치 상태 (최신순: desc, 과거순: asc)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
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

        // 기본적으로 최신순으로 가져옵니다.
        const { data: soapData, error: soapError } = await (supabase as any)
          .from("soap_notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });

        if (!soapError && soapData) setSoapNotes(soapData);
      } catch (error: any) {
        console.error("데이터 로딩 실패:", error);
        setDebugError(error.message || "알 수 없는 데이터베이스 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientAndRecords();
  }, [patientId]);

  // 💡 1. 날짜 포맷팅 함수 (초 단위 기록을 한국어 날짜와 시간으로 변환)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
      hour: "numeric", minute: "numeric", hour12: true
    });
    return formatter.format(date);
  };

  // 💡 2. VAS 색상 자동 변환 함수 (점수에 따라 직관적인 컬러 부여)
  const getVasBadgeStyle = (vas: number) => {
    if (vas >= 7) return "bg-red-50 text-red-600 border-red-200";      // 심한 통증
    if (vas >= 4) return "bg-orange-50 text-orange-600 border-orange-200"; // 중간 통증
    return "bg-green-50 text-green-600 border-green-200";            // 경미한 통증/호전
  };

  // 💡 3. 정렬 로직 (버튼 클릭 시 배열 순서 뒤집기)
  const sortedNotes = sortOrder === "desc" ? [...soapNotes] : [...soapNotes].reverse();

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

      <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm mb-10 flex flex-wrap gap-10">
        <div><p className="text-sm font-bold text-zinc-400 mb-1">성별 / 나이</p><p className="text-lg font-black text-zinc-800">{patient.gender} / {patient.age}세</p></div>
        <div><p className="text-sm font-bold text-zinc-400 mb-1">연락처</p><p className="text-lg font-black text-zinc-800">{patient.phone || '미입력'}</p></div>
        <div><p className="text-sm font-bold text-zinc-400 mb-1">주 진단명</p><p className="text-lg font-black text-blue-600">{patient.diagnosis || '미입력'}</p></div>
        <div className="flex-1 min-w-[200px]"><p className="text-sm font-bold text-zinc-400 mb-1">특이사항 (Memo)</p><p className="text-sm font-medium text-zinc-600">{patient.memo || '특이사항 없음'}</p></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-zinc-200 pb-4">
        <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
          <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 임상 타임라인 ({soapNotes.length}건)
        </h2>
        {/* 💡 최신순 / 과거순 스위치 */}
        {soapNotes.length > 0 && (
          <div className="bg-zinc-100 p-1 rounded-xl flex gap-1 mt-4 md:mt-0">
            <button onClick={() => setSortOrder("desc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "desc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>최신 치료순</button>
            <button onClick={() => setSortOrder("asc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "asc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>첫 치료순</button>
          </div>
        )}
      </div>

      {soapNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm text-zinc-500 font-bold">
          아직 작성된 치료 기록이 없습니다. 상단의 버튼을 눌러 첫 기록을 남겨보세요.
        </div>
      ) : (
        <div className="relative pl-4 md:pl-8">
          {/* 💡 세로 타임라인 선 */}
          <div className="absolute left-[11px] md:left-[27px] top-6 bottom-0 w-[2px] bg-blue-100"></div>

          <div className="space-y-10">
            {sortedNotes.map((note, index) => {
              // 최신순일 때는 3, 2, 1 카운트다운, 과거순일 때는 1, 2, 3 카운트업
              const visitNumber = sortOrder === "desc" ? soapNotes.length - index : index + 1;
              
              return (
                <div key={note.id} className="relative">
                  {/* 💡 타임라인 노드 (동그라미 포인트) */}
                  <div className="absolute -left-4 md:-left-8 top-6 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white shadow-sm z-10"></div>

                  <div className="ml-6 md:ml-8 bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm hover:shadow-md transition hover:border-blue-200">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 border-b border-zinc-100 pb-4 gap-4">
                      
                      <div className="flex flex-col gap-2">
                        {/* 💡 정확한 진료 일시 표시 */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg">
                            {formatDateTime(note.created_at)}
                          </span>
                          <span className="text-xs font-bold text-zinc-400">#{visitNumber}번째 치료</span>
                        </div>
                        
                        {/* 💡 부위 및 직관적인 VAS 컬러 배지 */}
                        <div className="flex gap-2">
                          <span className="font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-md text-xs border border-zinc-200">
                            진단 부위: {note.joint?.toUpperCase() || '미지정'}
                          </span>
                          <span className={`font-black px-3 py-1 rounded-md text-xs border ${getVasBadgeStyle(note.pain_scale)}`}>
                            VAS: {note.pain_scale}/10
                          </span>
                        </div>
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
  );
}