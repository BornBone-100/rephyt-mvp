"use client";

import { AlertTriangle, BookOpen, Link2, Shield, Siren, Sparkles, TrendingUp } from "lucide-react";
import { soapWizardCopy, type SoapLocale } from "./soap-copy";

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
  locale?: SoapLocale;
};

function levelBadge(level: "green" | "yellow" | "red") {
  if (level === "green") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (level === "yellow") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

function ReportBody({ data, locale }: { data: FinalReportResult; locale: SoapLocale }) {
  const ui = soapWizardCopy(locale);
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
            <Siren className="h-4 w-4" /> {ui.referralPriority}
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {data.criticalAlert?.suspectedCondition ?? ui.dashReferralFallback}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">{ui.dashOverallScore}</h2>
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
          <Link2 className="h-4 w-4" /> {ui.dashLogicAudit}
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
          <BookOpen className="h-4 w-4 text-blue-600" /> {ui.dashCpgCompliance}
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
          <Shield className="h-4 w-4" /> {ui.dashAuditDefense}
        </h3>
        <p className="mt-2 text-sm">{data.auditDefense.feedback}</p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span>{ui.dashDefenseScore}</span>
            <span>{defenseScore}/100</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/70">
            <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${defenseScore}%` }} />
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">{ui.dashImprovement}</p>
          {data.auditDefense.improvementTip}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-700">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> {ui.dashTrajectory}
        </h3>
        <div className="mt-3 flex items-start gap-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-3xl font-black text-emerald-700">{data.predictiveTrajectory.estimatedWeeks}</p>
            <p className="text-xs font-bold text-emerald-600">{ui.dashWeeksLabel}</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{data.predictiveTrajectory.trajectoryText}</p>
        </div>
        {data.hasRedFlag ? (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            {ui.dashRedFlagNote}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 border-t border-slate-200 bg-slate-50/95 px-6 pb-2 pt-4 backdrop-blur-sm lg:-mx-10 lg:px-10">
        <p className="text-[11px] leading-relaxed text-slate-400">{ui.dashDisclaimer}</p>
      </div>
    </div>
  );
}

export default function FinalReportDashboard({ result, isLoading = false, locale = "ko" }: Props) {
  const ui = soapWizardCopy(locale);
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
        <div className="sticky bottom-0 z-10 -mx-6 mt-6 border-t border-slate-200 bg-slate-50/95 px-6 pb-2 pt-4 backdrop-blur-sm lg:-mx-10 lg:px-10">
          <p className="text-[11px] leading-relaxed text-slate-400">{ui.dashDisclaimer}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans lg:p-10">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <p className="text-sm font-semibold">{ui.dashWaiting}</p>
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 mt-auto border-t border-slate-200 bg-slate-50/95 px-6 pb-2 pt-4 backdrop-blur-sm lg:-mx-10 lg:px-10">
          <p className="text-[11px] leading-relaxed text-slate-400">{ui.dashDisclaimer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full animate-in fade-in overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans duration-300 lg:p-10">
      <ReportBody data={result} locale={locale} />
    </div>
  );
}
