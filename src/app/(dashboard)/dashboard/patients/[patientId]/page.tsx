"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const supabase = createClient();

  const [patient, setPatient] = useState<any>(null);
  const [soapNotes, setSoapNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatientAndRecords = async () => {
      if (!patientId) return;
      setIsLoading(true);

      try {
        // 1. 환자 기본 정보 가져오기
        const { data: patientData, error: patientError } = await (supabase as any)
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);

        // 2. 이 환자의 이전 SOAP 진료 기록들 모두 가져오기 (최신순)
        const { data: soapData, error: soapError } = await (supabase as any)
          .from("soap_notes")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

        if (!soapError && soapData) {
          setSoapNotes(soapData);
        }
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientAndRecords();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl font-bold text-blue-900 animate-pulse">원장님의 하이엔드 차트를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
        <h2 className="text-2xl font-bold text-zinc-800 mb-4">환자 정보를 찾을 수 없습니다.</h2>
        <Link href="/dashboard/patients" className="text-blue-600 font-bold hover:underline">
          &larr; 환자 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      {/* 1. 상단 뒤로가기 및 타이틀 */}
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
      </div>

      {/* 2. 환자 기본 정보 카드 */}
      <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm mb-10 flex gap-10">
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
        <div className="flex-1">
          <p className="text-sm font-bold text-zinc-400 mb-1">특이사항 (Memo)</p>
          <p className="text-sm font-medium text-zinc-600">{patient.memo || '특이사항 없음'}</p>
        </div>
      </div>

      {/* 3. SOAP 진료 기록 누적 리스트 */}
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