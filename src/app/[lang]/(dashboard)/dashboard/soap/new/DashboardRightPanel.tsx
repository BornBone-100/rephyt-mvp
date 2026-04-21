"use client";

import { AlertTriangle, BookOpen, Link2, Shield, Siren, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";

type LogicChainAudit = {
  status: "pass" | "fail" | "warning";
  feedback: string;
  missingLinks: string[];
};

type CpgComplianceItem = {
  intervention: string;
  level: "green" | "yellow" | "red";
  reasoning: string;
  alternative: string | null;
};

type AuditDefense = {
  riskLevel: "Low" | "Medium" | "High";
  defenseScore: number;
  feedback: string;
  improvementTip: string;
};

type PredictiveTrajectory = {
  estimatedWeeks: number;
  trajectoryText: string;
};

export type FinalReportResult = {
  overallScore: number;
  logicChainAudit: LogicChainAudit;
  cpgCompliance: CpgComplianceItem[];
  auditDefense: AuditDefense;
  predictiveTrajectory: PredictiveTrajectory;
  hasRedFlag?: boolean;
  criticalAlert?: {
    title: string;
    suspectedCondition: string;
    reason: string;
    action: string;
  } | null;
};

type Props = {
  result?: FinalReportResult | null;
  isLoading?: boolean;
};

function sanitizeText(raw: string) {
  return raw
    .replace(/[가-힣]{2,4}\s?(님|씨)?/g, "***")
    .replace(/\b\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "***-****-****")
    .replace(/\b\d{2,4}[./-]\d{1,2}[./-]\d{1,2}\b/g, "****-**-**");
}

function buildCommunityPayload(data: FinalReportResult) {
  return {
    challengeTitle: `${Math.round(data.overallScore)}점 달성! 임상 추론 챌린지`,
    defenseHighlight: sanitizeText(data.auditDefense.improvementTip),
    anonymousData: {
      logicChain: sanitizeText(data.logicChainAudit.feedback),
      trajectory: sanitizeText(data.predictiveTrajectory.trajectoryText),
      cpg: data.cpgCompliance.map((item) => ({
        intervention: sanitizeText(item.intervention),
        level: item.level,
        reasoning: sanitizeText(item.reasoning),
      })),
    },
    overallScore: data.overallScore,
    defenseScore: data.auditDefense.defenseScore,
  };
}

function levelBadge(level: "green" | "yellow" | "red") {
  if (level === "green") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (level === "yellow") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function ReportBody({ data }: { data: FinalReportResult }) {
  const [isSharing, setIsSharing] = useState(false);
  const score = Math.max(0, Math.min(100, data.overallScore));
  const defenseScore = Math.max(0, Math.min(100, data.auditDefense.defenseScore));
  const gaugeBg = { background: `conic-gradient(#2563eb ${score * 3.6}deg, #e2e8f0 0deg)` };
  const riskTone =
    data.auditDefense.riskLevel === "High"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : data.auditDefense.riskLevel === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  const logicTone =
    data.logicChainAudit.status === "pass"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : data.logicChainAudit.status === "fail"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="space-y-4">
      {data.hasRedFlag ? (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-rose-700">
            <Siren className="h-4 w-4" /> Referral Priority
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-700">{data.criticalAlert?.suspectedCondition ?? "의학적 의뢰 필요"}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">종합 임상 논리 점수</h2>
        <div className="mt-4 flex items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full p-2" style={gaugeBg}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
              <div className="text-center">
                <p className="text-3xl font-black text-blue-700">{score}</p>
                <p className="text-xs font-semibold text-slate-400">/ 100</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 shadow-sm ${logicTone}`}>
        <h3 className="flex items-center gap-2 text-sm font-black">
          <Link2 className="h-4 w-4" /> 임상 추론 사슬 검증 (Logic Chain Audit)
        </h3>
        <p className="mt-3 text-sm leading-relaxed">{data.logicChainAudit.feedback}</p>
        {data.logicChainAudit.missingLinks.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            {data.logicChainAudit.missingLinks.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-700">
          <BookOpen className="h-4 w-4 text-blue-600" /> CPG 준수율 검증 (CPG Compliance)
        </h3>
        <div className="mt-4 space-y-3">
          {data.cpgCompliance.map((item, idx) => (
            <div key={`${item.intervention}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-700">{item.intervention}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${levelBadge(item.level)}`}>
                  {item.level}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.reasoning}</p>
              {item.level !== "green" && item.alternative ? (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-semibold text-blue-700">
                  💡 {item.alternative}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border p-5 shadow-sm ${riskTone}`}>
        <h3 className="flex items-center gap-2 text-sm font-black">
          <Shield className="h-4 w-4" /> 삭감 방어력 (Audit Defense)
        </h3>
        <p className="mt-2 text-sm">{data.auditDefense.feedback}</p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span>Defense Score</span>
            <span>{defenseScore}/100</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/70">
            <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${defenseScore}%` }} />
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">개선 팁</p>
          {data.auditDefense.improvementTip}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-700">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> 회복 궤적 예측 (Predictive Trajectory)
        </h3>
        <div className="mt-3 flex items-start gap-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-3xl font-black text-emerald-700">{data.predictiveTrajectory.estimatedWeeks}</p>
            <p className="text-xs font-bold text-emerald-600">주 예상</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{data.predictiveTrajectory.trajectoryText}</p>
        </div>
        {data.hasRedFlag ? (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Red Flag 상태에서는 예측 해석보다 의학적 의뢰를 우선하세요.
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-black text-slate-700">커뮤니티 및 SNS 공유</h3>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={isSharing}
            onClick={async () => {
              setIsSharing(true);
              try {
                const payload = buildCommunityPayload(data);
                const res = await fetch("/api/community/report-share", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "challenge", payload }),
                });
                if (!res.ok) throw new Error("공유 실패");
                alert("🏆 챌린지 참여 카드가 커뮤니티에 업로드되었습니다.");
              } catch {
                alert("커뮤니티 업로드 중 오류가 발생했습니다.");
              } finally {
                setIsSharing(false);
              }
            }}
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            🏆 챌린지 참여
          </button>
          <button
            type="button"
            disabled={isSharing}
            onClick={async () => {
              setIsSharing(true);
              try {
                const payload = buildCommunityPayload(data);
                const res = await fetch("/api/community/report-share", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "defense_tip", payload }),
                });
                if (!res.ok) throw new Error("공유 실패");
                alert("🛡️ 삭감 방어 팁이 익명 공유되었습니다.");
              } catch {
                alert("커뮤니티 업로드 중 오류가 발생했습니다.");
              } finally {
                setIsSharing(false);
              }
            }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            🛡️ 삭감 방어 팁 공유
          </button>
          <button
            type="button"
            onClick={() => {
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><text x="80" y="160" fill="#93c5fd" font-size="36" font-family="Arial">Re:PhyT Clinical Branding</text><text x="80" y="260" fill="#ffffff" font-size="72" font-weight="700" font-family="Arial">SCORE ${score}</text><text x="80" y="350" fill="#34d399" font-size="40" font-family="Arial">Defense ${defenseScore}/100</text><text x="80" y="450" fill="#cbd5e1" font-size="30" font-family="Arial">${sanitizeText(
                data.predictiveTrajectory.trajectoryText,
              ).slice(0, 60)}</text></svg>`;
              const blob = new Blob([svg], { type: "image/svg+xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "rephyt-branding-card.svg";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs font-bold text-violet-700 transition hover:bg-violet-100"
          >
            📱 인스타 브랜딩
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinalReportDashboard({ result, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans lg:p-10">
        <div className="space-y-4">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full w-full overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans lg:p-10">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <p className="text-sm font-semibold">AI 분석 대기 중입니다. 좌측 폼 입력 후 분석을 요청해 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full animate-in fade-in overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans duration-300 lg:p-10">
      <ReportBody data={result} />
    </div>
  );
}
