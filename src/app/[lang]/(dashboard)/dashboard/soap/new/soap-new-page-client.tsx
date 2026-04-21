"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ClipboardList,
  Activity,
  Target,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Stethoscope as MedicIcon,
  Lock,
  AlertOctagon,
} from "lucide-react";
import type { getDictionary } from "@/dictionaries/getDictionary";
import DashboardRightPanel from "./DashboardRightPanel";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type FormData = {
  patient: string;
  diagnosisArea: string;
  language: string;
  examination: string;
  evaluation: string;
  prognosis: string;
  intervention: string;
};

type RedFlagResult = {
  hasRedFlag: boolean;
  criticalAlert?: {
    title: string;
    suspectedCondition: string;
    reason: string;
    action: string;
  } | null;
  complianceScore: number;
  status: string;
  clinicalReasoning: string;
  overallScore?: number;
  trafficLightFeedback?: Array<{
    level: "green" | "yellow" | "red";
    title: string;
    description: string;
  }>;
  evidenceBasedAlternatives?: Array<{
    type: "special_test" | "intervention";
    title: string;
    description: string;
    citation: string;
  }>;
  detectionMeta?: {
    conditionId: string;
    matchedAliases: string[];
    scoreBreakdown: Record<string, number>;
    tuningVersion: string;
  };
};

const STEP_FIELD_MAP: Record<number, keyof FormData> = {
  1: "examination",
  2: "evaluation",
  3: "prognosis",
  4: "intervention",
};

function RedFlagMentor() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<RedFlagResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    patient: "",
    diagnosisArea: "",
    language: "한국어 + 영문 의학용어",
    examination: "",
    evaluation: "",
    prognosis: "",
    intervention: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVerifyRedFlag = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/cdss-guardrail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Red Flag 분석 요청 실패");
      }

      const data = (await res.json()) as RedFlagResult;
      setEvaluationResult(data);
    } catch (error) {
      console.error(error);
      alert("Red Flag 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendFeedback = async (feedbackType: "true_positive" | "false_positive" | "false_negative") => {
    if (!evaluationResult?.detectionMeta) return;
    try {
      await fetch("/api/cdss-guardrail/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType,
          detectedConditionId: evaluationResult.detectionMeta.conditionId,
          matchedAliases: evaluationResult.detectionMeta.matchedAliases,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const steps = [
    { n: 1, label: "Exam", icon: <ClipboardList className="h-4 w-4" /> },
    { n: 2, label: "Eval", icon: <Activity className="h-4 w-4" /> },
    { n: 3, label: "Goal", icon: <Target className="h-4 w-4" /> },
    { n: 4, label: "Plan", icon: <Stethoscope className="h-4 w-4" /> },
  ];

  const currentField = STEP_FIELD_MAP[step];
  const currentValue = formData[currentField];

  return (
    <div className="flex h-full flex-col bg-slate-50 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <AlertTriangle className="h-6 w-6 text-rose-600" /> Re:PhyT Safety Net
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Medical Screening & Red Flag Detection</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Lock className="h-3 w-3" /> PRO GLOBAL EDITION
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl">
          {!evaluationResult ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-100">
                {steps.map((s) => (
                  <div
                    key={s.n}
                    className={`flex flex-1 flex-col items-center gap-1 py-4 transition-all ${
                      step === s.n ? "border-b-2 border-rose-600 bg-rose-50" : "bg-white"
                    }`}
                  >
                    <div className={step >= s.n ? "text-rose-600" : "text-slate-300"}>{s.icon}</div>
                    <span className={`text-[10px] font-bold uppercase ${step >= s.n ? "text-rose-700" : "text-slate-300"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-10">
                <div className="mb-8">
                  <h2 className="mb-2 text-2xl font-bold text-slate-800">
                    {step === 1 ? "환자 검사 데이터" : step === 2 ? "임상 평가 및 진단" : step === 3 ? "예후 및 치료 목표" : "중재 전략 설정"}
                  </h2>
                  <p className="mb-6 text-sm text-slate-500">
                    입력된 임상 논리를 분석하여 치명적인 Medical Red Flag를 스크리닝합니다.
                  </p>

                  {step === 1 ? (
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">환자 선택</label>
                        <select
                          name="patient"
                          value={formData.patient}
                          onChange={handleInputChange}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        >
                          <option value="">환자를 선택하세요</option>
                          <option value="patient-a">환자 A</option>
                          <option value="patient-b">환자 B</option>
                          <option value="patient-c">환자 C</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">진단 부위</label>
                        <input
                          name="diagnosisArea"
                          value={formData.diagnosisArea}
                          onChange={handleInputChange}
                          placeholder="예: 우측 견갑부"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">출력 언어</label>
                        <select
                          name="language"
                          value={formData.language}
                          onChange={handleInputChange}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        >
                          <option value="한국어 + 영문 의학용어">한국어 + 영문 의학용어</option>
                          <option value="한국어">한국어</option>
                          <option value="영어">영어</option>
                        </select>
                      </div>
                    </div>
                  ) : null}

                  <textarea
                    name={currentField}
                    value={currentValue}
                    onChange={handleChange}
                    className="h-64 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-6 leading-relaxed text-slate-700 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-50/50"
                    placeholder="임상적 근거를 바탕으로 상세 내용을 입력하세요..."
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => step > 1 && setStep(step - 1)}
                    className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${
                      step === 1 ? "pointer-events-none opacity-0" : "text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" /> Previous
                  </button>

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-10 py-4 font-bold text-white shadow-lg shadow-rose-100 transition-all hover:bg-rose-700"
                    >
                      Next Step <ChevronRight className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleVerifyRedFlag()}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 px-10 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      {isAnalyzing ? (
                        <>
                          <Activity className="h-5 w-5 animate-spin" /> Scanning for Red Flags...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5" /> Red Flag & 안전성 검증
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in zoom-in-95 space-y-6 fade-in duration-500">
              {evaluationResult.hasRedFlag ? (
                <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500 bg-white shadow-2xl">
                  <div className="absolute left-0 top-0 h-2 w-full animate-pulse bg-rose-600" />

                  <div className="flex flex-col items-center border-b border-rose-100 bg-rose-50 p-8 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
                      <AlertOctagon className="h-12 w-12 text-rose-600" />
                    </div>
                    <h3 className="mb-2 text-sm font-black uppercase tracking-widest text-rose-600">
                      {evaluationResult.criticalAlert?.title ?? "MEDICAL REFERRAL REQUIRED"}
                    </h3>
                    <div className="text-3xl font-black text-slate-900">
                      {evaluationResult.criticalAlert?.suspectedCondition ?? "의학적 감별 필요 상태"}
                    </div>
                  </div>

                  <div className="space-y-6 p-8">
                    <div className="rounded-2xl border border-rose-200 bg-rose-100/70 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-rose-700">평가 상태</span>
                        <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">
                          평가 중단 (Referral Priority)
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h4 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                        <Activity className="h-5 w-5 text-rose-500" /> 감별 진단 근거 (Clinical Reasoning)
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {evaluationResult.criticalAlert?.reason ?? evaluationResult.clinicalReasoning}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-inner">
                      <h4 className="mb-2 flex items-center gap-2 font-bold text-rose-400">
                        <MedicIcon className="h-5 w-5" /> 즉각적 행동 지침 (Action Required)
                      </h4>
                      <p className="text-sm font-medium leading-relaxed text-slate-200">
                        {evaluationResult.criticalAlert?.action ?? "물리치료를 보류하고 관련 진료과 의뢰를 우선 진행하세요."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEvaluationResult(null)}
                      className="mt-4 w-full rounded-xl bg-rose-100 py-4 font-bold text-rose-700 transition-all hover:bg-rose-200"
                    >
                      의뢰 완료 및 새 케이스 스크리닝
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => void sendFeedback("true_positive")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        판정 정확
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendFeedback("false_positive")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        오탐
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendFeedback("false_negative")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        미탐
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
                  <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
                  <h3 className="text-2xl font-bold text-slate-800">No Critical Red Flags Detected</h3>
                  <p className="mt-2 text-slate-500">입력하신 데이터에서 명확한 내과적 응급상황은 발견되지 않았습니다.</p>
                  <button
                    type="button"
                    onClick={() => setEvaluationResult(null)}
                    className="mt-8 rounded-xl bg-slate-100 px-8 py-3 font-bold text-slate-600"
                  >
                    새로 검증하기
                  </button>
                  <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => void sendFeedback("true_positive")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      판정 정확
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback("false_positive")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      오탐
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback("false_negative")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      미탐
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        <DashboardRightPanel
          result={
            evaluationResult
              ? {
                  hasRedFlag: evaluationResult.hasRedFlag,
                  criticalAlert: evaluationResult.criticalAlert ?? null,
                  clinicalReasoning: evaluationResult.clinicalReasoning,
                  overallScore: evaluationResult.overallScore ?? evaluationResult.complianceScore ?? 0,
                  trafficLightFeedback: evaluationResult.trafficLightFeedback ?? [],
                  evidenceBasedAlternatives: evaluationResult.evidenceBasedAlternatives ?? [],
                }
              : null
          }
        />
      </div>
    </div>
  );
}

export function SoapNewPageClient({ dict: _dict }: Props) {
  return <RedFlagMentor />;
}
