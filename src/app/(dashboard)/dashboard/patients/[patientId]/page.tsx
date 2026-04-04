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

  useEffect(() => {
    const fetchPatientAndRecords = async () => {
      // 🚨 에러 1순위: URL에서 환자 ID 자체가 제대로 안 넘어온 경우
      if (!patientId || patientId === "null" || patientId === "undefined") {
        setDebugError("환자 ID가 정상적으로 전달되지 않았습니다. (환자 목록에서 다시 '차트 보기'를 눌러주세요)");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setDebugError("");

      try {
        // 1. 환자 기본 정보 가져오기 (maybeSingle을 써서 에러를 정확하게 캐치합니다)
        const { data: patientData, error: patientError } = await (supabase as any)
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .maybeSingle();

        if (patientError) throw patientError;
        
        // 🚨 에러 2순위: ID는 넘어왔는데 DB에 그 환자가 없는 경우
        if (!patientData) {
          throw new Error(`DB에서 해당 환자를 찾을 수 없습니다. (전달된 ID: ${patientId})`);
        }
        
        setPatient(patientData);

        // 2. 이 환자의 이전 SOAP 진료 기록들 모두 가져오기
        const { data: soapData, error: soapError } = await (supabase as any)
          .from("soap_notes")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

        if (!soapError && soapData) {
          setSoapNotes(soapData);
        }
      } catch (error: any) {
        console.error("데이터 로딩 실패:", error);
        setDebugError(error.message || "알 수 없는 데이터베이스 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientAndRecords();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-xl font-bold text-blue-900 animate-pulse">원장님의 하이엔드 차트를 불러오는 중입니다...</div>
      </div>
    );
  }

  // 🚨 X-ray 결과 화면: 여기서 도대체 뭐가 문제인지 다 까발려집니다!
  if (!patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6">
        <h2 className="text-2xl font-black text-zinc-800 mb-4">환자 정보를 찾을 수 없습니다.</h2>
        
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 mb-8 text-center max-w-lg shadow-sm">
          <p className="font-black text-sm mb-3 border-b border-red-200 pb-2">🚨 원인 분석 (X-ray 디버깅)</p>
          <p className="text-sm font-bold break-all">{debugError}</p>
          <p className="text-xs mt-3 text-red-400">주소창의 현재 ID: {patientId}</p>
        </div>

        <Link href="/dashboard/patients" className="text-zinc-700 font-bold hover:text-blue-600 transition bg-white px-8 py-4 rounded-xl shadow-sm border border-zinc-200">
          &larr; 환자 목록으로 돌아가서 다시 클릭해 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8">
        <Link href="/dashboard/patients" className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 mb-4 transition">
          &larr; 환자 목록으로
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-blue-950">
            {patient.name} 환자 차트
          </h1>
          <Link href={`/dashboard/soap/new?patientId=${patient.id}`}>
            <button className="h-12 rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg transition hover:bg-orange-600">
              + 새 SOAP 차트 작성
            </button>
          </Link>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          데이터는 정직하고 케어는 전문물리치료사가 정교하게 실행합니다.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm mb-10 flex flex-wrap gap-10">
        <div>
          <p className="text-sm font-bold text-zinc-400 mb-1">성별 / 나이</p>
          <p className="text-lg font-black text-zinc-800">{patient.gender} / {patient.age}세</p>
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-400 mb-1">연락처</p>
          <p className="text-lg font-black text-zinc-800">{patient.phone || '미입력'}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-400 mb-1">주 진단명</p>
          <p className="text-lg font-black text-blue-600">{patient.diagnosis || '미입력'}</p>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-bold text-zinc-400 mb-1">특이사항 (Memo)</p>
          <p className="text-sm font-medium text-zinc-600">{patient.memo || '특이사항 없음'}</p>
        </div>
      </div>

      <h2 className="text-xl font-black text-blue-950 mb-6 flex items-center gap-2">
        <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 이전 진료 기록 ({soapNotes.length}건)
      </h2>

      {soapNotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm text-zinc-500 font-bold">
          아직 작성된 SOAP 진료 기록이 없습니다. 상단의 버튼을 눌러 첫 기록을 남겨보세요.
        </div>
      ) : (
        <div className="space-y-6">
          {soapNotes.map((note, index) => (
            <div key={note.id} className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-900 font-black px-4 py-2 rounded-lg text-sm">
                    {new Date(note.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <span className="font-black text-zinc-700 bg-zinc-100 px-3 py-1 rounded-md text-sm">
                    부위: {note.joint?.toUpperCase() || '미지정'}
                  </span>
                  <span className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-md text-sm">
                    VAS: {note.pain_scale}/10
                  </span>
                </div>
                <span className="text-sm font-bold text-zinc-400">#{soapNotes.length - index}번째 치료</span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 p-5 rounded-2xl">
                  <p className="text-xs font-black text-orange-500 mb-2 uppercase">Subjective (주관적 호소)</p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-800">{note.subjective}</p>
                </div>
                <div className="bg-zinc-50 p-5 rounded-2xl">
                  <p className="text-xs font-black text-blue-500 mb-2 uppercase">Objective (객관적 평가)</p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-800">{note.objective}</p>
                </div>
                <div className="bg-zinc-50 p-5 rounded-2xl">
                  <p className="text-xs font-black text-green-500 mb-2 uppercase">Assessment (평가 및 진단)</p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-800">{note.assessment}</p>
                </div>
                <div className="bg-zinc-50 p-5 rounded-2xl">
                  <p className="text-xs font-black text-purple-500 mb-2 uppercase">Plan (치료 계획)</p>
                  <p className="text-sm whitespace-pre-wrap text-zinc-800">{note.plan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}