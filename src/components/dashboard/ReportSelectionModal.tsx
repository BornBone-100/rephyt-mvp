"use client";

import React, { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ReportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (report: any) => void;
}

export const ReportSelectionModal = ({ isOpen, onClose, onSelect }: ReportSelectionModalProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) fetchMyReports();
  }, [isOpen]);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const clinicalAreas = [
        "neck",
        "shoulder",
        "elbow",
        "wrist",
        "lowBackPain",
        "hip",
        "knee",
        "ankle",
        "foot",
        "cervical",
        "lumbar",
        "achilles",
      ];

      let query = (supabase as any)
        .from("cdss_guardrail_logs")
        .select("id, evaluation_area, diagnosis_area, overall_score, created_at, clinical_reasoning, author_id, patient_id")
        .or(`author_id.eq.${user.id},author_id.is.null`)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("❌ 조회 에러:", error.message);
        return;
      }

      const clinicalReports = (data || []).filter(
        (report: any) => {
          const area = ((report as any).evaluation_area ?? (report as any).diagnosis_area ?? "")
            .toLowerCase();
          const isClinicalArea = clinicalAreas.some((clinical) => area.includes(clinical.toLowerCase()));
          const isNotCommunity = !area.includes("community") && !area.includes("post");
          const hasScore = report.overall_score !== null && report.overall_score !== undefined;
          return (isClinicalArea || hasScore) && isNotCommunity;
        },
      );

      setReports(clinicalReports);
    } catch (err) {
      console.error("시스템 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-bold text-slate-800">임상 리포트 불러오기</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading ? (
            <div className="py-10 text-center text-slate-500">불러오는 중...</div>
          ) : reports.length === 0 ? (
            <div className="py-10 text-center text-slate-500">작성된 리포트가 없습니다.</div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  onSelect(report);
                  onClose();
                }}
                className="mb-2 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <div className="rounded-md bg-indigo-100 p-2 text-indigo-600">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {report.evaluation_area || report.diagnosis_area || "미지정 부위"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(report.created_at).toLocaleDateString()} · 점수: {report.overall_score}점
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm text-slate-600">{report.clinical_reasoning}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
