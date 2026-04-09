"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export interface RomMmtRecord {
  id: string;
  movement: string;
  arom: string;
  prom: string;
  mmt: string;
  note: string;
}

const MMT_OPTIONS = [
  "-",
  "5 (N)",
  "4+ (G+)",
  "4 (G)",
  "4- (G-)",
  "3+ (F+)",
  "3 (F)",
  "3- (F-)",
  "2+ (P+)",
  "2 (P)",
  "2- (P-)",
  "1 (T)",
  "0 (Z)",
];

type RomMmtAssessmentProps = {
  title?: string;
  records: RomMmtRecord[];
  onRecordsChange: (next: RomMmtRecord[]) => void;
};

export default function RomMmtAssessment({
  title = "STEP 2. 정밀 평가 (ROM & MMT)",
  records,
  onRecordsChange,
}: RomMmtAssessmentProps) {
  const [newMovement, setNewMovement] = useState("");
  const [newArom, setNewArom] = useState("");
  const [newProm, setNewProm] = useState("");
  const [newMmt, setNewMmt] = useState("-");
  const [newNote, setNewNote] = useState("");

  const handleAddRecord = () => {
    if (!newMovement.trim()) {
      alert("평가할 관절/동작(근육)을 입력해주세요.");
      return;
    }

    const newRecord: RomMmtRecord = {
      id: uuidv4(),
      movement: newMovement,
      arom: newArom || "-",
      prom: newProm || "-",
      mmt: newMmt,
      note: newNote,
    };

    onRecordsChange([...records, newRecord]);

    setNewMovement("");
    setNewArom("");
    setNewProm("");
    setNewMmt("-");
    setNewNote("");
  };

  const handleRemoveRecord = (id: string) => {
    onRecordsChange(records.filter((record) => record.id !== id));
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 border-b border-zinc-200 pb-2 text-lg font-bold text-blue-950">{title}</h2>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
        {/* 1행: 동작명 — 가로 전체 */}
        <div className="w-full min-w-0">
          <label className="mb-1 block text-xs font-bold text-zinc-500">
            관절 및 동작명 (예: Shoulder Flexion)
          </label>
          <input
            type="text"
            value={newMovement}
            onChange={(e) => setNewMovement(e.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="동작 또는 근육명 입력"
          />
        </div>

        {/* 2행: AROM / PROM / MMT — 1:1:1 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-zinc-500">AROM (°)</label>
            <input
              type="text"
              value={newArom}
              onChange={(e) => setNewArom(e.target.value)}
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 px-2 text-sm outline-none focus:border-blue-500 sm:px-3"
              placeholder="예: 150"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-zinc-500">PROM (°)</label>
            <input
              type="text"
              value={newProm}
              onChange={(e) => setNewProm(e.target.value)}
              className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 px-2 text-sm outline-none focus:border-blue-500 sm:px-3"
              placeholder="예: 160"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold text-zinc-500">MMT 등급</label>
            <select
              value={newMmt}
              onChange={(e) => setNewMmt(e.target.value)}
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold text-zinc-700 outline-none focus:border-blue-500 sm:text-sm sm:px-3"
            >
              {MMT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3행: End-feel + 버튼 */}
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-bold text-zinc-500">
            End-feel / 통증 양상 / 특이사항
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRecord()}
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-blue-500"
              placeholder="예: Firm, 끝범위 통증, 근약화 뚜렷함"
            />
            <button
              type="button"
              onClick={handleAddRecord}
              className="h-11 shrink-0 rounded-xl bg-blue-950 px-4 text-sm font-bold whitespace-nowrap text-white shadow-sm transition hover:bg-blue-900 sm:px-6"
            >
              기록 추가
            </button>
          </div>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-4 font-bold">동작명 / 근육명</th>
                <th className="w-20 px-4 py-4 text-center font-bold">AROM</th>
                <th className="w-20 px-4 py-4 text-center font-bold">PROM</th>
                <th className="w-24 px-4 py-4 text-center font-bold text-blue-700">MMT</th>
                <th className="px-4 py-4 font-bold">특이사항 (End-feel 등)</th>
                <th className="w-16 px-4 py-4 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {records.map((record) => (
                <tr key={record.id} className="transition hover:bg-zinc-50/50">
                  <td className="px-4 py-4 font-black text-zinc-800">{record.movement}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 font-bold text-zinc-700">
                      {record.arom}
                      {record.arom !== "-" && "°"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 font-bold text-zinc-700">
                      {record.prom}
                      {record.prom !== "-" && "°"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {record.mmt !== "-" ? (
                      <span className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700">
                        {record.mmt}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium text-zinc-600">{record.note || "-"}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRecord(record.id)}
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:text-red-700"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center text-sm font-bold text-zinc-400">
          평가된 가동 범위(ROM) 및 근력(MMT) 데이터가 없습니다.
        </div>
      )}
    </section>
  );
}
