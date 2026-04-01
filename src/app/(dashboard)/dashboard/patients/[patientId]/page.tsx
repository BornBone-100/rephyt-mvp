"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;

      // DB에서 해당 환자의 고유 ID로 정보를 찾아옵니다
      const { data, error } = await (supabase as any)
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single(); // 한 명의 데이터만 콕 집어서 가져옴

      if (error) {
        console.error("환자 정보를 불러오지 못했습니다:", error);
      } else if (data) {
        setPatient(data);
      }
      setIsLoading(false);
    };

    fetchPatientData();
  }, [patientId]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-blue-900 font-bold animate-pulse">차트 데이터를 불러오는 중입니다...</div>;
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
        <h2 className="text-2xl font-bold text-zinc-800">환자 정보를 찾을 수 없습니다.</h2>
        <Link href="/dashboard/patients" className="mt-4 text-blue-600 underline">목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-24">
      {/* 🔹 상단 네비게이션 및 헤더 */}
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <Link href="/dashboard/patients" className="mb-4 inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="mr-2 h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          환자 목록으로 돌아가기
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-blue-950">
              {patient.name} <span className="text-xl font-medium text-zinc-500">환자 차트</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행합니다
            </p>
          </div>
          <Link href="/dashboard/soap/new">
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-bold text-white shadow-md transition hover:bg-zinc-800 w-full md:w-auto">
              <span className="bg-orange-500 w-2 h-2 rounded-full animate-pulse"></span>
              새 SOAP 노트 작성하기
            </button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* 🟡 왼쪽: 환자 기본 정보 패널 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-7 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 mb-6 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-500"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>
              기본 정보 (Demographics)
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase">성별 / 나이</p>
                <p className="text-base font-semibold text-zinc-900 mt-1">
                  {patient.gender === 'M' || patient.gender === '남성' ? '남성' : patient.gender === 'F' || patient.gender === '여성' ? '여성' : '미상'} / {patient.age || '-'}세
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase">연락처</p>
                <p className="text-base font-semibold text-zinc-900 mt-1">{patient.phone || '입력되지 않음'}</p>
              </div>
              <div className="pt-2">
                <p className="text-xs font-bold text-zinc-400 uppercase">주 진단명 (Diagnosis)</p>
                <div className="mt-2 inline-block rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm font-bold text-blue-800">
                  {patient.diagnosis || '진단명 없음'}
                </div>
              </div>
              {patient.memo && (
                <div className="pt-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase">특이사항 (Memo)</p>
                  <p className="mt-2 text-sm text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100 leading-relaxed">
                    {patient.memo}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔵 오른쪽: SOAP 진료 기록 목록 (차후 연동 영역) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-zinc-200 p-7 shadow-sm min-h-[500px]">
            <h2 className="text-lg font-bold text-blue-950 mb-6 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-500"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 17.25c1.74 0 3.336.599 4.635 1.627.085.068.182.121.285.155.107.036.22.055.33.055s.223-.019.33-.055a.81.81 0 0 0 .285-.155A8.209 8.209 0 0 1 18 17.25c1.74 0 3.336.599 4.635 1.627a.75.75 0 0 0 1-.707V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533M12 21.375v-14.25" /></svg>
              SOAP 진료 기록 (Clinical Notes)
            </h2>
            
            {/* 현재는 SOAP을 DB에 저장하는 기능을 안 만들었기 때문에 빈 상태를 보여줍니다. */}
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-blue-50 p-4 text-blue-200 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-800">아직 작성된 진료 차트가 없습니다.</h3>
              <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                상단의 '새 SOAP 노트 작성하기' 버튼을 눌러<br/>첫 번째 진료 기록을 남겨보세요.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}