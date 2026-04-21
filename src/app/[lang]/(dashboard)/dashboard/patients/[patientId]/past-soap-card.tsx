"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Tables } from "@/types/supabase";

export type PastSoapShareCopy = {
  soapSharePastConfirm: string;
  soapSharePastEmpty: string;
  soapSharePastSuccess: string;
  soapSharePastError: string;
  soapSharePastButton: string;
  soapSharePastButtonLoading: string;
  soapSharePastAlreadyShared: string;
  soapDetailPdfLink: string;
};

type Props = {
  pastSoapData: Tables<"soap_notes">;
  visitNumber: number;
  localeApi: string;
  copy: PastSoapShareCopy;
  /** SOAP 상세 페이지 (`/…/dashboard/soap/[uuid]`) — PDF 내보내기 포함 */
  detailHref: string;
  onSharedSuccess: (noteId: string) => void;
};

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

function getVasBadgeStyle(vas: number) {
  if (vas >= 7) return "bg-red-50 text-red-600 border-red-200";
  if (vas >= 4) return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-green-50 text-green-600 border-green-200";
}

export function PastSoapCard({ pastSoapData, visitNumber, localeApi, copy, detailHref, onSharedSuccess }: Props) {
  const [isShared, setIsShared] = useState(() => pastSoapData.is_shared === true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setIsShared(pastSoapData.is_shared === true);
  }, [pastSoapData.id, pastSoapData.is_shared]);

  const handleSharePastCase = useCallback(async () => {
    if (isShared) return;

    const originalSoap = {
      subjective: pastSoapData.subjective ?? "",
      objective: pastSoapData.objective ?? "",
      assessment: pastSoapData.assessment ?? "",
      plan: pastSoapData.plan ?? "",
    };

    const hasBody =
      originalSoap.subjective.trim() ||
      originalSoap.objective.trim() ||
      originalSoap.assessment.trim() ||
      originalSoap.plan.trim();

    if (!hasBody) {
      alert(copy.soapSharePastEmpty);
      return;
    }
    if (!window.confirm(copy.soapSharePastConfirm)) return;

    setIsSharing(true);
    try {
      const res = await fetch("/api/community/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSoap,
          locale: localeApi,
          chartId: pastSoapData.id,
        }),
      });
      const result = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (result.success) {
        setIsShared(true);
        onSharedSuccess(pastSoapData.id);
        alert(copy.soapSharePastSuccess);
      } else {
        alert(result.message ?? result.error ?? copy.soapSharePastError);
      }
    } catch {
      alert(copy.soapSharePastError);
    } finally {
      setIsSharing(false);
    }
  }, [copy, isShared, localeApi, onSharedSuccess, pastSoapData]);

  return (
    <div className="relative">
      <div className="absolute -left-4 md:-left-8 top-6 z-10 h-4 w-4 rounded-full bg-blue-500 shadow-sm ring-4 ring-white" />
      <div className="ml-6 md:ml-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 border-b border-zinc-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-900">
                {formatDateTime(pastSoapData.created_at)}
              </span>
              <span className="text-xs font-bold text-zinc-400">#{visitNumber}번째 평가</span>
            </div>
            <Link
              href={detailHref}
              className="inline-flex shrink-0 items-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-950 shadow-sm transition hover:bg-blue-50"
            >
              {copy.soapDetailPdfLink}
            </Link>
          </div>
          <div className="mt-1 flex gap-2">
            <span className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              진단 부위: {pastSoapData.joint?.toUpperCase() || "미지정"}
            </span>
            <span
              className={`rounded-md border px-3 py-1 text-xs font-black ${getVasBadgeStyle(pastSoapData.pain_scale ?? 0)}`}
            >
              VAS: {pastSoapData.pain_scale ?? "—"}/10
            </span>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-orange-100/50 bg-orange-50/50 p-5">
            <p className="mb-2 flex items-center gap-1 text-xs font-black uppercase text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Subjective (주관적 호소)
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{pastSoapData.subjective}</p>
          </div>
          <div className="rounded-2xl border border-blue-100/50 bg-blue-50/50 p-5">
            <p className="mb-2 flex items-center gap-1 text-xs font-black uppercase text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Objective (객관적 평가)
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{pastSoapData.objective}</p>
          </div>
          <div className="rounded-2xl border border-green-100/50 bg-green-50/50 p-5">
            <p className="mb-2 flex items-center gap-1 text-xs font-black uppercase text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Assessment (평가 및 진단)
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{pastSoapData.assessment}</p>
          </div>
          <div className="rounded-2xl border border-purple-100/50 bg-purple-50/50 p-5">
            <p className="mb-2 flex items-center gap-1 text-xs font-black uppercase text-purple-600">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Plan (치료 계획)
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{pastSoapData.plan}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-zinc-100 pt-4">
          {isShared ? (
            <span
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-500 select-none"
            >
              {copy.soapSharePastAlreadyShared}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleSharePastCase()}
              disabled={isSharing}
              className="inline-flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm font-bold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSharing ? copy.soapSharePastButtonLoading : copy.soapSharePastButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
