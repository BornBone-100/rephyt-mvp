import Link from "next/link";

// 🏥 임시 환자 데이터 (나중에 Supabase와 연결할 겁니다)
const mockPatients = [
  { id: "P001", name: "김성준", gender: "남", age: 45, lastVisit: "2026-03-28", diagnosis: "오십견 (Frozen Shoulder)" },
  { id: "P002", name: "이영희", gender: "여", age: 32, lastVisit: "2026-03-29", diagnosis: "요추 추간판 탈출증 (L-HIVD)" },
  { id: "P003", name: "박철수", gender: "남", age: 60, lastVisit: "2026-03-25", diagnosis: "퇴행성 슬관절염 (Knee OA)" },
  { id: "P004", name: "최미경", gender: "여", age: 28, lastVisit: "2026-03-30", diagnosis: "경추 염좌 (Neck Sprain)" },
];

export default function PatientsPage() {
  return (
    <div className="p-6 md:p-10">
      {/* 🔹 헤더 섹션 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">환자 관리</h1>
          <p className="mt-2 text-zinc-600">Re:PhyT에 등록된 환자 목록입니다. 차트를 보거나 새 SOAP 노트를 작성하세요.</p>
        </div>
        <button className="h-11 px-6 rounded-xl bg-blue-900 text-sm font-medium text-white transition hover:bg-blue-950 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          신규 환자 등록
        </button>
      </div>

      {/* 🔹 검색 및 필터 바 (디자인만) */}
      <div className="mb-6 flex gap-3">
        <input 
          type="text" 
          placeholder="환자 이름 또는 고유번호 검색..." 
          className="h-11 w-full max-w-sm rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
        />
        <button className="h-11 px-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50">필터</button>
      </div>

      {/* 🔹 환자 목록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">환자 ID</th>
              <th className="px-6 py-4 font-medium">이름</th>
              <th className="px-6 py-4 font-medium">성별/나이</th>
              <th className="px-6 py-4 font-medium">주진단명</th>
              <th className="px-6 py-4 font-medium">최근 내원일</th>
              <th className="px-6 py-4 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-900">
            {mockPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-zinc-500">{patient.id}</td>
                <td className="px-6 py-4 font-semibold">{patient.name}</td>
                <td className="px-6 py-4">{patient.gender} / {patient.age}세</td>
                <td className="px-6 py-4 text-zinc-700">{patient.diagnosis}</td>
                <td className="px-6 py-4 text-zinc-600">{patient.lastVisit}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <Link href={`/dashboard/patients/${patient.id}`} className="h-9 px-4 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center">
                    차트 보기
                  </Link>
                  <Link href="/dashboard/soap/new" className="h-9 px-4 rounded-lg bg-zinc-900 text-xs font-medium text-white hover:bg-black flex items-center">
                    SOAP 작성
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}