"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // 🪄 [핵심] 컴포넌트가 열릴 때마다 무조건 최신 데이터를 DB에서 긁어옵니다.
  const fetchPatients = async () => {
    setIsLoading(true);
    
    // DB의 보안 자물쇠(RLS)가 어차피 내 환자만 걸러서 주므로, 프론트엔드에서는 묻지도 따지지도 않고 다 가져오라고 명령합니다.
    const { data, error } = await (supabase as any)
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false }); 

    if (error) {
      console.error("데이터를 불러오지 못했습니다:", error.message);
    } else if (data) {
      setPatients(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const isConfirm = window.confirm(`⚠️ [경고] ${name} 환자의 모든 데이터를 정말 삭제하시겠습니까?\n삭제 후에는 절대 복구할 수 없습니다.`);
    if (!isConfirm) return; 

    const { error } = await (supabase as any)
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      alert("삭제 중 오류가 발생했습니다: " + error.message);
    } else {
      setPatients(patients.filter((patient) => patient.id !== id));
      alert(`${name} 환자의 데이터가 영구적으로 삭제되었습니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">Re:PhyT 환자 관리</h1>
          <p className="mt-2 text-sm font-medium text-zinc-600">
            데이터는 정직하고 케어는 전문물리치료사가 정교하게 실행합니다.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {/* 수동 새로고침 버튼 (리스트가 안 보일 때 뚫어주는 역할) */}
          <button onClick={fetchPatients} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            새로고침
          </button>

          <Link href="/dashboard/patients/new">
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 text-sm font-bold text-white shadow-md transition hover:bg-orange-600">
              신규 환자 등록
            </button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-blue-900 font-bold animate-pulse">
          환자 데이터를 동기화하는 중입니다...
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-20 px-6 text-center shadow-sm">
          <div className="rounded-full bg-blue-50 p-4 text-blue-900 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-900">아직 등록된 환자가 없거나 불러오지 못했습니다.</h3>
          <p className="mt-2 text-zinc-600 max-w-sm">
            상단의 '새로고침' 버튼을 누르거나 첫 번째 환자를 등록해 보세요.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-6 py-4">환자 이름</th>
                  <th className="px-6 py-4">성별/나이</th>
                  <th className="px-6 py-4">주진단명</th>
                  <th className="px-6 py-4">연락처</th>
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {patients.map((patient) => (
                  <tr key={patient.id} className="transition-colors hover:bg-blue-50/30">
                    <td className="px-6 py-4 font-bold text-zinc-900">{patient.name || '-'}</td>
                    <td className="px-6 py-4">{patient.gender || '-'} / {patient.age || '0'}세</td>
                    <td className="px-6 py-4 font-medium text-blue-900">{patient.diagnosis || '-'}</td>
                    <td className="px-6 py-4 text-zinc-500">{patient.phone || '-'}</td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                      <Link href={`/dashboard/patients/${patient.id}`} className="flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:bg-blue-50">
                        차트 보기
                      </Link>
                      <Link href={`/dashboard/soap/new?patientId=${patient.id}`} className="flex h-9 items-center rounded-lg bg-zinc-900 px-3 text-xs font-bold text-white transition hover:bg-zinc-700">
                        SOAP 작성
                      </Link>
                      <button onClick={() => handleDelete(patient.id, patient.name)} className="flex h-9 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}