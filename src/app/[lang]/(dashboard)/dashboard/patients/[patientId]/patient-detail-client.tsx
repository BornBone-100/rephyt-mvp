"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchCdssTimelineRows } from "@/lib/timeline/fetch-cdss-guardrail-timeline";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";
import type { getDictionary } from "@/dictionaries/getDictionary";
import { PastSoapCard } from "./past-soap-card";
import SOAPExportButton from "@/components/SOAPExportButton";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type ManualTherapyEntry = {
  name: string;
  grade: "Grade I" | "Grade II" | "Grade III" | "Grade IV" | "Grade V" | "Soft Tissue" | "Neural";
  minutes: string;
};

type TherapeuticExerciseEntry = {
  name: string;
  sets: string;
  reps: string;
  holdSec: string;
};

type ModalityEntry = {
  modality: "Hot/Cold Pack" | "Ultrasound" | "TENS/ICT" | "Traction" | "ESWT" | "Laser";
  target: string;
};

type TimelineLog = {
  id: string;
  user_id?: string | null;
  created_at: string;
  overall_score: number | null;
  has_red_flag: boolean | null;
  detected_condition_id: string | null;
  diagnosis_area: string | null;
  logic_audit: unknown;
  clinical_reasoning?: string | null;
  differential_diagnosis?: string | null;
  intervention_strategy?: string | null;
  professional_discussion?: string | null;
  cpg_compliance?: unknown;
  audit_defense?: unknown;
  predictive_trajectory?: unknown;
  compliance_score?: number | null;
  payload: Record<string, unknown> | null;
};

type OriginalAssessmentSections = {
  step1Exam: string;
  step2Evaluation: string;
  step3GoalRows: Array<{
    motion: string;
    left: string;
    right: string;
    center: string;
  }>;
  step4Plan: string;
};

function mergeTimelineLogsById(prev: TimelineLog[], nextRows: TimelineLog[]): TimelineLog[] {
  const map = new Map<string, TimelineLog>();
  for (const item of prev) map.set(item.id, item);
  for (const item of nextRows) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

const MANUAL_GRADE_OPTIONS: ManualTherapyEntry["grade"][] = [
  "Grade I",
  "Grade II",
  "Grade III",
  "Grade IV",
  "Grade V",
  "Soft Tissue",
  "Neural",
];

const MODALITY_OPTIONS: ModalityEntry["modality"][] = [
  "Hot/Cold Pack",
  "Ultrasound",
  "TENS/ICT",
  "Traction",
  "ESWT",
  "Laser",
];

function formatPlanToTreatmentLog(plan: string | null): string {
  if (!plan) return "";
  const lines = plan
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const formatted: string[] = [];

  for (const line of lines) {
    if (/^\d+\.\s/.test(line) && line.includes("|")) {
      const body = line.replace(/^\d+\.\s*/, "");
      if (body.includes("Grade")) {
        const [name, grade, minutesRaw] = body.split("|").map((v) => v.trim());
        const minutes = minutesRaw?.replace("분", "min") ?? "-";
        formatted.push(`[Manual] ${name} ${grade} (${minutes})`);
        continue;
      }
      if (body.includes("Sets x")) {
        const [name, volumeRaw] = body.split("|").map((v) => v.trim());
        const volume = volumeRaw
          ?.replace(" Sets x ", "sets/")
          .replace(" Reps", "reps")
          .replace(/ x Hold .*$/, "")
          .trim();
        formatted.push(`[Exercise] ${name} ${volume ?? ""}`.trim());
        continue;
      }
      if (body.includes("적용 부위:")) {
        const [modality, targetRaw] = body.split("|").map((v) => v.trim());
        const target = targetRaw?.replace("적용 부위:", "").trim() ?? "-";
        formatted.push(`[Modalities] ${modality} (${target})`);
      }
    } else if (!line.startsWith("[") && line !== "- 없음") {
      formatted.push(`[Education] ${line}`);
    }
  }

  return formatted.join("\n");
}

function extractCautionNote(note: Tables<"soap_notes"> | null): string | null {
  if (!note) return null;
  const raw = [note.ai_generated_note, note.assessment, note.plan]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
  if (!raw) return null;
  const cautionLines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        /low-value|missing level a|safety concern|yellow|red|경고|주의|삭감|금기/i.test(line),
    );
  if (cautionLines.length === 0) return null;
  return cautionLines[0];
}

function formatStep4TreatmentText(
  manualEntries: ManualTherapyEntry[],
  exerciseEntries: TherapeuticExerciseEntry[],
  modalityEntries: ModalityEntry[],
  educationHep: string,
): string {
  const manualLines = manualEntries
    .filter((m) => m.name.trim())
    .map((m) => `[Manual] ${m.name.trim()} ${m.grade} (${(m.minutes || "-").trim()}분)`);
  const exerciseLines = exerciseEntries
    .filter((e) => e.name.trim())
    .map((e) => {
      const sets = (e.sets || "-").trim();
      const reps = (e.reps || "-").trim();
      const hold = e.holdSec.trim();
      return `[Exercise] ${e.name.trim()} (${sets}set/${reps}rep${hold ? `/${hold}s` : ""})`;
    });
  const modalityLines = modalityEntries
    .filter((m) => m.modality.trim())
    .map((m) => `[Modalities] ${m.modality} (${m.target.trim() || "-"})`);
  const educationLines = educationHep
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `[Education] ${line}`);
  return [...manualLines, ...exerciseLines, ...modalityLines, ...educationLines].join("\n").trim();
}

function parseTreatmentTextToStep4(text: string): {
  manual: ManualTherapyEntry[];
  exercise: TherapeuticExerciseEntry[];
  modalities: ModalityEntry[];
  education: string;
} {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const manual: ManualTherapyEntry[] = [];
  const exercise: TherapeuticExerciseEntry[] = [];
  const modalities: ModalityEntry[] = [];
  const educationLines: string[] = [];

  for (const line of lines) {
    const manualMatch = line.match(
      /^\[Manual\]\s*(.+?)\s(Grade I|Grade II|Grade III|Grade IV|Grade V|Soft Tissue|Neural)\s*\(([^)]+)\)\s*$/i,
    );
    if (manualMatch) {
      manual.push({
        name: manualMatch[1].trim(),
        grade: manualMatch[2] as ManualTherapyEntry["grade"],
        minutes: manualMatch[3].replace(/min|분/gi, "").trim(),
      });
      continue;
    }

    const exerciseMatch = line.match(/^\[Exercise\]\s*(.+?)\s*\((.+)\)\s*$/i);
    if (exerciseMatch) {
      const volume = exerciseMatch[2];
      const setsMatch = volume.match(/(\d+)\s*set[s]?/i);
      const repsMatch = volume.match(/(\d+)\s*rep[s]?/i);
      const holdMatch = volume.match(/(?:\/|^)(\d+)\s*s(?:\/|$)/i);
      exercise.push({
        name: exerciseMatch[1].trim(),
        sets: setsMatch?.[1] ?? "",
        reps: repsMatch?.[1] ?? "",
        holdSec: holdMatch?.[1] ?? "",
      });
      continue;
    }

    const modalityMatch = line.match(/^\[Modalities\]\s*(.+?)\s*\((.*)\)\s*$/i);
    if (modalityMatch) {
      const modality = modalityMatch[1].trim();
      modalities.push({
        modality: MODALITY_OPTIONS.includes(modality as ModalityEntry["modality"])
          ? (modality as ModalityEntry["modality"])
          : "TENS/ICT",
        target: modalityMatch[2].trim(),
      });
      continue;
    }

    const educationMatch = line.match(/^\[Education\]\s*(.*)$/i);
    if (educationMatch) {
      educationLines.push(educationMatch[1].trim());
      continue;
    }

    educationLines.push(line);
  }

  return {
    manual,
    exercise,
    modalities,
    education: educationLines.join("\n").trim(),
  };
}

function normalizePatientId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // UUID는 대소문자 구분 이슈를 피하기 위해 소문자로 정규화한다.
  if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

function sanitizeFileNameSegment(raw: string): string {
  return raw.replace(/[/\\?%*:|"<>]/g, "_").trim() || "timeline-report";
}

function safeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function joinList(values: unknown): string {
  if (!Array.isArray(values)) return "";
  return values
    .map((value) => safeText(value))
    .filter(Boolean)
    .join(", ");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickFirstText(...values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function formatRomLine(sideRow: Record<string, unknown> | null): string {
  if (!sideRow) return "";
  const arom = safeText(sideRow.arom);
  const prom = safeText(sideRow.prom);
  const endFeel = safeText(sideRow.endFeel);
  const mmt = safeText(sideRow.mmt);
  const parts = [
    arom ? `AROM ${arom}` : "",
    prom ? `PROM ${prom}` : "",
    endFeel ? `End-feel ${endFeel}` : "",
    mmt ? `MMT ${mmt}` : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

function extractOriginalAssessmentData(log: TimelineLog): OriginalAssessmentSections {
  const payload = log.payload;
  const requestPayload = asRecord(payload?.request_payload);
  const originalData = asRecord(payload?.original_data) ?? asRecord(requestPayload?.original_data);
  const assessmentData = asRecord(payload?.assessment_data) ?? asRecord(requestPayload?.assessment_data);
  const assessmentStep1 = asRecord(assessmentData?.step1);
  const assessmentStep2 = asRecord(assessmentData?.step2);
  const assessmentStep3 = asRecord(assessmentData?.step3);
  const assessmentStep4 = asRecord(assessmentData?.step4);
  const examDraft = asRecord(payload?.examDraft) ?? asRecord(requestPayload?.examDraft);
  const step1 = asRecord(payload?.step1) ?? asRecord(requestPayload?.step1);

  const root = requestPayload ?? payload ?? {};
  const sourceChain = [originalData, assessmentStep1, assessmentStep2, assessmentStep4, assessmentData, examDraft, step1, root].filter(
    (v): v is Record<string, unknown> => Boolean(v),
  );

  const pickFromSources = (...keys: string[]) => {
    for (const src of sourceChain) {
      for (const key of keys) {
        const val = safeText(src[key]);
        if (val) return val;
      }
    }
    return "";
  };

  const step1Exam = [pickFirstText(originalData?.exam), pickFromSources("chiefComplaint"), pickFromSources("examination")]
    .filter(Boolean)
    .join("\n");

  const onset = pickFromSources("onset");
  const trauma = pickFromSources("traumaType");
  const step2BodyPart = pickFirstText(assessmentStep2?.body_part, assessmentStep2?.diagnosisArea);
  const reasoning = pickFirstText(originalData?.evaluation, assessmentStep2?.evaluation, pickFromSources("evaluation"));
  const step2Evaluation = [
    step2BodyPart ? `평가 부위: ${step2BodyPart}` : "",
    onset || trauma ? [onset, trauma].filter(Boolean).join(" / ") : "",
    reasoning,
  ]
    .filter(Boolean)
    .join("\n");

  const romAssessment =
    asRecord(assessmentStep3?.rom_assessment) ??
    asRecord(root.rom_assessment) ??
    asRecord(assessmentData?.rom_assessment) ??
    asRecord(originalData?.rom_assessment);
  const romData = asRecord(romAssessment?.data) ?? {};
  const motionsRaw = Array.isArray(romAssessment?.motions) ? romAssessment?.motions : Object.keys(romData);
  const motions = motionsRaw.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
  const step3GoalRows = motions.map((motion) => {
    const motionRow = asRecord(romData[motion]);
    const leftRow = asRecord(motionRow?.left);
    const rightRow = asRecord(motionRow?.right);
    return {
      motion,
      left: formatRomLine(leftRow),
      right: formatRomLine(rightRow),
      center: formatRomLine(leftRow) || formatRomLine(rightRow),
    };
  });

  const aggravating = pickFromSources("aggravatingFactors");
  const relieving = pickFromSources("relievingFactors");
  const planText = pickFirstText(originalData?.plan, assessmentStep4?.plan, pickFromSources("intervention"));
  const step4Plan = [
    aggravating ? `악화 요인: ${aggravating}` : "",
    relieving ? `완화 요인: ${relieving}` : "",
    planText ? `중재 계획: ${planText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    step1Exam,
    step2Evaluation,
    step3GoalRows,
    step4Plan,
  };
}

export function PatientDetailClient({ dict }: Props) {
  const pd = dict.dashboard.patients;
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = params.lang as string;
  const isEnglish = lang === "en";
  const base = `/${lang}`;
  /** 차트·타임라인·저장 조회에 공통으로 쓰는 환자 ID (URL useParams 단일 진실 공급원) */
  const chartPatientId = useMemo(
    () => {
      const raw = String((params.patientId as string) ?? "");
      try {
        return normalizePatientId(decodeURIComponent(raw));
      } catch {
        return normalizePatientId(raw);
      }
    },
    [params.patientId],
  );
  const reportIdFromQuery = useMemo(() => {
    const raw = searchParams.get("reportId");
    return raw ? String(raw).trim() : "";
  }, [searchParams]);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const localeApi = lang === "en" ? "en" : "ko";

  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [soapNotes, setSoapNotes] = useState<Tables<"soap_notes">[]>([]);
  const [treatments, setTreatments] = useState<Tables<"treatments">[]>([]);
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [authorProfileMap, setAuthorProfileMap] = useState<Record<string, { name?: string; hospital?: string; specialties?: string[] }>>({});
  const [isTimelineLogsLoading, setIsTimelineLogsLoading] = useState(false);
  const [screeningRefreshTick, setScreeningRefreshTick] = useState(0);
  const [sharingTimelineIds, setSharingTimelineIds] = useState<Record<string, boolean>>({});
  const [originalDataModalLog, setOriginalDataModalLog] = useState<TimelineLog | null>(null);
  const isTimelineFetchInFlightRef = useRef(false);
  const lastTimelineFetchAtRef = useRef(0);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"soap" | "treatment">("soap");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);
  const [didTouchTreatmentInput, setDidTouchTreatmentInput] = useState(false);
  const [draftFromScreening, setDraftFromScreening] = useState<string>("");
  const [manualDraft, setManualDraft] = useState<ManualTherapyEntry>({
    name: "",
    grade: "Grade III",
    minutes: "",
  });
  const [manualEntries, setManualEntries] = useState<ManualTherapyEntry[]>([]);
  const [exerciseDraft, setExerciseDraft] = useState<TherapeuticExerciseEntry>({
    name: "",
    sets: "",
    reps: "",
    holdSec: "",
  });
  const [exerciseEntries, setExerciseEntries] = useState<TherapeuticExerciseEntry[]>([]);
  const [modalityDraft, setModalityDraft] = useState<ModalityEntry>({
    modality: "TENS/ICT",
    target: "",
  });
  const [modalityEntries, setModalityEntries] = useState<ModalityEntry[]>([]);
  const [educationHep, setEducationHep] = useState("");

  const fetchTimelineLogs = useCallback(async (force = false) => {
    if (!chartPatientId || chartPatientId === "null" || chartPatientId === "undefined") return;
    if (isTimelineFetchInFlightRef.current) return;
    const now = Date.now();
    if (!force && now - lastTimelineFetchAtRef.current < 300) return;
    lastTimelineFetchAtRef.current = now;
    isTimelineFetchInFlightRef.current = true;
    setIsTimelineLogsLoading(true);
    try {
      const { rows, error } = await fetchCdssTimelineRows(supabase, chartPatientId);
      if (error) {
        console.error("Fetch Error:", error.message);
        setTimelineLogs([]);
        return;
      }
      console.log("🔄 [FETCH] 타임라인 다시 가져옴. 데이터 개수:", rows.length);
      setTimelineLogs((prev) => mergeTimelineLogsById(prev, rows as TimelineLog[]));
      setScreeningRefreshTick((prev) => prev + 1);
    } catch (error) {
      console.error("Fetch Error:", error);
      setTimelineLogs([]);
    } finally {
      isTimelineFetchInFlightRef.current = false;
      setIsTimelineLogsLoading(false);
    }
  }, [chartPatientId, supabase]);

  const fetchPatientAndRecords = useCallback(async () => {
    if (!chartPatientId || chartPatientId === "null" || chartPatientId === "undefined") {
      console.warn("환자 ID가 정상적으로 전달되지 않았습니다.");
      setIsLoading(false); return;
    }
    setIsLoading(true);

    try {
      const { data: patientData, error: patientError } = await supabase
        .from("patients").select("*").eq("id", chartPatientId).maybeSingle();

      if (patientError) throw patientError;
      if (!patientData) throw new Error(`DB에서 해당 환자를 찾을 수 없습니다.`);
      setPatient(patientData);

      const { data: soapData } = await supabase
        .from("soap_notes").select("*").eq("patient_id", chartPatientId).order("created_at", { ascending: false });
      if (soapData) setSoapNotes(soapData);

      const { data: treatmentData } = await supabase
        .from("treatments").select("*").eq("patient_id", chartPatientId).order("created_at", { ascending: false });
      if (treatmentData) setTreatments(treatmentData);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "데이터베이스 오류가 발생했습니다.";
      console.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [chartPatientId, supabase]);

  useEffect(() => {
    if (!chartPatientId || chartPatientId === "null" || chartPatientId === "undefined") return;
    void fetchPatientAndRecords();
    void fetchTimelineLogs(true);
  }, [chartPatientId, fetchPatientAndRecords, fetchTimelineLogs]);

  useEffect(() => {
    if (!chartPatientId || chartPatientId === "null" || chartPatientId === "undefined") return;
    const filter = `patient_id=eq.${chartPatientId}`;
    const channel = supabase
      .channel(`cdss-guardrail-timeline-${chartPatientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cdss_guardrail_logs", filter },
        () => {
          void fetchTimelineLogs();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTimelineLogs, chartPatientId]);

  useEffect(() => {
    const authorIds = Array.from(
      new Set(
        timelineLogs
          .map((row) => (typeof row.user_id === "string" ? row.user_id.trim() : ""))
          .filter(Boolean),
      ),
    );
    if (authorIds.length === 0) {
      setAuthorProfileMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, name, hospital_name, specialties, metadata")
        .in("id", authorIds);
      if (cancelled) return;
      const rows = Array.isArray(data) ? data : [];
      const next = rows.reduce<Record<string, { name?: string; hospital?: string; specialties?: string[] }>>((acc, row: any) => {
        const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
        acc[String(row.id)] = {
          name: typeof row?.name === "string" ? row.name : typeof metadata?.name === "string" ? metadata.name : undefined,
          hospital:
            typeof row?.hospital_name === "string"
              ? row.hospital_name
              : typeof metadata?.hospital_name === "string"
                ? metadata.hospital_name
                : undefined,
          specialties:
            Array.isArray(row?.specialties)
              ? row.specialties
              : Array.isArray(metadata?.specialties)
                ? metadata.specialties
                : [],
        };
        return acc;
      }, {});
      setAuthorProfileMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, timelineLogs]);

  useEffect(() => {
    if (!reportIdFromQuery || timelineLogs.length === 0) return;
    const target = timelineLogs.find((item) => item.id === reportIdFromQuery);
    if (target) {
      setOriginalDataModalLog(target);
    }
  }, [reportIdFromQuery, timelineLogs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = async (event: Event) => {
      const custom = event as CustomEvent<{ patientId?: string }>;
      const eventPatientId = custom.detail?.patientId
        ? normalizePatientId(String(custom.detail.patientId))
        : "";
      if (eventPatientId && eventPatientId !== chartPatientId) return;
      await fetchTimelineLogs(true);
    };
    window.addEventListener("rephyt:timeline-log-saved", handler);
    return () => {
      window.removeEventListener("rephyt:timeline-log-saved", handler);
    };
  }, [fetchTimelineLogs, chartPatientId]);

  const latestSoap = soapNotes[0] ?? null;
  const autoPlanPrefill = useMemo(() => formatPlanToTreatmentLog(latestSoap?.plan ?? null), [latestSoap?.plan]);
  const cautionFromLatestSoap = useMemo(() => extractCautionNote(latestSoap), [latestSoap]);

  useEffect(() => {
    if (typeof window === "undefined" || !chartPatientId) return;
    try {
      const raw = window.localStorage.getItem(`rephyt:treatment-draft:${chartPatientId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { content?: string; cautions?: string[] };
      const cautionLines = (parsed.cautions ?? []).map((line) => `[주의사항] ${line}`);
      const merged = [parsed.content ?? "", ...cautionLines].filter(Boolean).join("\n");
      setDraftFromScreening(merged);
    } catch (error) {
      console.error("treatment draft parse error:", error);
    }
  }, [chartPatientId]);

  const isStep4InputEmpty =
    manualEntries.length === 0 &&
    exerciseEntries.length === 0 &&
    modalityEntries.length === 0 &&
    !educationHep.trim();

  const formattedTreatment = useMemo(
    () => formatStep4TreatmentText(manualEntries, exerciseEntries, modalityEntries, educationHep),
    [educationHep, exerciseEntries, manualEntries, modalityEntries],
  );

  useEffect(() => {
    if (activeTab !== "treatment") return;
    if (didTouchTreatmentInput) return;
    if (!isStep4InputEmpty) return;
    const lines = [autoPlanPrefill];
    if (draftFromScreening) {
      lines.unshift(draftFromScreening);
    }
    if (cautionFromLatestSoap) {
      lines.push(`[주의사항] ${cautionFromLatestSoap}`);
    }
    const prefill = lines.filter(Boolean).join("\n");
    if (prefill) {
      const parsed = parseTreatmentTextToStep4(prefill);
      setManualEntries(parsed.manual);
      setExerciseEntries(parsed.exercise);
      setModalityEntries(parsed.modalities);
      setEducationHep(parsed.education);
    }
  }, [
    activeTab,
    autoPlanPrefill,
    cautionFromLatestSoap,
    didTouchTreatmentInput,
    draftFromScreening,
    isStep4InputEmpty,
  ]);

  const addManualEntry = () => {
    if (!manualDraft.name.trim()) return;
    setDidTouchTreatmentInput(true);
    setManualEntries((prev) => [...prev, { ...manualDraft, name: manualDraft.name.trim() }]);
    setManualDraft((prev) => ({ ...prev, name: "", minutes: "" }));
  };

  const addExerciseEntry = () => {
    if (!exerciseDraft.name.trim()) return;
    setDidTouchTreatmentInput(true);
    setExerciseEntries((prev) => [...prev, { ...exerciseDraft, name: exerciseDraft.name.trim() }]);
    setExerciseDraft({ name: "", sets: "", reps: "", holdSec: "" });
  };

  const addModalityEntry = () => {
    setDidTouchTreatmentInput(true);
    setModalityEntries((prev) => [...prev, { ...modalityDraft, target: modalityDraft.target.trim() }]);
    setModalityDraft((prev) => ({ ...prev, target: "" }));
  };

  const handleAddTreatment = async () => {
    if (!formattedTreatment.trim()) return;
    setIsSubmittingTreatment(true);
    const { data: { user } } = await supabase.auth.getUser();
    const contentToSave = formattedTreatment.trim();

    const { error } = await supabase.from("treatments").insert([{
      patient_id: chartPatientId,
      content: contentToSave,
      created_by: user?.id
    }]);

    if (!error) {
      setManualEntries([]);
      setExerciseEntries([]);
      setModalityEntries([]);
      setEducationHep("");
      setManualDraft({ name: "", grade: "Grade III", minutes: "" });
      setExerciseDraft({ name: "", sets: "", reps: "", holdSec: "" });
      setModalityDraft({ modality: "TENS/ICT", target: "" });
      setDidTouchTreatmentInput(false);
      const optimistic: Tables<"treatments"> = {
        id: crypto.randomUUID(),
        patient_id: chartPatientId,
        content: contentToSave,
        created_by: user?.id ?? null,
        created_at: new Date().toISOString(),
      };
      setTreatments((prev) => [optimistic, ...prev]);
    } else {
      alert("처치 기록 저장 실패: " + error.message);
    }
    setIsSubmittingTreatment(false);
  };

  // 🗑️ 처치 내역 삭제 함수
  const handleDeleteTreatment = async (logId: string) => {
    if (!confirm("정말로 이 처치 내역을 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("treatments")
      .delete()
      .eq("id", logId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("삭제되었습니다.");
      fetchPatientAndRecords();
    }
  };

  const sortedNotes = sortOrder === "desc" ? [...soapNotes] : [...soapNotes].reverse();
  const timelineCount = soapNotes.length + timelineLogs.length;
  const screeningReportTimelineLoading =
    isTimelineLogsLoading && soapNotes.length === 0 && timelineLogs.length === 0;
  const screeningReportTimelineEmpty =
    !isTimelineLogsLoading && soapNotes.length === 0 && timelineLogs.length === 0;

  const pastSoapShareCopy = useMemo(
    () => ({
      soapSharePastConfirm: pd.soapSharePastConfirm,
      soapSharePastEmpty: pd.soapSharePastEmpty,
      soapSharePastSuccess: pd.soapSharePastSuccess,
      soapSharePastError: pd.soapSharePastError,
      soapSharePastButton: pd.soapSharePastButton,
      soapSharePastButtonLoading: pd.soapSharePastButtonLoading,
      soapSharePastAlreadyShared: pd.soapSharePastAlreadyShared,
      soapDetailPdfLink: pd.soapDetailPdfLink,
    }),
    [
      pd.soapSharePastConfirm,
      pd.soapSharePastEmpty,
      pd.soapSharePastSuccess,
      pd.soapSharePastError,
      pd.soapSharePastButton,
      pd.soapSharePastButtonLoading,
      pd.soapSharePastAlreadyShared,
      pd.soapDetailPdfLink,
    ],
  );

  const handlePastSoapSharedSuccess = useCallback((noteId: string) => {
    setSoapNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, is_shared: true } : n)));
  }, []);

  const handleShareTimelineCase = useCallback(
    async (item: TimelineLog) => {
      const challengeTitle = item.diagnosis_area || item.detected_condition_id || "Clinical Reasoning Challenge";
      const defenseHighlight =
        (typeof item.audit_defense === "object" &&
          item.audit_defense !== null &&
          typeof (item.audit_defense as { feedback?: unknown }).feedback === "string" &&
          (item.audit_defense as { feedback?: string }).feedback) ||
        (typeof item.logic_audit === "object" &&
          item.logic_audit !== null &&
          typeof (item.logic_audit as { feedback?: unknown }).feedback === "string" &&
          (item.logic_audit as { feedback?: string }).feedback) ||
        "";
      if (!window.confirm(pd.soapSharePastConfirm)) return;

      setSharingTimelineIds((prev) => ({ ...prev, [item.id]: true }));
      try {
        const res = await fetch("/api/community/report-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "defense_tip",
            payload: {
              challengeTitle,
              defenseHighlight,
              anonymousData: {
                diagnosisArea: item.diagnosis_area,
                hasRedFlag: item.has_red_flag,
                overallScore: item.overall_score,
                complianceScore: item.compliance_score,
              },
              overallScore: item.overall_score ?? 0,
              defenseScore: item.compliance_score ?? 0,
            },
          }),
        });
        const result = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
        if (!result.success) {
          alert(result.message ?? pd.soapSharePastError);
          return;
        }
        alert(pd.soapSharePastSuccess);
      } catch {
        alert(pd.soapSharePastError);
      } finally {
        setSharingTimelineIds((prev) => ({ ...prev, [item.id]: false }));
      }
    },
    [pd.soapSharePastConfirm, pd.soapSharePastError, pd.soapSharePastSuccess],
  );

  const isFirstVisit = patient?.is_first_visit === true;
  const hasPriorCareElsewhere = patient?.is_first_visit === false;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center font-bold text-blue-900 animate-pulse">차트와 타임라인을 동기화하는 중입니다...</div>;
  if (!patient) return <div className="flex min-h-screen items-center justify-center font-bold text-red-500">환자 데이터를 불러오지 못했습니다. 목록으로 돌아가주세요.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 pb-32">
      <div className="mb-8">
        <Link href={`${base}/dashboard/patients`} className="inline-flex items-center text-sm font-bold text-zinc-500 hover:text-zinc-900 mb-4 transition">&larr; 환자 목록으로</Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-blue-950">{patient.name} 환자 차트</h1>
          <Link href={`${base}/dashboard/soap/new?patientId=${patient.id}`}>
            <button className="h-12 rounded-xl bg-orange-500 px-6 font-bold text-white shadow-lg transition hover:bg-orange-600">+ 스크리닝 리포트 생성</button>
          </Link>
        </div>
      </div>

      {/* 환자 기본 정보 카드 + 내원/과거력 */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          {isFirstVisit && (
            <div className="border-b border-emerald-100 pb-4">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black leading-tight text-emerald-800 shadow-sm">
                🌱 첫 발병/내원 환자
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-10">
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">성별 / 나이</p>
              <p className="text-lg font-black text-zinc-800">
                {patient.gender} / {patient.age}세
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">연락처</p>
              <p className="text-lg font-black text-zinc-800">{patient.phone || "미입력"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold text-zinc-400">주 진단명</p>
              <p className="text-lg font-black text-blue-600">{patient.diagnosis || "미입력"}</p>
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="mb-1 text-sm font-bold text-zinc-400">특이사항 (Memo)</p>
              <p className="text-sm font-medium text-zinc-600">{patient.memo || "특이사항 없음"}</p>
            </div>
          </div>
        </div>

        {hasPriorCareElsewhere && (
          <div className="rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/90 to-amber-50/50 p-6 shadow-sm md:p-8">
            <div className="mb-5">
              <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-900 shadow-sm">
                🔄 타 병원 치료 경험 있음
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-orange-200/80 bg-white/80 p-5 shadow-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-orange-700">기존 치료 내역</p>
                <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {patient.past_history?.trim() ? patient.past_history : "입력된 기존 치료 내역이 없습니다."}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-200/80 bg-white/80 p-5 shadow-sm">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-orange-700">증상 변화</p>
                <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {patient.symptom_change?.trim() ? patient.symptom_change : "입력된 증상 변화가 없습니다."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 듀얼 탭 내비게이션 */}
      <div className="flex border-b border-zinc-200 mb-8 gap-8">
        <button 
          onClick={() => setActiveTab("soap")} 
          className={`pb-4 text-lg font-black transition-all ${activeTab === "soap" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-400 hover:text-zinc-600"}`}
        >
          🧠 {isEnglish ? "Screening Report" : "스크리닝 리포트"}
        </button>
        <button 
          onClick={() => setActiveTab("treatment")} 
          className={`pb-4 text-lg font-black transition-all ${activeTab === "treatment" ? "text-blue-950 border-b-4 border-blue-950" : "text-zinc-400 hover:text-zinc-600"}`}
        >
          💆‍♂️ 처치 내역 (Treatment Log)
        </button>
      </div>

      {/* 1. 스크리닝 리포트 탭 (ScreeningReportTab: 임상 타임라인 + SOAP) */}
      {activeTab === "soap" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
              <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 임상 타임라인 ({timelineCount}건)
            </h2>
            {soapNotes.length > 0 && (
              <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                {/* 💡 디테일 수정: 치료순 -> 평가순 */}
                <button onClick={() => setSortOrder("desc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "desc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>최신 평가순</button>
                <button onClick={() => setSortOrder("asc")} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortOrder === "asc" ? "bg-white text-blue-950 shadow-sm" : "text-zinc-500 hover:bg-zinc-200"}`}>첫 평가순</button>
              </div>
            )}
          </div>

          {screeningReportTimelineLoading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm font-bold text-zinc-500 shadow-sm">
              {isEnglish
                ? "Loading clinical timeline (AI logs) and SOAP records…"
                : "임상 타임라인(AI 분석 로그)과 SOAP 기록을 불러오는 중입니다…"}
            </div>
          ) : screeningReportTimelineEmpty ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center font-bold text-zinc-500 shadow-sm">
              {isEnglish ? "No assessment records yet." : "아직 작성된 평가 기록이 없습니다."}
            </div>
          ) : (
            <div key={screeningRefreshTick} className="relative pl-4 md:pl-8">
              <div className="absolute left-[11px] md:left-[27px] top-6 bottom-0 w-[2px] bg-blue-100"></div>
              <div className="space-y-10">
                {isTimelineLogsLoading ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm font-bold text-zinc-500">
                    임상 타임라인을 불러오는 중입니다...
                  </div>
                ) : null}
                {timelineLogs.map((item) => {
                  const diagnosisFromPayload =
                    item.payload && typeof item.payload.diagnosisArea === "string"
                      ? item.payload.diagnosisArea
                      : null;
                  const diagnosisLabel =
                    item.diagnosis_area ||
                    diagnosisFromPayload ||
                    item.detected_condition_id ||
                    "미분류";
                  const scoreText =
                    typeof item.overall_score === "number" ? `${Math.round(item.overall_score)}/100점` : "점수 미확정";
                  const isRed = item.has_red_flag === true;
                  const logicSummary =
                    typeof item.logic_audit === "string"
                      ? item.logic_audit
                      : item.logic_audit &&
                        typeof item.logic_audit === "object" &&
                        typeof (item.logic_audit as { feedback?: unknown }).feedback === "string"
                        ? String((item.logic_audit as { feedback?: string }).feedback)
                        : "임상 논리 요약 데이터 없음";
                  const hasAnyDetail =
                    Boolean(item.differential_diagnosis?.trim()) ||
                    Boolean(item.clinical_reasoning?.trim()) ||
                    Boolean(item.intervention_strategy?.trim()) ||
                    Boolean(item.professional_discussion?.trim());
                  const complianceScore =
                    typeof item.compliance_score === "number" ? Math.max(0, Math.min(100, Math.round(item.compliance_score))) : null;
                  const cpgComplianceText =
                    item.cpg_compliance == null
                      ? null
                      : typeof item.cpg_compliance === "string"
                        ? item.cpg_compliance
                        : Array.isArray(item.cpg_compliance)
                          ? `${item.cpg_compliance.length}개 중재 항목이 검증됨`
                          : JSON.stringify(item.cpg_compliance);
                  const auditDefenseText =
                    item.audit_defense == null
                      ? null
                      : typeof item.audit_defense === "string"
                        ? item.audit_defense
                        : typeof item.audit_defense === "object" &&
                            item.audit_defense !== null &&
                            typeof (item.audit_defense as { feedback?: unknown }).feedback === "string"
                          ? String((item.audit_defense as { feedback?: string }).feedback)
                          : JSON.stringify(item.audit_defense);
                  const predictiveTrajectoryText =
                    item.predictive_trajectory == null
                      ? null
                      : typeof item.predictive_trajectory === "string"
                        ? item.predictive_trajectory
                        : typeof item.predictive_trajectory === "object" &&
                            item.predictive_trajectory !== null
                          ? JSON.stringify(item.predictive_trajectory)
                          : null;
                  const predictiveWeeks =
                    typeof item.predictive_trajectory === "object" &&
                    item.predictive_trajectory !== null &&
                    typeof (item.predictive_trajectory as { estimatedWeeks?: unknown }).estimatedWeeks === "number"
                      ? Number((item.predictive_trajectory as { estimatedWeeks: number }).estimatedWeeks)
                      : null;
                  const exportFileName = sanitizeFileNameSegment(
                    `RePhyT_Timeline_${diagnosisLabel}_${new Date(item.created_at).toISOString().slice(0, 10)}`,
                  );
                  const isTimelineSharing = sharingTimelineIds[item.id] === true;
                  const author = item.user_id ? authorProfileMap[item.user_id] : undefined;
                  return (
                    <div key={`guardrail-${item.id}`} className="relative rounded-3xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wide text-indigo-600">AI 분석 로그</p>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${isRed ? "border-indigo-200 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                          {isRed ? "⚠️ 임상 위험 신호 감지" : "임상 위험 신호 없음"}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                          <p className="text-[11px] font-black text-zinc-400">분석 날짜</p>
                          <p className="mt-1 text-sm font-bold text-zinc-700">
                            {new Date(item.created_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </p>
                        </div>
                        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                          <p className="text-[11px] font-black text-zinc-400">진단 부위</p>
                          <p className="mt-1 text-sm font-bold text-zinc-700">{diagnosisLabel}</p>
                        </div>
                        <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                          <p className="text-[11px] font-black text-zinc-400">종합 방어력 점수</p>
                          <p className="mt-1 text-sm font-bold text-zinc-700">{scoreText}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-indigo-100 bg-white px-4 py-3">
                        <p className="text-[11px] font-black text-zinc-400">핵심 요약</p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-700 whitespace-pre-wrap">{logicSummary}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-3 lg:col-span-2">
                          {hasAnyDetail ? (
                            <>
                              {item.differential_diagnosis?.trim() ? (
                                <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                  <p className="text-xs font-black text-indigo-700">🔍 감별 진단 및 스크리닝</p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                    {item.differential_diagnosis}
                                  </p>
                                </div>
                              ) : null}
                              {item.clinical_reasoning?.trim() ? (
                                <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                  <p className="text-xs font-black text-indigo-700">🧠 임상 추론 및 역학적 원인</p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                    {item.clinical_reasoning}
                                  </p>
                                </div>
                              ) : null}
                              {item.intervention_strategy?.trim() ? (
                                <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                  <p className="text-xs font-black text-indigo-700">🎯 중재 전략 심층 분석</p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                    {item.intervention_strategy}
                                  </p>
                                </div>
                              ) : null}
                              {item.professional_discussion?.trim() ? (
                                <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                  <p className="text-xs font-black text-indigo-700">💡 임상 전문가 고찰</p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                    {item.professional_discussion}
                                  </p>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                        <aside className="space-y-3 lg:col-span-1">
                          {complianceScore !== null ? (
                            <div className="rounded-xl border border-indigo-100 bg-white p-4">
                              <p className="text-xs font-black text-indigo-700">🛡️ 삭감 방어력 (실시간)</p>
                              <div className="mt-2 flex items-center justify-between text-xs font-bold text-zinc-600">
                                <span>Compliance Score</span>
                                <span>{complianceScore}/100</span>
                              </div>
                              <div className="mt-2 h-2.5 w-full rounded-full bg-indigo-100">
                                <div
                                  className="h-2.5 rounded-full bg-indigo-500 transition-all"
                                  style={{ width: `${complianceScore}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                          {cpgComplianceText ? (
                            <div className="rounded-xl border border-indigo-100 bg-white p-4">
                              <p className="text-xs font-black text-indigo-700">⚖️ CPG 가이드라인 준수율</p>
                              <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                {cpgComplianceText}
                              </span>
                            </div>
                          ) : null}
                          {auditDefenseText ? (
                            <div className="rounded-xl border border-indigo-100 bg-white p-4">
                              <p className="text-xs font-black text-indigo-700">🩺 임상 추론 심층 검증</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                {auditDefenseText}
                              </p>
                            </div>
                          ) : null}
                          {predictiveTrajectoryText ? (
                            <div className="rounded-xl border border-indigo-100 bg-white p-4">
                              <p className="text-xs font-black text-indigo-700">⏳ 회복 궤적 예측</p>
                              {predictiveWeeks !== null ? (
                                <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                  예상 회복 기간 {predictiveWeeks}주
                                </span>
                              ) : null}
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                {predictiveTrajectoryText}
                              </p>
                            </div>
                          ) : null}
                        </aside>
                      </div>
                      <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-indigo-50 pt-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOriginalDataModalLog(item);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span aria-hidden>📋</span>
                          검사 원본 보기
                        </button>
                        <SOAPExportButton
                          fileName={exportFileName}
                          label="📄 PDF 저장"
                          className="text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg"
                          payload={{
                            patient: {
                              patientId: chartPatientId,
                              name: patient?.name ?? "Unknown",
                              visitDate: item.created_at,
                            },
                            soap: {
                              subjective: item.differential_diagnosis ?? "",
                              objective: item.clinical_reasoning ?? "",
                              assessment: item.intervention_strategy ?? "",
                              plan: item.professional_discussion ?? "",
                            },
                            title: "Re:PhyT Safety Net Timeline Report",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void handleShareTimelineCase(item)}
                          disabled={isTimelineSharing}
                          className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isTimelineSharing ? pd.soapSharePastButtonLoading : "🌐 커뮤니티에 공유하기"}
                        </button>
                      </div>
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <p className="font-bold text-slate-700">작성자 정보</p>
                        <p className="mt-1">
                          {author?.name || "미등록 작성자"}
                          {author?.hospital ? ` · ${author.hospital}` : ""}
                          {author?.specialties && author.specialties.length > 0
                            ? ` · ${author.specialties.slice(0, 2).join(", ")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {sortedNotes.map((note, index) => {
                  const visitNumber = sortOrder === "desc" ? soapNotes.length - index : index + 1;
                  return (
                    <PastSoapCard
                      key={note.id}
                      pastSoapData={note}
                      visitNumber={visitNumber}
                      localeApi={localeApi}
                      copy={pastSoapShareCopy}
                      detailHref={`${base}/dashboard/soap/${note.id}`}
                      onSharedSuccess={handlePastSoapSharedSuccess}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 처치 내역 탭 (P-노트 누적형) */}
      {activeTab === "treatment" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* 🚀 핵심: 다시 복구된 주황색 P-노트 입력 섹션 */}
          <div className="bg-orange-50 p-8 rounded-[2.5rem] border-2 border-orange-200 shadow-sm mb-10">
            <label className="block text-xl font-black text-orange-600 mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm">P</span>
              오늘의 처치 기록 (Plan)
            </label>
            <div className="flex flex-col gap-4">
              <div className="space-y-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-inner">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">1. 도수/수기 치료 (Manual Therapy)</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input
                      value={manualDraft.name}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setManualDraft((p) => ({ ...p, name: e.target.value }));
                      }}
                      placeholder="중재명"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <select
                      value={manualDraft.grade}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setManualDraft((p) => ({ ...p, grade: e.target.value as ManualTherapyEntry["grade"] }));
                      }}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    >
                      {MANUAL_GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={manualDraft.minutes}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setManualDraft((p) => ({ ...p, minutes: e.target.value }));
                      }}
                      placeholder="적용 시간(분)"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <button
                      type="button"
                      onClick={addManualEntry}
                      className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {manualEntries.map((entry, idx) => (
                      <p key={`${entry.name}-${idx}`}>- {entry.name} | {entry.grade} | {entry.minutes || "-"}분</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">2. 치료적 운동 (Therapeutic Exercise)</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                    <input
                      value={exerciseDraft.name}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setExerciseDraft((p) => ({ ...p, name: e.target.value }));
                      }}
                      placeholder="운동명"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <input
                      type="number"
                      value={exerciseDraft.sets}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setExerciseDraft((p) => ({ ...p, sets: e.target.value }));
                      }}
                      placeholder="Set"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <input
                      type="number"
                      value={exerciseDraft.reps}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setExerciseDraft((p) => ({ ...p, reps: e.target.value }));
                      }}
                      placeholder="Rep"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <input
                      type="number"
                      value={exerciseDraft.holdSec}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setExerciseDraft((p) => ({ ...p, holdSec: e.target.value }));
                      }}
                      placeholder="Hold(초)"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <button
                      type="button"
                      onClick={addExerciseEntry}
                      className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {exerciseEntries.map((entry, idx) => (
                      <p key={`${entry.name}-${idx}`}>
                        - {entry.name} | {entry.sets || "-"}set/{entry.reps || "-"}rep{entry.holdSec ? `/${entry.holdSec}s` : ""}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">3. 기기 및 물리치료 (Modalities)</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <select
                      value={modalityDraft.modality}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setModalityDraft((p) => ({ ...p, modality: e.target.value as ModalityEntry["modality"] }));
                      }}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    >
                      {MODALITY_OPTIONS.map((modality) => (
                        <option key={modality} value={modality}>
                          {modality}
                        </option>
                      ))}
                    </select>
                    <input
                      value={modalityDraft.target}
                      onChange={(e) => {
                        setDidTouchTreatmentInput(true);
                        setModalityDraft((p) => ({ ...p, target: e.target.value }));
                      }}
                      placeholder="적용 부위"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-300"
                    />
                    <button
                      type="button"
                      onClick={addModalityEntry}
                      className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {modalityEntries.map((entry, idx) => (
                      <p key={`${entry.modality}-${idx}`}>- {entry.modality} | 적용 부위: {entry.target || "-"}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">4. 환자 교육 및 홈 프로그램 (Education)</h3>
                  <textarea
                    value={educationHep}
                    onChange={(e) => {
                      setDidTouchTreatmentInput(true);
                      setEducationHep(e.target.value);
                    }}
                    className="h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    placeholder="자가 운동, 금기 동작, 생활/통증 관리 교육을 기록하세요."
                  />
                </div>
              </div>
              <button
                onClick={handleAddTreatment}
                disabled={isSubmittingTreatment || !formattedTreatment.trim()}
                className="h-16 rounded-2xl bg-orange-500 font-black text-white text-lg shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98]"
              >
                {isSubmittingTreatment ? "기록 저장 중..." : "오늘의 P-노트 저장하기"}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
              <span className="bg-blue-950 w-2 h-6 rounded-full"></span> 누적 처치 내역 ({treatments.length}건)
            </h2>
          </div>

          {treatments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm text-zinc-500 font-bold">
              아직 작성된 처치 기록이 없습니다. 상단의 주황색 P-노트 칸에 첫 치료를 기록해 보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {treatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="group flex items-start justify-between rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-blue-200"
                >
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-sm font-black text-zinc-400">
                        {new Date(treatment.created_at).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-base font-medium leading-relaxed text-zinc-700" style={{ whiteSpace: "pre-wrap" }}>
                      {treatment.content}
                    </p>
                    {/\[주의사항\]/.test(treatment.content) ? (
                      <div className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        주의사항 포함
                      </div>
                    ) : null}
                  </div>

                  {/* 🗑️ 선명한 버튼식 삭제 버튼 유지 */}
                  <div className="ml-6 flex-shrink-0">
                    <button
                      onClick={() => handleDeleteTreatment(treatment.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 border border-red-100 transition-all hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200 active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {originalDataModalLog ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setOriginalDataModalLog(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-black text-slate-900">환자 검사 데이터 원본</h3>
              <button
                type="button"
                onClick={() => setOriginalDataModalLog(null)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                X
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
              {(() => {
                const source = extractOriginalAssessmentData(originalDataModalLog);
                const blockClass = "rounded-lg bg-slate-50 p-4";
                const emptyClass = "text-sm text-slate-400";
                const hasBilateralRows = source.step3GoalRows.some((row) => Boolean(row.right));
                return (
                  <>
                    <section className={blockClass}>
                      <p className="text-sm font-bold text-indigo-600">
                        Step 1. Exam
                      </p>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${source.step1Exam ? "text-slate-700" : emptyClass}`}>
                        {source.step1Exam || "기입된 내용 없음"}
                      </p>
                    </section>
                    <section className={blockClass}>
                      <p className="text-sm font-bold text-indigo-600">
                        Step 2. Evaluation
                      </p>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${source.step2Evaluation ? "text-slate-700" : emptyClass}`}>
                        {source.step2Evaluation || "기입된 내용 없음"}
                      </p>
                    </section>
                    <section className={blockClass}>
                      <p className="text-sm font-bold text-indigo-600">Step 3. Goal</p>
                      {source.step3GoalRows.length > 0 ? (
                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-3 py-2 font-bold">Motion</th>
                                {hasBilateralRows ? (
                                  <>
                                    <th className="px-3 py-2 font-bold">L</th>
                                    <th className="px-3 py-2 font-bold">R</th>
                                  </>
                                ) : (
                                  <th className="px-3 py-2 font-bold">값</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {source.step3GoalRows.map((row) => (
                                <tr key={row.motion}>
                                  <td className="px-3 py-2 font-semibold text-slate-700">{row.motion}</td>
                                  {hasBilateralRows ? (
                                    <>
                                      <td className={`px-3 py-2 ${row.left ? "text-slate-700" : "text-slate-400"}`}>
                                        {row.left || "기입된 내용 없음"}
                                      </td>
                                      <td className={`px-3 py-2 ${row.right ? "text-slate-700" : "text-slate-400"}`}>
                                        {row.right || "기입된 내용 없음"}
                                      </td>
                                    </>
                                  ) : (
                                    <td className={`px-3 py-2 ${row.center ? "text-slate-700" : "text-slate-400"}`}>
                                      {row.center || "기입된 내용 없음"}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={emptyClass}>기입된 내용 없음</p>
                      )}
                    </section>
                    <section className={blockClass}>
                      <p className="text-sm font-bold text-indigo-600">
                        Step 4. Plan
                      </p>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${source.step4Plan ? "text-slate-700" : emptyClass}`}>
                        {source.step4Plan || "기입된 내용 없음"}
                      </p>
                    </section>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}