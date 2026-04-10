"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function PatientsListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPatients(data);
    } catch (error) {
      console.error("목록 불러오기 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("이 환자의 모든 기록을 삭제하시겠습니까?")) {
      const { error } = await (supabase as any).from("patients").delete().eq("id", id);
      if (!error) {
        fetchPatients();
      } else {
        alert("삭제 실패: " + error.message);
      }
    }
  };

  // 🚀 로그아웃 함수
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("로그아웃 중 오류가 발생했습니다.");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8 border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">Re:PhyT 환자 관리</h1>
          <p className="mt-2 text-sm text-zinc-600">데이터는 정직하고 케어는 전문물리치료사가 정교하게 실행합니다.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleLogout}
            className="h-12 px-5 rounded-xl text-sm font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            로그아웃
          </button>
          <button onClick={fetchPatients} className="h-12 rounded-xl bg-white border border-zinc-200 px-6 font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 flex items-center gap-2">
            새로고침
          </button>
          <Link href="/dashboard/patients/new">
            <button className="h-12 rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg transition hover:bg-orange-600">
              신규 환자 등록
            </button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-6 py-5 font-bold">환자 이름</th>
                <th className="px-6 py-5 font-bold">성별/나이</th>
                <th className="px-6 py-5 font-bold">주 진단명</th>
                <th className="px-6 py-5 font-bold">연락처</th>
                <th className="px-6 py-5 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold animate-pulse">
                    환자 목록을 불러오는 중입니다...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold">
                    등록된 환자가 없습니다. 신규 환자를 등록해주세요.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-zinc-50/50 transition">
                    <td className="px-6 py-5 font-black text-zinc-800 text-base">
                      {patient.name || "이름 없음"}
                    </td>
                    <td className="px-6 py-5 font-medium text-zinc-600">
                      {patient.gender || "-"} / {patient.age ? `${patient.age}세` : "-"}
                    </td>
                    <td className="px-6 py-5 font-bold text-blue-600">
                      {patient.diagnosis || "-"}
                    </td>
                    <td className="px-6 py-5 font-medium text-zinc-600">
                      {patient.phone || "-"}
                    </td>
                    <td className="px-6 py-5 text-right space-x-2">
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        <button className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition text-xs">
                          차트 보기
                        </button>
                      </Link>
                      
                      {/* 💡 원상 복구된 SOAP 작성 다크 버튼! */}
                      <Link href={`/dashboard/soap/new?patientId=${patient.id}`}>
                        <button className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition text-xs">
                          SOAP 작성
                        </button>
                      </Link>

                      <button onClick={() => handleDelete(patient.id)} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition text-xs">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}