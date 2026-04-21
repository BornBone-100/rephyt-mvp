"use client";

import { CheckCircle, AlertTriangle, Octagon, Lightbulb, BookOpen, Award, ChevronRight, Siren, Sparkles } from "lucide-react";

type TrafficLightItem = {
  level: "green" | "yellow" | "red";
  title: string;
  description: string;
};

type AlternativeItem = {
  type: "special_test" | "intervention";
  title: string;
  description: string;
  citation: string;
};

export type DashboardResult = {
  hasRedFlag?: boolean;
  criticalAlert?: {
    title: string;
    suspectedCondition: string;
    reason: string;
    action: string;
  } | null;
  clinicalReasoning?: string;
  overallScore: number;
  trafficLightFeedback: TrafficLightItem[];
  evidenceBasedAlternatives: AlternativeItem[];
};

type Props = {
  result?: DashboardResult | null;
};

export default function DashboardRightPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="h-full w-full overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans lg:p-10">
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 text-center shadow-sm">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Sparkles className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold leading-relaxed text-slate-500">
              좌측 폼에 환자 데이터를 입력하고 AI 분석을 요청해 주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const data = result;
  const isReferralPriority = Boolean(data.hasRedFlag);

  return (
    <div className="h-full w-full animate-in fade-in overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 font-sans duration-300 lg:p-10">
      {isReferralPriority ? (
        <div className="mb-8 rounded-3xl border-2 border-rose-300 bg-rose-50 p-8 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-rose-700">
            <Siren className="h-6 w-6" /> Critical Referral Status
          </h2>
          <p className="mt-2 text-sm font-semibold text-rose-600">평가 중단 (Referral Priority)</p>
          <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
              {data.criticalAlert?.title ?? "Medical Referral Required"}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">{data.criticalAlert?.suspectedCondition ?? "의학적 감별 우선"}</p>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <Award className="h-6 w-6 text-blue-600" /> Clinical Logic Score
            </h2>
            <p className="mt-1 text-sm text-slate-500">APTA/JOSPT 가이드라인 부합도</p>
          </div>

          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-8 border-blue-500 bg-blue-50">
            <span className="text-3xl font-black text-blue-700">{data.overallScore}</span>
          </div>
        </div>
      )}

      {isReferralPriority ? (
        <div className="rounded-3xl border-2 border-rose-300 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-rose-700">의뢰 체크리스트</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="font-bold text-rose-700">1) 물리치료 중재 즉시 보류</p>
              <p className="mt-1 text-slate-600">통증 유발/강화 중재를 중단하고 추가 스크리닝 우선</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="font-bold text-rose-700">2) 의뢰 안내 및 문서화</p>
              <p className="mt-1 text-slate-600">의심 질환, 근거, 권고 진료과를 환자/보호자에게 명확히 전달</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="font-bold text-rose-700">3) Follow-up 계획 수립</p>
              <p className="mt-1 text-slate-600">의뢰 결과 확인 후 재평가 시점과 재내원 기준 설정</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clinical Note</p>
            <p className="mt-1 text-sm text-slate-700">{data.clinicalReasoning ?? data.criticalAlert?.reason ?? "-"}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="mb-4 px-2 text-sm font-bold uppercase tracking-wider text-slate-400">CPG Guardrail Feedback</h3>
            <div className="space-y-4">
              {data.trafficLightFeedback.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className={`flex gap-4 rounded-2xl border p-6 transition-all hover:shadow-md ${
                    item.level === "green"
                      ? "border-emerald-100 bg-emerald-50"
                      : item.level === "yellow"
                        ? "border-amber-100 bg-amber-50"
                        : "border-rose-100 bg-rose-50"
                  }`}
                >
                  <div className="mt-1 shrink-0">
                    {item.level === "green" && <CheckCircle className="h-7 w-7 text-emerald-500" />}
                    {item.level === "yellow" && <AlertTriangle className="h-7 w-7 text-amber-500" />}
                    {item.level === "red" && <Octagon className="h-7 w-7 text-rose-500" />}
                  </div>
                  <div>
                    <h4
                      className={`mb-1 text-base font-bold ${
                        item.level === "green"
                          ? "text-emerald-800"
                          : item.level === "yellow"
                            ? "text-amber-800"
                            : "text-rose-800"
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p
                      className={`text-sm leading-relaxed ${
                        item.level === "green"
                          ? "text-emerald-700"
                          : item.level === "yellow"
                            ? "text-amber-700"
                            : "text-rose-700"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center gap-2 px-2 text-sm font-bold uppercase tracking-wider text-slate-400">
              <Lightbulb className="h-4 w-4 text-blue-500" /> Alternative Suggestions
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {data.evidenceBasedAlternatives.map((alt, index) => (
                <div
                  key={`${alt.title}-${index}`}
                  className="group cursor-default rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-blue-300"
                >
                  <h4 className="mb-2 flex items-center gap-2 font-bold text-slate-800">{alt.title}</h4>
                  <p className="mb-4 text-sm leading-relaxed text-slate-600">{alt.description}</p>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      <BookOpen className="h-3 w-3" /> {alt.citation}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
