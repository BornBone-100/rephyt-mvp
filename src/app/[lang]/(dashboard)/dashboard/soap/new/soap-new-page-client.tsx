"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";
import type { Tables } from "@/types/supabase";

type PatientOption = Pick<Tables<"patients">, "id" | "name" | "diagnosis">;
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type Scorecard = {
  totalScore: number;
  strengths: string[];
  blindspots: string[];
  evidence: string[];
};

type CdssApiResponse = {
  totalScore?: number;
  strengths?: string[];
  blindspots?: string[];
  evidence?: string[];
  error?: string;
};

function SoapContent({ dict }: Props) {
  const d = dict.dashboard.soapNew;
  const params = useParams();
  const currentLang = ((params.lang as string) ?? "ko").toLowerCase();
  const cdssLang = currentLang === "en" ? "en" : "ko";
  const uiText =
    cdssLang === "en"
      ? {
          stepRequired: "Please complete the current step first.",
          allStepsRequired: "Please complete all steps before running AI clinical reasoning.",
          assessing: "Running AI clinical reasoning...",
          proLocked: "🔒 AI Clinical Reasoning (Pro only)",
          scorecardTitle: "Clinical Scorecard",
          strengths: "Strengths",
          blindspots: "Blind Spots",
          evidence: "Latest Evidence Recommendations",
          retry: "Start Again",
          temporaryFallback: "AI connection is temporarily unstable. Showing fallback evaluation result.",
          point: "pts",
          step1Desc: "Enter examination data, functional limits, pain behavior, and objective findings.",
          step2Desc: "Write ICF-based evaluation, problem list, and diagnostic reasoning.",
          step3Desc: "Set short/long-term goals, prognosis, and frequency/duration of care.",
          step4Desc: "Document interventions, dosage/intensity, patient education, and home program.",
        }
      : {
          stepRequired: "현재 단계의 내용을 먼저 입력해 주세요.",
          allStepsRequired: "모든 단계를 입력한 뒤 AI 임상 추론을 실행해 주세요.",
          assessing: "AI 임상 추론 중...",
          proLocked: "🔒 AI 임상 추론 (Pro 전용)",
          scorecardTitle: "임상 평가 성적표",
          strengths: "강점",
          blindspots: "맹점",
          evidence: "최신 근거 추천",
          retry: "다시 작성하기",
          temporaryFallback: "AI 평가 연결에 일시적 문제가 있어 기본 임시 평가 결과를 표시합니다.",
          point: "점",
          step1Desc: "검사 데이터, 기능 제한, 통증 양상, 객관적 소견을 입력하세요.",
          step2Desc: "ICF 기반 평가, 문제 목록, 임상 진단 논리를 작성하세요.",
          step3Desc: "단기/장기 목표, 예후, 치료 빈도와 기간을 설정하세요.",
          step4Desc: "중재 전략, 강도/용량, 환자 교육과 홈프로그램을 기입하세요.",
        };
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");
  const supabase = useMemo(() => createClient(), []);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [currentStep, setCurrentStep] = useState(1);
  const [isMentoring, setIsMentoring] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);

  const [form, setForm] = useState({
    examination: "",
    evaluationDiagnosis: "",
    prognosisPlan: "",
    intervention: "",
  });

  const stepTitles = [
    "Examination",
    "Evaluation & Diagnosis",
    "Prognosis & Plan of Care",
    "Intervention",
  ] as const;

  const stepFields = ["examination", "evaluationDiagnosis", "prognosisPlan", "intervention"] as const;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      try {
        const { data, error } = await supabase.from("patients").select("id, name, diagnosis").order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) throw error;
        setPatients(data ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!patientIdFromUrl) return;
    setSelectedPatientId(patientIdFromUrl);
  }, [patientIdFromUrl]);

  const updateForm = (field: (typeof stepFields)[number], value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = () => {
    const field = stepFields[currentStep - 1];
    return form[field].trim() !== "";
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      alert(uiText.stepRequired);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const buildFallbackScorecard = (): Scorecard => ({
    totalScore: 87,
    strengths: [
      "Examination과 Evaluation 사이의 임상 논리 연결이 명확합니다.",
      "Prognosis 목표가 기능 중심으로 구체화되어 있습니다.",
    ],
    blindspots: [
      "Intervention에 환자 순응도 향상 전략이 추가되면 더 좋습니다.",
      "위험 신호(red flags) 재평가 시점이 명시되지 않았습니다.",
    ],
    evidence: [
      "APTA CPG: 기능 회복 단계별 중재 강도 조절 권고를 반영해 보세요.",
      "최근 체계적 문헌고찰 기준으로 환자 교육 항목을 계획에 포함해 보세요.",
    ],
  });

  const handleCdssMentoring = async () => {
    if (!selectedPatientId) {
      alert(d.alertNoPatient);
      return;
    }
    if (!stepFields.every((field) => form[field].trim())) {
      alert(uiText.allStepsRequired);
      return;
    }

    setIsMentoring(true);
    setShowScorecard(false);

    try {
      const res = await fetch("/api/cdss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examination: form.examination,
          evaluationDiagnosis: form.evaluationDiagnosis,
          prognosisPlan: form.prognosisPlan,
          intervention: form.intervention,
          language: cdssLang,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as CdssApiResponse;
        throw new Error(err.error ?? "CDSS API 요청 실패");
      }

      const data = (await res.json()) as CdssApiResponse;
      setScorecard({
        totalScore: typeof data.totalScore === "number" ? data.totalScore : 0,
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        blindspots: Array.isArray(data.blindspots) ? data.blindspots : [],
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
      });
    } catch (error) {
      console.error(error);
      setScorecard(buildFallbackScorecard());
      alert(uiText.temporaryFallback);
    } finally {
      setIsMentoring(false);
      setShowScorecard(true);
    }
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-zinc-50 p-6 md:p-10">
      <div className="mx-auto w-full max-w-[1700px]">
        <header className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold text-blue-950">{d.pageTitle}</h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">{d.pageSubtitle}</p>
        </header>

        <div className="mx-auto w-full max-w-4xl">
          {!showScorecard ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                {stepTitles.map((title, idx) => {
                  const stepNo = idx + 1;
                  const isActive = currentStep === stepNo;
                  const isDone = currentStep > stepNo;
                  return (
                    <div
                      key={title}
                      className={`rounded-2xl border px-3 py-3 text-center text-xs font-bold transition md:text-sm ${
                        isActive
                          ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                          : isDone
                            ? "border-blue-200 bg-blue-50 text-blue-900"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                    >
                      <p className="text-[11px] uppercase opacity-80">Step {stepNo}</p>
                      <p className="mt-1">{title}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500" htmlFor="soap-new-patient">
                  {d.labelPatientSelect}
                </label>
                <select
                  id="soap-new-patient"
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-4 pr-10 font-bold text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.25rem",
                  }}
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={patientsLoading}
                >
                  <option value="">{patientsLoading ? d.patientsLoading : d.patientPlaceholder}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.diagnosis?.trim() ? ` — ${p.diagnosis.trim()}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-h-[260px]">
                {currentStep === 1 ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="mb-2 text-lg font-black text-blue-950">Examination</h2>
                    <p className="mb-3 text-sm text-zinc-600">{uiText.step1Desc}</p>
                    <textarea
                      value={form.examination}
                      onChange={(e) => updateForm("examination", e.target.value)}
                      className="h-44 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      placeholder="예) ROM 제한, 보행 패턴, 유발 동작, 통증 강도 등"
                    />
                  </div>
                ) : null}

                {currentStep === 2 ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="mb-2 text-lg font-black text-blue-950">Evaluation & Diagnosis</h2>
                    <p className="mb-3 text-sm text-zinc-600">{uiText.step2Desc}</p>
                    <textarea
                      value={form.evaluationDiagnosis}
                      onChange={(e) => updateForm("evaluationDiagnosis", e.target.value)}
                      className="h-44 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      placeholder="예) 활동 제한/참여 제약, 주요 기능장애, 감별 포인트"
                    />
                  </div>
                ) : null}

                {currentStep === 3 ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="mb-2 text-lg font-black text-blue-950">Prognosis & Plan of Care</h2>
                    <p className="mb-3 text-sm text-zinc-600">{uiText.step3Desc}</p>
                    <textarea
                      value={form.prognosisPlan}
                      onChange={(e) => updateForm("prognosisPlan", e.target.value)}
                      className="h-44 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      placeholder="예) 2주/6주 목표, 기능 회복 타임라인, 모니터링 지표"
                    />
                  </div>
                ) : null}

                {currentStep === 4 ? (
                  <div className="animate-in fade-in duration-300">
                    <h2 className="mb-2 text-lg font-black text-blue-950">Intervention</h2>
                    <p className="mb-3 text-sm text-zinc-600">{uiText.step4Desc}</p>
                    <textarea
                      value={form.intervention}
                      onChange={(e) => updateForm("intervention", e.target.value)}
                      className="h-44 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      placeholder="예) 수기치료 + 치료적 운동 + 자가운동 계획 + 재평가 주기"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-zinc-200 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === 1 || isMentoring}
                  className="h-12 rounded-xl border border-zinc-200 bg-white px-5 font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isMentoring}
                    className="h-12 rounded-xl bg-orange-500 px-6 font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    다음
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCdssMentoring()}
                    disabled={isMentoring}
                    className="flex h-14 min-w-[240px] items-center justify-center gap-2 rounded-2xl bg-zinc-700 px-6 font-black text-white shadow-xl transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isMentoring ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {uiText.assessing}
                      </>
                    ) : (
                      uiText.proLocked
                    )}
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="animate-in fade-in duration-300 space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">{uiText.scorecardTitle}</p>
                <h2 className="mt-1 text-2xl font-black">
                  {scorecard?.totalScore ?? "--"}
                  {uiText.point}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="mb-2 text-sm font-black text-blue-950">{uiText.strengths}</h3>
                  <ul className="space-y-2 text-sm text-zinc-700">
                    {(scorecard?.strengths ?? []).map((item) => (
                      <li key={item} className="rounded-lg bg-white px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="mb-2 text-sm font-black text-blue-950">{uiText.blindspots}</h3>
                  <ul className="space-y-2 text-sm text-zinc-700">
                    {(scorecard?.blindspots ?? []).map((item) => (
                      <li key={item} className="rounded-lg bg-white px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="mb-2 text-sm font-black text-blue-950">{uiText.evidence}</h3>
                <ul className="space-y-2 text-sm text-zinc-700">
                  {(scorecard?.evidence ?? []).map((item) => (
                    <li key={item} className="rounded-lg bg-white px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <button
                type="button"
                onClick={() => {
                  setShowScorecard(false);
                  setCurrentStep(1);
                }}
                className="h-12 rounded-xl border border-zinc-200 bg-white px-5 font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                {uiText.retry}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function SoapNewPageClient({ dict }: Props) {
  return (
    <Suspense fallback={<div>{dict.dashboard.soapNew.suspenseLoading}</div>}>
      <SoapContent dict={dict} />
    </Suspense>
  );
}
