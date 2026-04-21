"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ebpDatabase } from "@/constants/assessmentData";
import RomMmtAssessment, { type RomMmtRecord } from "@/components/RomMmtAssessment";
import type { getDictionary } from "@/dictionaries/getDictionary";
import type { Tables } from "@/types/supabase";

type PatientOption = Pick<Tables<"patients">, "id" | "name" | "diagnosis">;

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type PlanTier = "basic" | "pro" | "enterprise";

function normalizePlanTier(raw: string | null | undefined): PlanTier {
  const t = (raw ?? "basic").toLowerCase();
  if (t === "pro" || t === "trial") return "pro";
  if (t === "enterprise") return "enterprise";
  return "basic";
}

function SoapContent({ dict }: Props) {
  const d = dict.dashboard.soapNew;
  const router = useRouter();
  const routeParams = useParams();
  const lang = routeParams.lang as string;
  const base = `/${lang}`;
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");
  const supabase = useMemo(() => createClient(), []);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [selectedJoint, setSelectedJoint] = useState<keyof typeof ebpDatabase | "">("");
  const [targetLanguage, setTargetLanguage] = useState("ko");
  const [painScale, setPainScale] = useState<string>("5");
  const [historyTaking, setHistoryTaking] = useState("");

  const [treatmentDate, setTreatmentDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const [romMmtRecords, setRomMmtRecords] = useState<RomMmtRecord[]>([]);
  const [specialTests, setSpecialTests] = useState<Record<string, string>>({});

  const [soapData, setSoapData] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [planTier, setPlanTier] = useState<PlanTier>("basic");
  const [planTierLoading, setPlanTierLoading] = useState(true);

  const localeApi = lang === "en" ? "en" : "ko";

  const soapFieldLabels = useMemo(
    () =>
      ({
        subjective: d.soapFieldSubjective,
        objective: d.soapFieldObjective,
        assessment: d.soapFieldAssessment,
        plan: d.soapFieldPlan,
      }) as const,
    [d.soapFieldSubjective, d.soapFieldObjective, d.soapFieldAssessment, d.soapFieldPlan],
  );

  const specialTestOptions = useMemo(
    () => [d.specialTestPositive, d.specialTestNegative] as const,
    [d.specialTestPositive, d.specialTestNegative],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) setPlanTierLoading(false);
          return;
        }
        const { data, error } = await supabase.from("profiles").select("plan_tier").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        setPlanTier(error ? "basic" : normalizePlanTier(data?.plan_tier));
      } catch {
        if (!cancelled) setPlanTier("basic");
      } finally {
        if (!cancelled) setPlanTierLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, name, diagnosis")
          .order("created_at", { ascending: false });
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

  const buildPromptData = () => {
    let rawData = `${d.promptEvalHeader}\n${d.promptChiefJoint} ${selectedJoint.toUpperCase()}\n${d.promptHistory} ${historyTaking}\n${d.promptVas} ${painScale}/10\n\n${d.promptRomMmtSection}\n`;
    romMmtRecords.forEach((r) => {
      rawData += `${d.promptRomLine.replace("{movement}", r.movement).replace("{arom}", r.arom).replace("{prom}", r.prom).replace("{mmt}", r.mmt)}\n`;
    });
    rawData += `\n${d.promptSpecialTests}\n`;
    ebpDatabase[selectedJoint as keyof typeof ebpDatabase]?.forEach((test) => {
      if (specialTests[test.id]) {
        rawData += `${d.promptSpecialLine.replace("{name}", test.name).replace("{result}", specialTests[test.id])}\n`;
      }
    });
    return rawData;
  };

  const handleSoapGeneration = async () => {
    setIsGenerating(true);
    try {
      const requestBody = {
        promptData: buildPromptData(),
        language: targetLanguage,
        locale: localeApi,
      };

      const response = await fetch("/api/ai-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const aiResult = await response.json();
      setSoapData({
        subjective: aiResult.subjective,
        objective: aiResult.objective,
        assessment: aiResult.assessment,
        plan: aiResult.plan,
      });
    } catch {
      alert(d.alertAiFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSoap = async () => {
    if (!selectedPatientId) {
      alert(d.alertNoPatient);
      return;
    }
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("soap_notes").insert([
      {
        patient_id: selectedPatientId,
        created_by: user?.id,
        joint: selectedJoint,
        pain_scale: parseInt(painScale, 10),
        subjective: soapData.subjective,
        objective: soapData.objective,
        assessment: soapData.assessment,
        plan: soapData.plan,
        created_at: new Date(treatmentDate).toISOString(),
      },
    ]);

    if (error) alert(d.alertSaveFailed);
    else {
      alert(d.alertSaveOk);
      router.push(`${base}/dashboard/patients/${selectedPatientId}`);
    }
    setIsSaving(false);
  };

  const handleAiGenerateClick = () => {
    if (planTier === "basic") {
      alert(d.alertProOnly);
      router.push(`${base}/dashboard/pricing`);
      return;
    }
    void handleSoapGeneration();
  };

  const hasSoapContent =
    soapData.subjective.trim() !== "" ||
    soapData.objective.trim() !== "" ||
    soapData.assessment.trim() !== "" ||
    soapData.plan.trim() !== "";

  const handleShareToCommunity = async () => {
    if (!hasSoapContent) {
      alert(d.shareEmptySoap);
      return;
    }
    if (!window.confirm(d.shareConfirm)) return;

    setIsSharing(true);
    try {
      const res = await fetch("/api/community/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalSoap: soapData }),
      });
      const result = (await res.json()) as { success?: boolean; message?: string };
      if (result.success) {
        alert(d.shareSuccess);
      } else {
        alert(result.message ?? d.shareError);
      }
    } catch {
      alert(d.shareError);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 p-6 md:p-10 overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto w-full">
        <header className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold text-blue-950">{d.pageTitle}</h1>
          <p className="mt-1 text-sm text-zinc-600 font-medium">{d.pageSubtitle}</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start w-full">
          <div className="space-y-8 w-full">
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">{d.step1Title}</h2>

              <div className="mb-6">
                <label className="mb-2 block text-xs font-bold uppercase text-zinc-400" htmlFor="soap-new-patient">
                  {d.labelPatientSelect}
                </label>
                <select
                  id="soap-new-patient"
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-10 font-bold text-zinc-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">{d.labelJoint}</label>
                  <select
                    className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 font-bold"
                    value={selectedJoint}
                    onChange={(e) => setSelectedJoint(e.target.value as keyof typeof ebpDatabase | "")}
                  >
                    <option value="">{d.jointPlaceholder}</option>
                    {Object.keys(ebpDatabase).map((k) => (
                      <option key={k} value={k}>
                        {k.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-orange-400 mb-2 uppercase">{d.labelTreatmentDate}</label>
                  <input
                    type="datetime-local"
                    className="w-full h-12 rounded-xl bg-orange-50/50 border border-orange-200 px-4 font-bold text-orange-700 outline-none focus:ring-2 focus:ring-orange-200"
                    value={treatmentDate}
                    onChange={(e) => setTreatmentDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">{d.labelOutputLanguage}</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-200 px-4 font-bold"
                >
                  <option value="ko">{d.langOptionKo}</option>
                  <option value="en">{d.langOptionEn}</option>
                  <option value="ja">{d.langOptionJa}</option>
                  <option value="zh">{d.langOptionZh}</option>
                  <option value="ru">{d.langOptionRu}</option>
                </select>
              </div>

              <label className="block text-sm font-bold mb-2">{d.labelHistoryTaking}</label>
              <textarea
                className="w-full h-24 bg-zinc-50 rounded-xl p-3 text-sm border border-zinc-100"
                value={historyTaking}
                onChange={(e) => setHistoryTaking(e.target.value)}
              />

              <label className="block text-sm font-bold mt-4 mb-2">{d.labelVas.replace("{value}", painScale)}</label>
              <input
                type="range"
                min="0"
                max="10"
                value={painScale}
                onChange={(e) => setPainScale(e.target.value)}
                className="w-full accent-orange-500"
              />
            </section>

            {selectedJoint && (
              <>
                <RomMmtAssessment
                  title={d.step2Title}
                  labels={dict.step2}
                  records={romMmtRecords}
                  onRecordsChange={setRomMmtRecords}
                />
                <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <h2 className="text-lg font-bold text-blue-950 mb-6 border-b pb-2">{d.step3Title}</h2>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {ebpDatabase[selectedJoint]?.map((test) => (
                      <div key={test.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-sm font-bold">
                          {test.name}{" "}
                          <span className="text-[10px] text-blue-500 font-normal">
                            {d.refLabel} {test.paper}
                          </span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          {specialTestOptions.map((res) => (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setSpecialTests({ ...specialTests, [test.id]: res })}
                              className={`flex-1 h-8 rounded-lg text-[10px] font-bold border transition ${
                                specialTests[test.id] === res
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-white border-zinc-200 text-zinc-600"
                              }`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <button
              type="button"
              onClick={handleAiGenerateClick}
              disabled={planTierLoading || isGenerating}
              className={
                planTier === "basic"
                  ? "flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-700 font-black text-white shadow-xl transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  : "flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 font-black text-white shadow-xl transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              {planTierLoading ? (
                <span className="animate-pulse text-sm">{d.planChecking}</span>
              ) : planTier === "basic" ? (
                d.aiProLocked
              ) : isGenerating ? (
                <span className="animate-pulse">{d.aiGenerating}</span>
              ) : (
                d.aiGenerateButton
              )}
            </button>
          </div>

          <div className="space-y-4 xl:sticky xl:top-10 w-full">
            <h2 className="text-xl font-black text-blue-950 mb-4 flex items-center gap-2">
              <span className="bg-orange-500 w-2 h-8 rounded-full" />
              {d.resultHeading}
            </h2>
            {(["subjective", "objective", "assessment", "plan"] as const).map((key) => (
              <div key={key}>
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <label className="mb-2 block text-xs font-black uppercase text-orange-500">{soapFieldLabels[key]}</label>
                  <textarea
                    value={soapData[key]}
                    onChange={(e) => setSoapData({ ...soapData, [key]: e.target.value })}
                    className="h-32 w-full resize-none rounded-2xl border-none bg-zinc-50/50 p-4 text-sm text-zinc-800 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSaveSoap}
              disabled={isSaving}
              className="w-full h-16 bg-blue-950 text-white rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all mt-6"
            >
              {isSaving ? d.saving : d.saveButton}
            </button>

            <div className="mt-8 flex justify-end border-t border-zinc-200 pt-6">
              <button
                type="button"
                onClick={() => void handleShareToCommunity()}
                disabled={isSharing}
                className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSharing ? d.shareButtonLoading : d.shareButton}
              </button>
            </div>
          </div>
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
