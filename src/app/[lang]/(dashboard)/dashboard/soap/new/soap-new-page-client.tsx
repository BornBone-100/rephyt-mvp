"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Activity,
  Target,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ClipboardCheck,
  Info,
  Trash2,
} from "lucide-react";
import type { getDictionary } from "@/dictionaries/getDictionary";
import DashboardRightPanel from "./DashboardRightPanel";
import {
  ObjectiveEvaluation,
  formatRomMmtLineForEvaluation,
  romMmtRowHasAnyData,
  type RomMmtBySide,
  type RomMmtInput,
  type Side,
} from "./ObjectiveEvaluation";
import { MeasureModal, type Step2OutcomePayload } from "./MeasureModal";
import { fetchCdssTimelineRows } from "@/lib/timeline/fetch-cdss-guardrail-timeline";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  getJosptIcfDb,
  getJosptOutcomeDb,
  getTbcOptionsForRegion,
  type SoapDataLocale,
} from "./constants";
import {
  ONSET_OPTIONS,
  PAIN_QUALITY_OPTIONS,
  PROGNOSIS_WEEKS_EN,
  PROGNOSIS_WEEKS_KO,
  TRAUMA_OPTIONS,
  onsetLabel,
  painQualityLabel,
  soapWizardCopy,
  traumaLabel,
  type SoapLocale,
} from "./soap-copy";
import { getModalRegionForOutcomeId } from "@/constants/measures";
import {
  getGenericRedFlagMeta,
  getScreeningQuestionsForRegion,
  resolveScreeningRegion,
  type Step1RedFlagEntry,
} from "@/constants/screening";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
  locale: SoapLocale;
};

type FormData = {
  patientId: string;
  diagnosisArea: string;
  language: string;
  examination: string;
  evaluation: string;
  prognosis: string;
  intervention: string;
  todayTreatment: string;
  /** Step4 구조화 데이터(JSON 문자열). API·표시 동기화용 */
  step4: string;
  /** Step2 클릭형 기능 평가(모달) 결과 */
  step2: Step2OutcomePayload | null;
  /** Step1 주관적 문진·Red Flag 스크리닝 (AI 위험도 근거) */
  step1: { redFlags: Step1RedFlagEntry[] };
};

type PainQuality = (typeof PAIN_QUALITY_OPTIONS)[number];

type ExamDraft = {
  chiefComplaint: string;
  onset: (typeof ONSET_OPTIONS)[number];
  traumaType: (typeof TRAUMA_OPTIONS)[number];
  vas: number;
  painQualities: PainQuality[];
  aggravatingFactors: string;
  relievingFactors: string;
  redFlags: {
    nightPain: boolean;
    weightLoss: boolean;
    neuroBowelBladder: boolean;
  };
  otherNotes: string;
};

interface Patient {
  id: string;
  name: string;
  birthDate: string;
}

type RegionEvidence = {
  tbc: string[];
  outcome: Array<{ name: string; target: string }>;
  rom: string[];
  icf: string[];
  icfModel: {
    bodyStructure: string[];
    activityLimitation: string[];
    participationRestriction: string[];
  };
};

const REGION_EVIDENCE_DB: Record<
  "neck" | "shoulder" | "elbow" | "wrist" | "hand" | "lumbar" | "hip" | "knee" | "ankle" | "foot",
  RegionEvidence
> = {
  neck: {
    tbc: ["Mobility Deficit", "Movement Coordination Impairment", "Headache", "Radiating Pain"],
    outcome: [{ name: "NDI (Neck Disability Index)", target: "Function" }],
    rom: ["Flexion", "Extension", "L/R Rotation", "L/R Side Bending"],
    icf: ["경추부 가동성 저하", "경성 두통", "상지 방사통", "심부굴곡근 약화"],
    icfModel: {
      bodyStructure: ["경추 가동성 저하", "경부 심부굴곡근 약화", "경추 주변 통증 과민성"],
      activityLimitation: ["장시간 앉기 제한", "고개 회전 시 시야 확보 어려움", "컴퓨터 작업 지속 어려움"],
      participationRestriction: ["업무 집중도 저하", "운전/통근 제한", "여가활동 참여 감소"],
    },
  },
  shoulder: {
    tbc: ["Subacromial Pain Syndrome", "Adhesive Capsulitis", "Shoulder Instability", "Rotator Cuff Tear"],
    outcome: [
      { name: "SPADI", target: "Pain/Function" },
      { name: "DASH", target: "Upper Extremity" },
    ],
    rom: ["Flexion", "Extension", "Abduction", "Internal/External Rotation"],
    icf: ["견갑골 운동이상증", "관절낭 패턴 제한", "회전근개 조절 부전", "충돌 증후군"],
    icfModel: {
      bodyStructure: ["견갑골 운동이상증", "회전근개 기능 저하", "견관절 관절낭 제한"],
      activityLimitation: ["상지 거상 동작 제한", "물건 들기 어려움", "오버헤드 작업 제한"],
      participationRestriction: ["직무 수행 제한", "스포츠 참여 감소", "수면의 질 저하"],
    },
  },
  elbow: {
    tbc: ["Lateral Epicondylalgia", "Medial Epicondylalgia", "Ulnar Nerve Entrapment", "Elbow Instability"],
    outcome: [{ name: "PRTEE", target: "Pain/Function" }],
    rom: ["Flexion", "Extension", "Pronation", "Supination"],
    icf: ["손목 신전근 과부하", "주관절 내측 안정성 저하", "신경 포착 증상", "파지 기능 저하"],
    icfModel: {
      bodyStructure: ["전완근 과부하", "주관절 안정성 저하", "신경 자극 민감도 증가"],
      activityLimitation: ["밀기/당기기 제한", "반복 파지 동작 통증", "물건 들어올리기 제한"],
      participationRestriction: ["직업 활동 제한", "가사활동 수행 저하", "취미활동 감소"],
    },
  },
  wrist: {
    tbc: ["Carpal Tunnel Syndrome", "TFCC Lesion", "De Quervain Disease", "Wrist Instability"],
    outcome: [{ name: "PRWE", target: "Wrist Function" }],
    rom: ["Flexion", "Extension", "Radial/Ulnar Deviation", "Pronation/Supination"],
    icf: ["수근관 압박 증상", "삼각섬유연골 복합체 기능 저하", "척측 손목 통증", "손기능 지구력 감소"],
    icfModel: {
      bodyStructure: ["수근관 신경 압박", "손목 안정성 저하", "척측 손목 통증 민감도 증가"],
      activityLimitation: ["키보드/마우스 사용 제한", "손목 부하 동작 제한", "정밀 작업 저하"],
      participationRestriction: ["직무 수행 지연", "취미활동 제한", "일상 자가관리 수행 저하"],
    },
  },
  hand: {
    tbc: ["Thumb CMC OA", "Trigger Finger", "Tendon Irritation", "Post-fracture Stiffness"],
    outcome: [{ name: "QuickDASH", target: "Hand/Upper Extremity" }],
    rom: ["MCP/PIP/DIP Flexion-Extension", "Thumb Opposition", "Grip/Pinch Function"],
    icf: ["미세운동 조절 저하", "엄지 대립 제한", "악력 저하", "통증 회피 패턴"],
    icfModel: {
      bodyStructure: ["수부 미세운동 조절 저하", "엄지 대립 기능 저하", "악력 감소"],
      activityLimitation: ["버튼 잠그기 어려움", "필기/타이핑 제한", "파지-집기 동작 저하"],
      participationRestriction: ["업무 생산성 저하", "자기관리 활동 제한", "사회활동 참여 감소"],
    },
  },
  lumbar: {
    tbc: ["Manipulation Category", "Stabilization Category", "Directional Preference (Ext/Flex)", "Traction Category"],
    outcome: [{ name: "ODI (Oswestry Disability Index)", target: "Low Back Pain" }],
    rom: ["Flexion", "Extension", "L/R Side Bending", "L/R Rotation"],
    icf: ["요추부 불안정성", "추간판 탈출로 인한 신경 압박", "심부 근육(TrA) 수동 조절 저하"],
    icfModel: {
      bodyStructure: ["요추 안정성 저하", "요부 심부근 제어 저하", "신경 압박 관련 증상"],
      activityLimitation: ["앉기/서기 지속 제한", "허리 굴곡 동작 제한", "보행 내구성 저하"],
      participationRestriction: ["직무 수행 제한", "가사/육아 부담 증가", "운동 참여 감소"],
    },
  },
  hip: {
    tbc: ["Femoroacetabular Impingement", "Hip OA", "Gluteal Tendinopathy", "Hip Mobility Deficit"],
    outcome: [{ name: "HOOS", target: "Hip Pain/Function" }],
    rom: ["Flexion", "Extension", "Abduction/Adduction", "Internal/External Rotation"],
    icf: ["고관절 내회전 제한", "중둔근 기능 저하", "보행 시 체중지지 불균형", "고관절 충돌 징후"],
    icfModel: {
      bodyStructure: ["고관절 내회전 제한", "둔근 기능 저하", "고관절 충돌 관련 통증"],
      activityLimitation: ["계단 오르기 제한", "장거리 보행 제한", "앉았다 일어나기 어려움"],
      participationRestriction: ["야외활동 감소", "직무 이동성 제한", "운동 참여 제한"],
    },
  },
  knee: {
    tbc: ["ACL/PCL Injury", "Meniscal Lesion", "Patellofemoral Pain", "Knee OA"],
    outcome: [
      { name: "KOOS", target: "Knee Symptoms/Function" },
      { name: "IKDC", target: "Ligament Function" },
    ],
    rom: ["Flexion", "Extension", "Tibial Rotation", "Weight-bearing Squat Pattern"],
    icf: ["대퇴사두근 억제", "동적 무릎 정렬 저하", "기계적 잠김/걸림", "하중 내성 감소"],
    icfModel: {
      bodyStructure: ["무릎 동적 안정성 저하", "대퇴사두근 기능 저하", "관절 내 기계적 증상"],
      activityLimitation: ["쪼그려 앉기 제한", "계단 이동 제한", "점프/착지 기능 저하"],
      participationRestriction: ["스포츠 참여 제한", "직무 수행 제한", "사회활동 감소"],
    },
  },
  ankle: {
    tbc: ["Lateral Ankle Sprain", "Chronic Ankle Instability", "Achilles Tendinopathy", "Syndesmosis Injury"],
    outcome: [{ name: "FAAM", target: "Foot/Ankle Function" }],
    rom: ["Dorsiflexion", "Plantarflexion", "Inversion/Eversion", "Weight-bearing Lunge Test"],
    icf: ["족배굴곡 제한", "고유수용감각 저하", "외측 안정성 저하", "점프/착지 전략 이상"],
    icfModel: {
      bodyStructure: ["발목 외측 안정성 저하", "족배굴곡 제한", "고유수용감각 저하"],
      activityLimitation: ["불규칙 지면 보행 제한", "방향전환 동작 제한", "달리기 재개 어려움"],
      participationRestriction: ["체육/운동 참여 감소", "직무 이동성 저하", "일상활동 자신감 저하"],
    },
  },
  foot: {
    tbc: ["Plantar Fasciitis", "Metatarsalgia", "Hallux Limitus", "Tarsal Tunnel Syndrome"],
    outcome: [{ name: "FFI (Foot Function Index)", target: "Pain/Function" }],
    rom: ["1st MTP Extension", "Forefoot Mobility", "Rearfoot Inversion/Eversion", "Windlass Function"],
    icf: ["족저근막 과긴장", "아치 안정성 저하", "족지 추진력 감소", "보행 말기 통증 유발"],
    icfModel: {
      bodyStructure: ["족저근막 과긴장", "아치 지지 기능 저하", "전족부 추진력 저하"],
      activityLimitation: ["기상 직후 보행 통증", "장시간 보행 제한", "서기 지속 어려움"],
      participationRestriction: ["직무 활동 제한", "여가 산책 감소", "운동 참여 저하"],
    },
  },
};

const MOCK_PATIENTS: Patient[] = [
  { id: "mock-1", name: "김민수", birthDate: "1988-03-12" },
  { id: "mock-2", name: "이서연", birthDate: "1992-11-05" },
  { id: "mock-3", name: "박지훈", birthDate: "1979-07-21" },
];

const SPECIAL_TESTS_DB: Record<string, string[]> = {
  neck: ["Spurling test", "Distraction test", "ULNT", "Cervical Rotation ROM"],
  shoulder: ["Neer test", "Hawkins-Kennedy", "Empty Can", "Speed test"],
  elbow: ["Cozen test", "Mill's test", "Tinel sign (Cubital tunnel)", "Valgus stress test"],
  wrist: ["Finkelstein test", "Phalen test", "Tinel sign (Carpal tunnel)", "TFCC load test"],
  hand: ["Froment sign", "Bunnell-Littler test", "Allen test", "Grind test (CMC)"],
  lumbar: ["SLR test", "Slump test", "Prone instability test", "PAIVM"],
  hip: ["FADIR test", "FABER test", "Scour test", "Trendelenburg sign"],
  knee: ["Lachman test", "McMurray test", "Anterior Drawer", "Valgus stress test"],
  ankle: ["Anterior Drawer (Ankle)", "Talar Tilt", "Squeeze test", "Thompson test"],
  foot: ["Windlass test", "Navicular drop test", "Mulder click test", "Tinel sign (Tarsal tunnel)"],
};

type SpecialTestValue = "positive" | "negative" | "not_tested";
type CustomSpecialTestResult = "양성" | "음성" | null;
type CustomSpecialTestEntry = {
  id: string;
  name: string;
  result: CustomSpecialTestResult;
};


const REHAB_POTENTIAL_OPTIONS = ["Excellent", "Good", "Fair", "Poor"] as const;

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

type IcfSelectionState = {
  impairment: string[];
  activity: string[];
  participation: string[];
};
type TempDraftPayload = {
  savedAt: string;
  locale: SoapLocale;
  step: number;
  formData: FormData;
  examDraft: ExamDraft;
  specialTestSelection: Record<string, SpecialTestValue>;
  customSpecialTests: CustomSpecialTestEntry[];
  selectedTbcTags: string[];
  romMmtInputs: Record<string, RomMmtBySide>;
  outcomeScores: Record<string, string>;
  icfSelection: IcfSelectionState;
  prognosisDuration: string;
  rehabPotential: string;
  shortTermGoal: string;
  longTermGoal: string;
  manualEntries: ManualTherapyEntry[];
  exerciseEntries: TherapeuticExerciseEntry[];
  modalityEntries: ModalityEntry[];
  educationHep: string;
};

function formatSupabaseTempSaveError(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const o = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [o.message, o.details, o.hint, o.code]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    if (parts.length) return [...new Set(parts)].join(" — ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

type GuardrailPayload = {
  patientId: string;
  diagnosisArea: string;
  locale: SoapLocale;
  examination: string;
  evaluation: string;
  prognosis: string;
  intervention: string;
  step4: string;
  language: string;
  special_tests?: {
    recommended: Array<{ name: string; result: "positive" | "negative" | "not_tested" }>;
    custom: Array<{ id: string; name: string; result: "양성" | "음성" }>;
    merged: Array<{ name: string; result: string; source: "recommended" | "custom" }>;
  };
};

/** OpenAI 전송 전: 실명·생년월일·연락처 등 식별 가능 정보 완화 */
function scrubClinicalTextForApi(text: string, knownNames: string[]): string {
  let out = text;
  const sorted = [...new Set(knownNames.filter((n) => n && n.trim().length >= 2))].sort(
    (a, b) => b.length - a.length,
  );
  for (const name of sorted) {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "Patient");
  }
  out = out.replace(/\b\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[연락처 제거]");
  out = out.replace(/\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/g, "[생년월일 제거]");
  out = out.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, "[날짜 제거]");
  out = out.replace(/[가-힣]{2,4}\s*(님|씨)(?=\s|$|[,.!?])/g, "Patient");
  out = out.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[ID 제거]",
  );
  return out;
}

function resolveDiagnosisKey(raw: string): keyof typeof SPECIAL_TESTS_DB | null {
  const v = raw.trim().split(" ")[0].toLowerCase();
  if (!v) return null;
  return (v in SPECIAL_TESTS_DB ? (v as keyof typeof SPECIAL_TESTS_DB) : null);
}

function removeSpecialTestLines(text: string, testNames: string[]) {
  let next = text;
  for (const testName of testNames) {
    const escaped = testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}:.*\\n?`, "gm");
    next = next.replace(re, "");
  }
  return next
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n")
    .trim();
}

function appendUniqueLine(text: string, line: string) {
  const trimmed = text.trim();
  if (!line.trim()) return trimmed;
  if (!trimmed) return line;
  const lines = trimmed.split("\n");
  if (lines.includes(line)) return trimmed;
  return `${trimmed}\n${line}`;
}

/** API 전송용: 순환 참조·비직렬화 값 제거 후 항상 유효한 JSON 문자열 */
function buildSanitizedStep4Object(
  manualEntries: ManualTherapyEntry[],
  exerciseEntries: TherapeuticExerciseEntry[],
  modalityEntries: ModalityEntry[],
  educationHep: string,
): {
  manual: ManualTherapyEntry[];
  exercise: TherapeuticExerciseEntry[];
  modalities: ModalityEntry[];
  education: string;
} {
  const manual = Array.isArray(manualEntries)
    ? manualEntries.map((m) => ({
        name: String(m?.name ?? "").slice(0, 2000),
        grade: m.grade,
        minutes: String(m?.minutes ?? "").slice(0, 64),
      }))
    : [];
  const exercise = Array.isArray(exerciseEntries)
    ? exerciseEntries.map((e) => ({
        name: String(e?.name ?? "").slice(0, 2000),
        sets: String(e?.sets ?? "").slice(0, 64),
        reps: String(e?.reps ?? "").slice(0, 64),
        holdSec: String(e?.holdSec ?? "").slice(0, 64),
      }))
    : [];
  const modalities = Array.isArray(modalityEntries)
    ? modalityEntries.map((m) => ({
        modality: m.modality,
        target: String(m?.target ?? "").slice(0, 2000),
      }))
    : [];
  const education = typeof educationHep === "string" ? educationHep.slice(0, 12000) : "";
  return { manual, exercise, modalities, education };
}

function safeJsonStringifyStep4(obj: ReturnType<typeof buildSanitizedStep4Object>): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{"manual":[],"exercise":[],"modalities":[],"education":""}';
  }
}

function buildGuardrailRequestPayload(payload: GuardrailPayload): string {
  try {
    return JSON.stringify(payload);
  } catch {
    const fallback: GuardrailPayload = {
      patientId: String(payload.patientId ?? "").slice(0, 128),
      diagnosisArea: String(payload.diagnosisArea ?? "").slice(0, 256),
      locale: payload.locale === "en" ? "en" : "ko",
      examination: String(payload.examination ?? "").slice(0, 50000),
      evaluation: String(payload.evaluation ?? "").slice(0, 50000),
      prognosis: String(payload.prognosis ?? "").slice(0, 50000),
      intervention: String(payload.intervention ?? "").slice(0, 50000),
      step4: '{"manual":[],"exercise":[],"modalities":[],"education":""}',
      language: String(payload.language ?? "ko").slice(0, 16),
    };
    return JSON.stringify(fallback);
  }
}

function formatGuardrailFailureMessage(err: { error?: string; stage?: string }): string {
  const stageKo: Record<string, string> = {
    request_body_parse: "요청 본문",
    validation: "입력 검증",
    openai_fetch: "OpenAI 연결",
    openai_http: "OpenAI API",
    openai_upstream_body_parse: "OpenAI 응답 형식",
    model_content_parse: "모델 JSON 본문",
    db_log: "분석 기록 저장(DB)",
    server: "서버",
  };
  const label = err.stage ? stageKo[err.stage] ?? err.stage : "";
  const base = err.error ?? "Red Flag 분석 요청 실패";
  return label ? `[${label}] ${base}` : base;
}

const formatPlanToTreatment = (
  manualEntries: ManualTherapyEntry[],
  exerciseEntries: TherapeuticExerciseEntry[],
  modalityEntries: ModalityEntry[],
  educationHep: string,
) => {
  const safeManual = Array.isArray(manualEntries) ? manualEntries : [];
  const safeExercise = Array.isArray(exerciseEntries) ? exerciseEntries : [];
  const safeModality = Array.isArray(modalityEntries) ? modalityEntries : [];
  const manualLines = safeManual.map(
    (m) => `[Manual] ${m.name} ${m.grade} (${m.minutes || "-"}min)`,
  );
  const exerciseLines = safeExercise.map(
    (e) => `[Exercise] ${e.name} ${e.sets || "-"}sets/${e.reps || "-"}reps${e.holdSec ? `/${e.holdSec}s` : ""}`,
  );
  const modalityLines = safeModality.map(
    (m) => `[Modalities] ${m.modality} (${m.target || "-"})`,
  );
  const educationLines = educationHep
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `[Education] ${line}`);
  const merged = [...manualLines, ...exerciseLines, ...modalityLines, ...educationLines].join("\n").trim();
  return merged || "[]";
};

function removeExactLine(text: string, line: string) {
  const lines = text
    .split("\n")
    .map((v) => v.trimEnd())
    .filter((v) => v.trim() !== "");
  const next = lines.filter((v) => v !== line);
  return next.join("\n");
}

function upsertAutoObjectiveBlock(text: string, lines: string[]) {
  const START = "[AUTO_OBJECTIVE_BLOCK_START]";
  const END = "[AUTO_OBJECTIVE_BLOCK_END]";
  const escapedStart = START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");
  const base = text.replace(blockRegex, "").trim();
  if (lines.length === 0) return base;
  const block = [START, ...lines, END].join("\n");
  return base ? `${base}\n${block}` : block;
}

function normalizePatientId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

function composeExaminationSummary(draft: ExamDraft, locale: SoapLocale) {
  const t = soapWizardCopy(locale);
  const qualityText =
    draft.painQualities.length > 0
      ? draft.painQualities.map((pq) => painQualityLabel(pq, locale)).join(", ")
      : t.notProvided;
  const redFlags = [
    draft.redFlags.nightPain ? (locale === "en" ? "Night pain" : "야간통") : null,
    draft.redFlags.weightLoss ? (locale === "en" ? "Unexplained weight loss" : "체중 감소") : null,
    draft.redFlags.neuroBowelBladder ? (locale === "en" ? "Neurogenic bowel/bladder" : "감각/대소변 이상") : null,
  ].filter(Boolean);

  return [
    `${t.prefixChief}: ${draft.chiefComplaint || t.notProvided}`,
    `${t.prefixOnset}: ${onsetLabel(draft.onset, locale)} (${traumaLabel(draft.traumaType, locale)})`,
    `${t.prefixVas}: ${draft.vas}`,
    `${t.prefixQuality}: ${qualityText}`,
    `${t.prefixAgg}: ${draft.aggravatingFactors || t.notProvided}`,
    `${t.prefixRelief}: ${draft.relievingFactors || t.notProvided}`,
    `${t.prefixRedFlag}: ${redFlags.length > 0 ? redFlags.join(", ") : t.redFlagNone}`,
    `${t.prefixNotes}: ${draft.otherNotes || t.none}`,
  ].join(" / ");
}

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
  auxiliaryError?: { stage: "db_log"; message: string };
  logicChainAudit?: {
    status: "pass" | "fail" | "warning";
    feedback: string;
    missingLinks: string[];
  };
  cpgCompliance?: Array<{
    intervention: string;
    level: "green" | "yellow" | "red";
    reasoning: string;
    alternative: string | null;
  }>;
  auditDefense?: {
    riskLevel: "Low" | "Medium" | "High";
    defenseScore: number;
    feedback: string;
    improvementTip: string;
  };
  predictiveTrajectory?: {
    estimatedWeeks: number;
    trajectoryText: string;
  };
  interventionStrategy?: string;
  professionalDiscussion?: string;
  differentialDiagnosis?: string;
};

/** Step별 메인 텍스트 영역(SOAP 본문) — step2/step4 메타와 구분 */
type SoapStepTextField = "examination" | "evaluation" | "prognosis" | "intervention";

const STEP_FIELD_MAP: Record<number, SoapStepTextField> = {
  1: "examination",
  2: "evaluation",
  3: "prognosis",
  4: "intervention",
};

function outcomeMeasureChipLabel(outcomeId: string): string {
  const labels: Record<string, string> = {
    spadi: "SPADI",
    quickdash: "QuickDASH",
    ndi: "NDI",
    odi: "ODI",
    prtee: "PRTEE",
    prwe: "PRWE",
    mhq: "MHQ",
    hoos: "HOOS",
    lefs: "LEFS",
    koos: "KOOS",
    lysholm: "Lysholm",
    faam: "FAAM",
    ffi: "FFI",
  };
  return labels[outcomeId] ?? outcomeId.toUpperCase();
}

function RedFlagMentor({ locale }: { locale: SoapLocale }) {
  const t = useMemo(() => soapWizardCopy(locale), [locale]);
  const dataLocale: SoapDataLocale = locale === "en" ? "en" : "ko";
  const prognosisWeekOptions = locale === "en" ? PROGNOSIS_WEEKS_EN : PROGNOSIS_WEEKS_KO;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const patientIdFromUrl = useMemo(() => {
    const raw = searchParams.get("patientId");
    if (!raw) return "";
    try {
      return normalizePatientId(decodeURIComponent(raw));
    } catch {
      return normalizePatientId(raw);
    }
  }, [searchParams]);
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [reportResult, setReportResult] = useState<RedFlagResult | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<RedFlagResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "duplicated">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    patientId: "",
    diagnosisArea: "",
    language: locale === "en" ? "en" : "ko",
    examination: "",
    evaluation: "",
    prognosis: "",
    intervention: "",
    todayTreatment: "",
    step4: '{"manual":[],"exercise":[],"modalities":[],"education":""}',
    step2: null,
    step1: { redFlags: [] },
  });
  const effectivePatientId = useMemo(
    () => normalizePatientId(String(formData.patientId ?? "")) || patientIdFromUrl,
    [formData.patientId, patientIdFromUrl],
  );
  const patientDetailHref = useCallback(
    (patientId: string) => `/${locale}/dashboard/patients/${encodeURIComponent(patientId)}`,
    [locale],
  );

  useEffect(() => {
    if (!patientIdFromUrl) return;
    setFormData((prev) => {
      if (prev.patientId.trim()) return prev;
      return { ...prev, patientId: patientIdFromUrl };
    });
  }, [patientIdFromUrl]);

  const [examDraft, setExamDraft] = useState<ExamDraft>({
    chiefComplaint: "",
    onset: "Acute",
    traumaType: "Non-traumatic",
    vas: 5,
    painQualities: [],
    aggravatingFactors: "",
    relievingFactors: "",
    redFlags: {
      nightPain: false,
      weightLoss: false,
      neuroBowelBladder: false,
    },
    otherNotes: "",
  });
  const [specialTestSelection, setSpecialTestSelection] = useState<Record<string, SpecialTestValue>>({});
  const [customSpecialTests, setCustomSpecialTests] = useState<CustomSpecialTestEntry[]>([]);
  const [selectedTbcTags, setSelectedTbcTags] = useState<string[]>([]);
  const [romMmtInputs, setRomMmtInputs] = useState<Record<string, RomMmtBySide>>({});
  const [outcomeScores, setOutcomeScores] = useState<Record<string, string>>({});
  const [icfSelection, setIcfSelection] = useState<IcfSelectionState>({
    impairment: [],
    activity: [],
    participation: [],
  });
  const [prognosisDuration, setPrognosisDuration] = useState("");
  const [rehabPotential, setRehabPotential] = useState("");
  const [shortTermGoal, setShortTermGoal] = useState("");
  const [longTermGoal, setLongTermGoal] = useState("");
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
    modality: "Hot/Cold Pack",
    target: "",
  });
  const [modalityEntries, setModalityEntries] = useState<ModalityEntry[]>([]);
  const [educationHep, setEducationHep] = useState("");
  const [measureModalOpen, setMeasureModalOpen] = useState(false);
  const [selectedOutcomeTool, setSelectedOutcomeTool] = useState<string>("");
  const [manualOutcomeName, setManualOutcomeName] = useState("");
  const [manualOutcomeScore, setManualOutcomeScore] = useState("");
  const [manualOutcomeMax, setManualOutcomeMax] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, boolean>>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [pendingCloudDraft, setPendingCloudDraft] = useState<TempDraftPayload | null>(null);
  const [showCloudDraftPrompt, setShowCloudDraftPrompt] = useState(false);
  const [showProPaywall, setShowProPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    // 라우트가 바뀌면 클릭을 가로막는 오버레이 상태를 즉시 초기화한다.
    setShowProPaywall(false);
    setMeasureModalOpen(false);
  }, [pathname]);

  const specialTestLabel = useMemo(
    (): Record<SpecialTestValue, string> => ({
      positive: locale === "en" ? "Positive (+)" : "양성(+)",
      negative: locale === "en" ? "Negative (-)" : "음성(-)",
      not_tested: locale === "en" ? "Not tested" : "미실시",
    }),
    [locale],
  );

  const screeningRegion = useMemo(
    () => resolveScreeningRegion(formData.diagnosisArea),
    [formData.diagnosisArea],
  );

  useEffect(() => {
    setScreeningAnswers({});
  }, [screeningRegion]);

  /** Step1: 일반 Red Flag 토글 + 부위별 스크리닝 → formData.step1.redFlags */
  useEffect(() => {
    const redFlags: Step1RedFlagEntry[] = [];
    const g = examDraft.redFlags;
    const gmeta = getGenericRedFlagMeta(dataLocale);
    if (g.nightPain) {
      redFlags.push({
        questionId: gmeta.nightPain.id,
        regionKey: "general",
        label: gmeta.nightPain.label,
        isRedFlag: gmeta.nightPain.isRedFlag,
        source: "generic",
      });
    }
    if (g.weightLoss) {
      redFlags.push({
        questionId: gmeta.weightLoss.id,
        regionKey: "general",
        label: gmeta.weightLoss.label,
        isRedFlag: gmeta.weightLoss.isRedFlag,
        source: "generic",
      });
    }
    if (g.neuroBowelBladder) {
      redFlags.push({
        questionId: gmeta.neuroBowelBladder.id,
        regionKey: "general",
        label: gmeta.neuroBowelBladder.label,
        isRedFlag: gmeta.neuroBowelBladder.isRedFlag,
        source: "generic",
      });
    }
    const qs = getScreeningQuestionsForRegion(screeningRegion, dataLocale);
    for (const q of qs) {
      if (screeningAnswers[q.id]) {
        redFlags.push({
          questionId: q.id,
          regionKey: screeningRegion ?? "unknown",
          label: q.text,
          isRedFlag: q.isRedFlag,
          source: "screening",
        });
      }
    }
    setFormData((prev) => {
      const a = JSON.stringify(prev.step1.redFlags);
      const b = JSON.stringify(redFlags);
      if (a === b) return prev;
      return { ...prev, step1: { redFlags } };
    });
  }, [examDraft.redFlags, screeningAnswers, screeningRegion, dataLocale]);

  /** Step4 구조 → formData.step4 JSON (분석 전에도 서버와 동일 스냅샷 유지) */
  useEffect(() => {
    const obj = buildSanitizedStep4Object(manualEntries, exerciseEntries, modalityEntries, educationHep);
    const json = safeJsonStringifyStep4(obj);
    setFormData((prev) => (prev.step4 === json ? prev : { ...prev, step4: json }));
  }, [manualEntries, exerciseEntries, modalityEntries, educationHep]);

  /** 분석 클릭 시 todayTreatment 반영 — setFormData 배치와 분리해 누락 방지 */
  const [treatmentApplyFromAnalyze, setTreatmentApplyFromAnalyze] = useState<string | null>(null);
  useEffect(() => {
    if (treatmentApplyFromAnalyze === null) return;
    const text = treatmentApplyFromAnalyze;
    setFormData((prev) => ({ ...prev, todayTreatment: text }));
    setTreatmentApplyFromAnalyze(null);
  }, [treatmentApplyFromAnalyze]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      try {
        const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(100);
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setPatients(MOCK_PATIENTS);
          return;
        }
        const mapped = data
          .map((row) => {
            const r = row as Record<string, unknown>;
            const id = typeof r.id === "string" ? r.id : "";
            const name = typeof r.name === "string" ? r.name : "";
            const birthDateRaw =
              (typeof r.birth_date === "string" && r.birth_date) ||
              (typeof r.date_of_birth === "string" && r.date_of_birth) ||
              (typeof r.dob === "string" && r.dob) ||
              null;
            if (!id || !name) return null;
            return { id, name, birthDate: birthDateRaw ?? "" };
          })
          .filter((p): p is Patient => Boolean(p));
        setPatients(mapped.length > 0 ? mapped : MOCK_PATIENTS);
      } catch {
        if (!cancelled) setPatients(MOCK_PATIENTS);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, examination: composeExaminationSummary(examDraft, locale) }));
  }, [examDraft, locale]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleExamDraftChange = (patch: Partial<ExamDraft>) => {
    setExamDraft((prev) => ({ ...prev, ...patch }));
  };

  const handlePainQualityToggle = (item: PainQuality) => {
    setExamDraft((prev) => {
      const exists = prev.painQualities.includes(item);
      return {
        ...prev,
        painQualities: exists ? prev.painQualities.filter((v) => v !== item) : [...prev.painQualities, item],
      };
    });
  };

  const handleRedFlagToggle = (key: keyof ExamDraft["redFlags"]) => {
    setExamDraft((prev) => ({
      ...prev,
      redFlags: { ...prev.redFlags, [key]: !prev.redFlags[key] },
    }));
  };

  const toggleScreeningQuestion = (questionId: string) => {
    setScreeningAnswers((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSpecialTestToggle = (testName: string, value: SpecialTestValue) => {
    if (step !== 2) return;
    setSpecialTestSelection((prev) => ({ ...prev, [testName]: value }));
  };

  const addCustomSpecialTest = () => {
    setCustomSpecialTests((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        result: null,
      },
    ]);
  };

  const updateCustomSpecialTestName = (id: string, name: string) => {
    setCustomSpecialTests((prev) => prev.map((row) => (row.id === id ? { ...row, name } : row)));
  };

  const updateCustomSpecialTestResult = (id: string, result: CustomSpecialTestResult) => {
    setCustomSpecialTests((prev) => prev.map((row) => (row.id === id ? { ...row, result } : row)));
  };

  const removeCustomSpecialTest = (id: string) => {
    setCustomSpecialTests((prev) => prev.filter((row) => row.id !== id));
  };

  const handleRomMmtChange = (movement: string, side: Side, patch: Partial<RomMmtInput>) => {
    const defaultRow: RomMmtInput = { arom: "", prom: "", endFeel: "Normal", mmt: "" };
    setRomMmtInputs((prev) => ({
      ...prev,
      [movement]: {
        left: {
          ...(prev[movement]?.left ?? defaultRow),
          ...(side === "left" ? patch : {}),
        },
        right: {
          ...(prev[movement]?.right ?? defaultRow),
          ...(side === "right" ? patch : {}),
        },
      },
    }));
  };

  const handleRomMmtReplaceRow = useCallback((movement: string, next: RomMmtBySide) => {
    setRomMmtInputs((prev) => ({ ...prev, [movement]: next }));
  }, []);

  const applyDraftPayload = (draft: TempDraftPayload) => {
    setStep(draft.step || 1);
    setFormData(draft.formData);
    setExamDraft(draft.examDraft);
    setSpecialTestSelection(draft.specialTestSelection ?? {});
    setCustomSpecialTests(draft.customSpecialTests ?? []);
    setSelectedTbcTags(draft.selectedTbcTags ?? []);
    setRomMmtInputs(draft.romMmtInputs ?? {});
    setOutcomeScores(draft.outcomeScores ?? {});
    setIcfSelection(
      draft.icfSelection ?? {
        impairment: [],
        activity: [],
        participation: [],
      },
    );
    setPrognosisDuration(draft.prognosisDuration ?? "");
    setRehabPotential(draft.rehabPotential ?? "");
    setShortTermGoal(draft.shortTermGoal ?? "");
    setLongTermGoal(draft.longTermGoal ?? "");
    setManualEntries(draft.manualEntries ?? []);
    setExerciseEntries(draft.exerciseEntries ?? []);
    setModalityEntries(draft.modalityEntries ?? []);
    setEducationHep(draft.educationHep ?? "");
  };

  const handleDraftSave = async () => {
    const normalizedPatientId = effectivePatientId;
    if (!normalizedPatientId) {
      alert(locale === "en" ? "Please select a patient first." : "먼저 환자를 선택해 주세요.");
      return;
    }
    setIsDraftSaving(true);
    const now = new Date();
    const payload: TempDraftPayload = {
      savedAt: now.toISOString(),
      locale,
      step,
      formData,
      examDraft,
      specialTestSelection,
      customSpecialTests,
      selectedTbcTags,
      romMmtInputs,
      outcomeScores,
      icfSelection,
      prognosisDuration,
      rehabPotential,
      shortTermGoal,
      longTermGoal,
      manualEntries,
      exerciseEntries,
      modalityEntries,
      educationHep,
    };
    const supabasePayload = {
      patient_id: normalizedPatientId,
      draft_data: payload,
      last_saved_at: now.toISOString(),
    };
    console.log("임시 저장 시도 Payload:", supabasePayload);
    try {
      const { error } = await supabase.from("temp_records").upsert(supabasePayload as never, {
        onConflict: "patient_id",
      });
      if (error) throw error;
      const hhmm = now.toLocaleTimeString(locale === "en" ? "en-US" : "ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setDraftSavedAt(hhmm);
    } catch (error) {
      console.error("Supabase 임시 저장 실패 — 원본 error 객체:", error);
      const detail = formatSupabaseTempSaveError(error);
      const title = locale === "en" ? "Failed to save draft." : "임시 저장에 실패했습니다.";
      toast.error(title, {
        description: detail || (locale === "en" ? "Unknown error" : "알 수 없는 오류"),
        duration: 14_000,
      });
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleOutcomeScoreChange = (measureName: string, value: string) => {
    setOutcomeScores((prev) => ({ ...prev, [measureName]: value }));
  };

  const handleOutcomeAppendToNote = (outcome: { id: string; name: string; max: number; unit: string }) => {
    const inputVal = (outcomeScores[outcome.id] ?? "").trim();
    if (!inputVal) return;

    const nextLine = `${t.tagOutcome} ${outcome.name} : ${inputVal}/${outcome.max}${outcome.unit}`;
    setFormData((prev) => ({
      ...prev,
      evaluation: prev.evaluation ? `${prev.evaluation}\n${nextLine}` : nextLine,
    }));
    setOutcomeScores((prev) => ({ ...prev, [outcome.id]: "" }));
  };

  const handleTbcToggle = (tbcTag: string) => {
    setSelectedTbcTags((prev) => {
      const exists = prev.includes(tbcTag);
      const line = `${t.tagTbc} ${tbcTag}`;
      setFormData((fd) => ({
        ...fd,
        evaluation: exists ? removeExactLine(fd.evaluation, line) : appendUniqueLine(fd.evaluation, line),
      }));
      return exists ? prev.filter((v) => v !== tbcTag) : [...prev, tbcTag];
    });
  };

  const handleAppendICF = (
    item: string,
    bucket: "impairment" | "activity" | "participation",
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.currentTarget.blur();
    const tag =
      bucket === "impairment" ? t.tagIcfBf : bucket === "activity" ? t.tagIcfAct : t.tagIcfPart;
    const line = `${tag} ${item}`;
    const key = bucket;
    setIcfSelection((prev) => {
      const exists = prev[key].includes(item);
      const nextBucket = exists ? prev[key].filter((v) => v !== item) : [...prev[key], item];
      setFormData((fd) => ({
        ...fd,
        evaluation: exists ? removeExactLine(fd.evaluation, line) : appendUniqueLine(fd.evaluation, line),
      }));
      return { ...prev, [key]: nextBucket };
    });
  };

  const appendGoalText = (target: "short" | "long", line: string) => {
    if (!line.trim()) return;
    if (target === "short") {
      setShortTermGoal((prev) => appendUniqueLine(prev, line));
      return;
    }
    setLongTermGoal((prev) => appendUniqueLine(prev, line));
  };

  const addManualEntry = () => {
    if (!manualDraft.name.trim()) return;
    setManualEntries((prev) => [...prev, { ...manualDraft, name: manualDraft.name.trim() }]);
    setManualDraft((prev) => ({ ...prev, name: "", minutes: "" }));
  };

  const addExerciseEntry = () => {
    if (!exerciseDraft.name.trim()) return;
    setExerciseEntries((prev) => [...prev, { ...exerciseDraft, name: exerciseDraft.name.trim() }]);
    setExerciseDraft({ name: "", sets: "", reps: "", holdSec: "" });
  };

  const addModalityEntry = () => {
    if (!modalityDraft.target.trim()) return;
    setModalityEntries((prev) => [...prev, { ...modalityDraft, target: modalityDraft.target.trim() }]);
    setModalityDraft((prev) => ({ ...prev, target: "" }));
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setShowProPaywall(false);
    try {
      const usageRes = await fetch("/api/usage/monthly-cdss", { method: "GET", credentials: "include" });
      if (usageRes.ok) {
        const usageJson = (await usageRes.json()) as {
          allowed?: boolean;
          reportCount?: number;
          logCount?: number;
          distinctPatientCount?: number;
          limit?: number;
        };
        if (usageJson.allowed === false) {
          const lim = typeof usageJson.limit === "number" ? usageJson.limit : 5;
          const rc =
            typeof usageJson.reportCount === "number"
              ? usageJson.reportCount
              : typeof usageJson.logCount === "number"
                ? usageJson.logCount
                : 0;
          setPaywallUsage({ used: rc, limit: lim });
          setShowProPaywall(true);
          return;
        }
      }

      const treatmentText = formatPlanToTreatment(
        manualEntries,
        exerciseEntries,
        modalityEntries,
        educationHep,
      );
      setTreatmentApplyFromAnalyze(treatmentText);
      const step4Obj = buildSanitizedStep4Object(
        manualEntries,
        exerciseEntries,
        modalityEntries,
        educationHep,
      );
      const step4Json = safeJsonStringifyStep4(step4Obj);
      const selectedPatient = patients.find((p) => p.id === effectivePatientId);
      const nameHints = [
        ...(selectedPatient?.name ? [selectedPatient.name] : []),
        ...MOCK_PATIENTS.map((p) => p.name),
        ...patients.map((p) => p.name),
      ];
      const payload: GuardrailPayload = {
        patientId: effectivePatientId,
        diagnosisArea: formData.diagnosisArea,
        locale,
        examination: scrubClinicalTextForApi(formData.examination.trim(), nameHints),
        evaluation: scrubClinicalTextForApi(formData.evaluation.trim(), nameHints),
        prognosis: scrubClinicalTextForApi(formData.prognosis.trim(), nameHints),
        intervention: scrubClinicalTextForApi(treatmentText || formData.intervention.trim(), nameHints),
        step4: scrubClinicalTextForApi(step4Json, nameHints),
        language: formData.language,
        special_tests: mergedSpecialTests,
      };
      const res = await fetch("/api/cdss-guardrail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildGuardrailRequestPayload(payload),
        credentials: "include",
      });

      if (res.status === 403) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
          requiresUpgrade?: boolean;
        };
        if (errBody.requiresUpgrade) {
          const lim = 5;
          setPaywallUsage({ used: lim, limit: lim });
          setShowProPaywall(true);
          return;
        }
        throw new Error(errBody.error ?? "Forbidden");
      }

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; stage?: string };
        throw new Error(formatGuardrailFailureMessage(err));
      }

      const data = (await res.json()) as RedFlagResult;
      if (data.auxiliaryError?.stage === "db_log") {
        alert(`${t.dbLogWarn}\n${data.auxiliaryError.message}`);
      }
      setReportResult(data);
      setEvaluationResult(data);
      // 분석 완료와 저장 완료 상태를 분리: 저장은 버튼 클릭 시에만 수행
      setSaveStatus("idle");
      setSaveErrorMessage(null);
      if (typeof window !== "undefined" && effectivePatientId) {
        const cautionLines =
          data.cpgCompliance
            ?.filter((item) => item.level === "yellow" || item.level === "red")
            .map((item) => `${item.intervention}: ${item.reasoning}`) ?? [];
        window.localStorage.setItem(
          `rephyt:treatment-draft:${effectivePatientId}`,
          JSON.stringify({
            content: treatmentText || formData.intervention.trim(),
            cautions: cautionLines,
            updatedAt: new Date().toISOString(),
          }),
        );
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : t.analyzeError;
      alert(`${msg}\n${t.tryAgain}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDiagnosisRecord = async () => {
    if (!reportResult) return;
    /** 저장·조회·이벤트에 동일하게 쓰는 환자 ID (폼 + URL 단일화 결과) */
    const chartPatientId = normalizePatientId(effectivePatientId);
    const normalizedPatientIdFromUrl = normalizePatientId(patientIdFromUrl);
    if (!chartPatientId) {
      alert(locale === "en" ? "Please select a patient first." : "먼저 환자를 선택해 주세요.");
      return;
    }
    if (normalizedPatientIdFromUrl && normalizedPatientIdFromUrl !== chartPatientId) {
      console.warn(
        "[handleSaveDiagnosisRecord] patient_id mismatch",
        "url:",
        normalizedPatientIdFromUrl,
        "save:",
        chartPatientId,
      );
    }
    console.log(
      "[handleSaveDiagnosisRecord] formData.patientId:",
      formData.patientId,
      "patientIdFromUrl:",
      patientIdFromUrl || "(없음)",
      "chartPatientId:",
      chartPatientId,
    );
    setIsSaving(true);
    setSaveStatus("saving");
    setSaveErrorMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("🕵️‍♂️ [디버깅] 프론트엔드에서 찾은 user_id:", user?.id);
      if (!user?.id) {
        alert("⚠️ 시스템 경고: 로그인 정보(user_id)를 찾을 수 없습니다! 백엔드로 null이 날아갑니다.");
      }
      console.log("🚀 [SAVE] 쏠 준비 완료. Patient ID:", chartPatientId);
      const payload = {
        patientId: chartPatientId,
        userId: user?.id,
        diagnosisArea: formData.diagnosisArea,
        locale,
        language: formData.language,
        result: reportResult,
      };
      const res = await fetch("/api/cdss-guardrail/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const response = { ok: res.ok, status: res.status, body };
      console.log("✅ [DB INSERT] 성공 여부:", response);
      if (!res.ok) {
        throw new Error(body.error || t.dashSaveRecordError);
      }
      const { error: deleteDraftError } = await supabase
        .from("temp_records")
        .delete()
        .eq("patient_id", chartPatientId);
      if (deleteDraftError) {
        console.warn("temp_records delete failed:", deleteDraftError);
      }

      const { rows: timelineRows, error: timelineErr } = await fetchCdssTimelineRows(supabase, chartPatientId);
      if (timelineErr) {
        console.error("타임라인 재조회 실패:", timelineErr.message);
        setSaveStatus("saved");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("rephyt:timeline-log-saved", { detail: { patientId: chartPatientId } }));
        }
        toast.success(
          locale === "en"
            ? "Data saved. Please check the list manually."
            : "데이터가 저장되었습니다. 목록을 확인해 보세요.",
        );
        router.refresh();
        router.push(`${patientDetailHref(chartPatientId)}?refresh=${Date.now()}`);
        return;
      }
      console.log("🔄 [FETCH] 타임라인 다시 가져옴. 데이터 개수:", timelineRows.length);

      setSaveStatus("saved");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("rephyt:timeline-log-saved", { detail: { patientId: chartPatientId } }));
      }
      toast.success(locale === "en" ? "Clinical report saved." : t.dashSaveRecordSaved);
      router.refresh();
      router.push(`${patientDetailHref(chartPatientId)}?refresh=${Date.now()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.dashSaveRecordError;
      setSaveStatus("error");
      setSaveErrorMessage(message);
    } finally {
      setIsSaving(false);
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
  const regionKey = formData.diagnosisArea.split(" ")[0].toLowerCase();
  const selectedDiagnosisKey = resolveDiagnosisKey(formData.diagnosisArea);
  const recommendedTests = selectedDiagnosisKey
    ? SPECIAL_TESTS_DB[regionKey as keyof typeof SPECIAL_TESTS_DB] ?? []
    : [];
  const selectedRegionEvidence = selectedDiagnosisKey
    ? REGION_EVIDENCE_DB[regionKey as keyof typeof REGION_EVIDENCE_DB] ?? null
    : null;
  const selectedTbcOptions = selectedDiagnosisKey
    ? getTbcOptionsForRegion(regionKey, selectedRegionEvidence?.tbc, dataLocale)
    : [];
  const selectedOutcomeOptions = selectedDiagnosisKey
    ? getJosptOutcomeDb(dataLocale)[regionKey] ?? []
    : [];
  const selectedIcfOptions = selectedDiagnosisKey
    ? getJosptIcfDb(dataLocale)[regionKey] ?? null
    : null;
  const mergedSpecialTests = useMemo(() => {
    const recommended = Object.entries(specialTestSelection)
      .filter(([, result]) => Boolean(result))
      .map(([name, result]) => ({
        name: name.trim(),
        result,
      }))
      .filter((row): row is { name: string; result: "positive" | "negative" | "not_tested" } => Boolean(row.name));

    const custom = customSpecialTests
      .map((row) => ({
        id: row.id,
        name: row.name.trim(),
        result: row.result,
      }))
      .filter((row): row is { id: string; name: string; result: "양성" | "음성" } => Boolean(row.name) && Boolean(row.result));

    return {
      recommended,
      custom,
      merged: [
        ...recommended.map((row) => ({
          name: row.name,
          result: specialTestLabel[row.result],
          source: "recommended" as const,
        })),
        ...custom.map((row) => ({
          name: row.name,
          result: row.result,
          source: "custom" as const,
        })),
      ],
    };
  }, [customSpecialTests, specialTestLabel, specialTestSelection]);

  useEffect(() => {
    const normalizedPatientId = effectivePatientId;
    if (!normalizedPatientId) {
      setPendingCloudDraft(null);
      setShowCloudDraftPrompt(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("temp_records")
        .select("draft_data, last_saved_at")
        .eq("patient_id", normalizedPatientId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("temp_records fetch failed:", error);
        return;
      }
      const row = data as { draft_data?: unknown; last_saved_at?: string | null } | null;
      if (!row?.draft_data || typeof row.draft_data !== "object") {
        setPendingCloudDraft(null);
        setShowCloudDraftPrompt(false);
        return;
      }
      setPendingCloudDraft(row.draft_data as TempDraftPayload);
      setShowCloudDraftPrompt(true);
      if (row.last_saved_at) {
        const d = new Date(row.last_saved_at);
        if (Number.isFinite(+d)) {
          const hhmm = d.toLocaleTimeString(locale === "en" ? "en-US" : "ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          setDraftSavedAt(hhmm);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectivePatientId, locale, supabase]);

  useEffect(() => {
    const opts = selectedDiagnosisKey ? getJosptOutcomeDb(dataLocale)[regionKey] ?? [] : [];
    if (opts.length === 0) {
      setSelectedOutcomeTool("");
      return;
    }
    setSelectedOutcomeTool((prev) => {
      if (prev === "manual") return "manual";
      if (prev && opts.some((o) => o.id === prev)) return prev;
      return opts[0].id;
    });
  }, [regionKey, selectedDiagnosisKey, dataLocale]);

  useEffect(() => {
    const autoRomLines = Object.entries(romMmtInputs)
      .filter(([movement, row]) => romMmtRowHasAnyData(movement, row))
      .map(([movement, row]) => formatRomMmtLineForEvaluation(movement, row, t.tagRomMmt));
    const autoOutcomeLines = selectedOutcomeOptions
      .map((o) => {
        const score = (outcomeScores[o.id] ?? "").trim();
        if (!score) return null;
        return `${t.tagOutcome} ${o.name} : ${score}/${o.max}${o.unit}`;
      })
      .filter((v): v is string => Boolean(v));
    const autoTbcLines = selectedTbcTags.map((tbc) => `${t.tagTbc} ${tbc}`);
    const autoIcfLines = [
      ...icfSelection.impairment.map((item) => `${t.tagIcfBf} ${item}`),
      ...icfSelection.activity.map((item) => `${t.tagIcfAct} ${item}`),
      ...icfSelection.participation.map((item) => `${t.tagIcfPart} ${item}`),
    ];
    const autoLines = [...autoRomLines, ...autoOutcomeLines, ...autoTbcLines, ...autoIcfLines];
    setFormData((prev) => {
      const newEvaluation = upsertAutoObjectiveBlock(prev.evaluation, autoLines);
      if (JSON.stringify(prev.evaluation) === JSON.stringify(newEvaluation)) {
        return prev;
      }
      return {
        ...prev,
        evaluation: newEvaluation,
      };
    });
  }, [
    icfSelection,
    outcomeScores,
    romMmtInputs,
    selectedOutcomeOptions,
    selectedTbcTags,
    t.tagRomMmt,
    t.tagOutcome,
    t.tagTbc,
    t.tagIcfBf,
    t.tagIcfAct,
    t.tagIcfPart,
  ]);

  useEffect(() => {
    const trackedNames = [...recommendedTests, ...customSpecialTests.map((row) => row.name.trim()).filter(Boolean)];
    const specialLines = [
      ...Object.entries(specialTestSelection)
        .filter(([, result]) => Boolean(result))
        .map(([name, result]) => `${name}: ${specialTestLabel[result]}`),
      ...customSpecialTests
        .map((row) => ({ name: row.name.trim(), result: row.result }))
        .filter((row): row is { name: string; result: "양성" | "음성" } => Boolean(row.name) && Boolean(row.result))
        .map((row) => `${row.name}: ${row.result}`),
    ];

    setFormData((prev) => {
      const stripped = removeSpecialTestLines(prev.evaluation, trackedNames);
      const nextEvaluation = [...(stripped ? [stripped] : []), ...specialLines].join("\n").trim();
      if (nextEvaluation === prev.evaluation) return prev;
      return { ...prev, evaluation: nextEvaluation };
    });
  }, [customSpecialTests, recommendedTests, specialTestLabel, specialTestSelection]);

  useEffect(() => {
    const lines = [
      prognosisDuration ? `${t.tagEstimatedDuration} ${prognosisDuration}` : "",
      rehabPotential ? `[Rehab Potential] ${rehabPotential}` : "",
      shortTermGoal.trim() ? `[STG]\n${shortTermGoal.trim()}` : "",
      longTermGoal.trim() ? `[LTG]\n${longTermGoal.trim()}` : "",
    ].filter(Boolean);
    setFormData((prev) => ({ ...prev, prognosis: lines.join("\n\n") }));
  }, [longTermGoal, prognosisDuration, rehabPotential, shortTermGoal, t]);

  useEffect(() => {
    const manualLines = manualEntries.map(
      (m, i) => `${i + 1}. ${m.name} | ${m.grade} | ${m.minutes || "-"}${t.interventionMin}`,
    );
    const exerciseLines = exerciseEntries.map(
      (e, i) =>
        `${i + 1}. ${e.name} | ${e.sets || "-"} Sets × ${e.reps || "-"} Reps × Hold ${e.holdSec || "-"}${t.interventionSec}`,
    );
    const modalityLines = modalityEntries.map(
      (m, i) => `${i + 1}. ${m.modality} | ${t.modalityTargetLabel} ${m.target}`,
    );
    const none = t.manualSummaryNone;
    const blocks = [
      "[Manual Therapy]",
      ...(manualLines.length > 0 ? manualLines : [none]),
      "",
      "[Therapeutic Exercise]",
      ...(exerciseLines.length > 0 ? exerciseLines : [none]),
      "",
      "[Modalities]",
      ...(modalityLines.length > 0 ? modalityLines : [none]),
      "",
      "[Education & HEP]",
      educationHep.trim() || none,
    ];
    setFormData((prev) => ({ ...prev, intervention: blocks.join("\n") }));
  }, [educationHep, exerciseEntries, manualEntries, modalityEntries, t]);

  const dashboardResult = reportResult
    ? {
        hasRedFlag: reportResult.hasRedFlag,
        criticalAlert: reportResult.criticalAlert ?? null,
        overallScore: reportResult.overallScore ?? reportResult.complianceScore ?? 0,
        clinicalReasoning: reportResult.clinicalReasoning ?? "",
        logicChainAudit: reportResult.logicChainAudit ?? {
          status: "warning" as const,
          feedback: reportResult.clinicalReasoning ?? "논리 사슬 검증 데이터가 충분하지 않습니다.",
          missingLinks: [],
        },
        cpgCompliance:
          reportResult.cpgCompliance ??
          (reportResult.trafficLightFeedback ?? []).map((item) => ({
            intervention: item.title,
            level: item.level,
            reasoning: item.description,
            alternative: item.level === "green" ? null : "근거 기반 대체 중재를 병행하세요.",
          })),
        auditDefense: reportResult.auditDefense ?? {
          riskLevel: "Medium" as const,
          defenseScore: reportResult.overallScore ?? reportResult.complianceScore ?? 0,
          feedback: "삭감 방어력 기본 데이터가 생성되었습니다. 목표-중재-재평가 링크를 강화하세요.",
          improvementTip: "Outcome 재평가 시점과 수치 목표를 명시해 문서 방어력을 높이세요.",
        },
        predictiveTrajectory: reportResult.predictiveTrajectory ?? {
          estimatedWeeks: 8,
          trajectoryText: "현재 데이터 기준 평균 8주 회복 경로가 예상됩니다.",
        },
        interventionStrategy: reportResult.interventionStrategy ?? "",
        professionalDiscussion: reportResult.professionalDiscussion ?? "",
        differentialDiagnosis: reportResult.differentialDiagnosis ?? "",
      }
    : null;

  return (
    <div className="relative flex h-full flex-col bg-slate-50 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle className="h-6 w-6 text-indigo-600" /> {t.safetyTitle}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t.safetySubtitle}</p>
        </div>
        <div />
      </div>

      <div className="grid flex-1 grid-cols-1">
        <div className="overflow-y-auto p-8">
          <div className={`mx-auto ${evaluationResult ? "max-w-7xl" : "max-w-4xl"}`}>
          {!evaluationResult ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex border-b border-slate-100">
                {steps.map((s) => (
                  <div
                    key={s.n}
                    className={`flex flex-1 flex-col items-center gap-1 py-4 transition-all ${
                      step === s.n ? "border-b-2 border-indigo-600 bg-indigo-50" : "bg-white"
                    }`}
                  >
                    <div className={step >= s.n ? "text-indigo-600" : "text-slate-300"}>{s.icon}</div>
                    <span className={`text-[10px] font-bold uppercase ${step >= s.n ? "text-indigo-700" : "text-slate-300"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-10">
                <div className="mb-8">
                  <h2 className="mb-2 text-2xl font-bold text-slate-800">
                    {step === 1
                      ? t.stepExamTitle
                      : step === 2
                        ? t.stepEvalTitle
                        : step === 3
                          ? t.stepGoalTitle
                          : t.stepPlanTitle}
                  </h2>
                  <p className="mb-6 text-sm text-slate-500">{t.step1Subtitle}</p>
                  {showCloudDraftPrompt && pendingCloudDraft ? (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <p className="font-semibold">
                        💡 {locale === "en"
                          ? "A previously saved draft exists. Would you like to load it?"
                          : "이전에 작성 중이던 임시 저장 기록이 있습니다. 불러오시겠습니까?"}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            applyDraftPayload(pendingCloudDraft);
                            setShowCloudDraftPrompt(false);
                          }}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600"
                        >
                          {locale === "en" ? "Load draft" : "불러오기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCloudDraftPrompt(false)}
                          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          {locale === "en" ? "Dismiss" : "닫기"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="mb-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{t.linkPatient}</label>
                          <select
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">{patientsLoading ? t.loadingPatients : t.selectPatient}</option>
                            {patients.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.birthDate || t.patientDobMissing})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{t.bodyRegion}</label>
                          <select
                            name="diagnosisArea"
                            value={formData.diagnosisArea}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">{t.selectRegion}</option>
                            <option value="neck">Neck (경추)</option>
                            <option value="shoulder">Shoulder (견관절)</option>
                            <option value="elbow">Elbow (주관절)</option>
                            <option value="wrist">Wrist (수관절)</option>
                            <option value="hand">Hand (수부)</option>
                            <option value="lumbar">Lumbar (요추)</option>
                            <option value="hip">Hip (고관절)</option>
                            <option value="knee">Knee (슬관절)</option>
                            <option value="ankle">Ankle (족관절)</option>
                            <option value="foot">Foot (족부)</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{t.outputLangLabel}</label>
                          <select
                            name="language"
                            value={formData.language}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="ko">{t.langOptKo}</option>
                            <option value="en">{t.langOptEn}</option>
                            <option value="ja">{t.langOptJa}</option>
                            <option value="vi">{t.langOptVi}</option>
                            <option value="th">{t.langOptTh}</option>
                          </select>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">{t.chiefSection}</label>
                        <input
                          value={examDraft.chiefComplaint}
                          onChange={(e) => handleExamDraftChange({ chiefComplaint: e.target.value })}
                          placeholder={t.chiefPlaceholderShort}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t.onsetSection}</p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {ONSET_OPTIONS.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handleExamDraftChange({ onset: item })}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                examDraft.onset === item
                                  ? "border border-rose-200 bg-rose-100 text-rose-700"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {onsetLabel(item, locale)}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {TRAUMA_OPTIONS.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => handleExamDraftChange({ traumaType: item })}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                examDraft.traumaType === item
                                  ? "border border-indigo-200 bg-indigo-100 text-indigo-700"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {traumaLabel(item, locale)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t.painSection}</p>
                        <div className="mb-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-500">
                            {t.vasLabelPrefix}: {examDraft.vas}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={examDraft.vas}
                            onChange={(e) => handleExamDraftChange({ vas: Number(e.target.value) })}
                            className="w-full accent-rose-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PAIN_QUALITY_OPTIONS.map((item) => {
                            const active = examDraft.painQualities.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => handlePainQualityToggle(item)}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                  active
                                    ? "border border-rose-200 bg-rose-100 text-rose-700"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {painQualityLabel(item, locale)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t.aggravatingRelievingSection}</p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">{t.aggravatingLong}</label>
                            <input
                              value={examDraft.aggravatingFactors}
                              onChange={(e) => handleExamDraftChange({ aggravatingFactors: e.target.value })}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">{t.relievingLong}</label>
                            <input
                              value={examDraft.relievingFactors}
                              onChange={(e) => handleExamDraftChange({ relievingFactors: e.target.value })}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold uppercase text-slate-500">{t.screeningSectionTitle}</p>
                          {screeningRegion ? (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-100">
                              {screeningRegion === "neck" || screeningRegion === "lumbar" ? t.groupSpine : t.groupJoint} ·{" "}
                              {screeningRegion}
                            </span>
                          ) : null}
                        </div>
                        {!formData.diagnosisArea.trim() ? (
                          <p className="text-sm italic text-slate-400">
                            상단에서 진단 부위를 선택하면 해당 부위에 맞는 특이 질문이 나타납니다.
                          </p>
                        ) : !screeningRegion ? (
                          <p className="text-sm text-amber-700">
                            선택한 부위에 대한 스크리닝 템플릿이 없습니다. 일반 레드플래그 항목을 이용해 주세요.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {getScreeningQuestionsForRegion(screeningRegion).map((q) => {
                              const on = Boolean(screeningAnswers[q.id]);
                              const rf = q.isRedFlag;
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => toggleScreeningQuestion(q.id)}
                                  className={`flex gap-2 rounded-xl border-2 p-3 text-left text-sm font-medium leading-snug transition ${
                                    rf
                                      ? on
                                        ? "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-200"
                                        : "border-rose-200 bg-rose-50/50 text-slate-800 hover:border-rose-400"
                                      : on
                                        ? "border-blue-400 bg-blue-50 text-blue-950"
                                        : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  {rf ? (
                                    <AlertTriangle
                                      className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                                      aria-hidden
                                    />
                                  ) : (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" aria-hidden />
                                  )}
                                  <span className="min-w-0 flex-1">
                                    {rf && (
                                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                        Red Flag 의심
                                      </span>
                                    )}
                                    {q.text}
                                    <span className="mt-2 block text-[10px] font-bold text-slate-500">
                                      {on ? "예 · 해당됨" : "아니오 · 해당 없음 (탭하여 변경)"}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/90 p-4 shadow-sm ring-1 ring-rose-100">
                        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-rose-700">
                          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                          6. 전신 레드플래그 스크리닝 (Systemic Red Flags)
                        </p>
                        <p className="mb-3 text-[11px] text-rose-800/90">
                          악성·감염·전신 질환 감별에 필요한 항목입니다. 해당 시 반드시 표시해 주세요.
                        </p>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          {[
                            ["nightPain", "야간통(Night Pain)"],
                            ["weightLoss", "체중 감소(Weight Loss)"],
                            ["neuroBowelBladder", "감각/대소변 이상"],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleRedFlagToggle(key as keyof ExamDraft["redFlags"])}
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                examDraft.redFlags[key as keyof ExamDraft["redFlags"]]
                                  ? "border-rose-500 bg-rose-100 text-rose-900 ring-2 ring-rose-200"
                                  : "border-rose-200 bg-white text-slate-600 hover:border-rose-300"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 text-left">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600 opacity-80" aria-hidden />
                                {label}
                              </span>
                              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-rose-800 ring-1 ring-rose-100">
                                {examDraft.redFlags[key as keyof ExamDraft["redFlags"]] ? "ON" : "OFF"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">7. 기타 메모 (Other Notes)</label>
                        <textarea
                          value={examDraft.otherNotes}
                          onChange={(e) => handleExamDraftChange({ otherNotes: e.target.value })}
                          className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">AI 입력용 자동 요약 (Examination)</p>
                        <p className="text-sm leading-relaxed text-slate-700">{formData.examination}</p>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 && selectedDiagnosisKey && selectedRegionEvidence ? (
                    <div className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step 2 Data-Driven Assessment</p>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">추천 이학적 검사 (Special Tests)</p>
                        <div className="space-y-3">
                          {recommendedTests.map((test) => {
                            const selected = specialTestSelection[test];
                            return (
                              <div key={test} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 md:flex-row md:items-center md:justify-between">
                                <p className="text-sm font-semibold text-slate-700">{test}</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSpecialTestToggle(test, "positive")}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                      selected === "positive"
                                        ? "border border-rose-200 bg-rose-100 text-rose-700"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-rose-50"
                                    }`}
                                  >
                                    양성(+)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSpecialTestToggle(test, "negative")}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                      selected === "negative"
                                        ? "border border-blue-200 bg-blue-100 text-blue-700"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-blue-50"
                                    }`}
                                  >
                                    음성(-)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSpecialTestToggle(test, "not_tested")}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                      selected === "not_tested"
                                        ? "border border-slate-300 bg-slate-200 text-slate-700"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    미실시
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 space-y-3">
                          <button
                            type="button"
                            onClick={addCustomSpecialTest}
                            className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:bg-indigo-50/40"
                          >
                            + 추가 이학적 검사 기입
                          </button>

                          {customSpecialTests.map((row) => (
                            <div
                              key={row.id}
                              className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                            >
                              <input
                                value={row.name}
                                onChange={(e) => updateCustomSpecialTestName(row.id, e.target.value)}
                                placeholder="검사명 입력 (예: Thessaly Test)"
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateCustomSpecialTestResult(row.id, "양성")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    row.result === "양성"
                                      ? "border border-indigo-200 bg-indigo-100 text-indigo-700"
                                      : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50"
                                  }`}
                                >
                                  양성
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateCustomSpecialTestResult(row.id, "음성")}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    row.result === "음성"
                                      ? "border border-indigo-200 bg-indigo-100 text-indigo-700"
                                      : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50"
                                  }`}
                                >
                                  음성
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCustomSpecialTest(row.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                aria-label="추가 검사 삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <ObjectiveEvaluation
                        movements={selectedRegionEvidence.rom}
                        romMmtInputs={romMmtInputs}
                        onPatchSide={handleRomMmtChange}
                        onReplaceMovementRow={handleRomMmtReplaceRow}
                        locale={locale}
                      />

                      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          JOSPT 치료 기반 분류 (TBC) 선택
                        </h3>
                        <p className="mb-4 text-xs text-slate-500">
                          환자의 핵심 기능적 결함을 선택하세요. AI가 최적의 중재 가이드라인을 매핑합니다.
                        </p>

                        <div className="flex flex-wrap gap-2 overflow-visible">
                          {selectedTbcOptions.length > 0 ? (
                            selectedTbcOptions.map((item, idx) => (
                              <div
                                key={`${item.label}-${idx}`}
                                className="group relative inline-flex max-w-full items-center gap-1 overflow-visible"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleTbcToggle(item.label)}
                                  className={`rounded-full border px-4 py-2 text-left text-sm font-medium transition-all ${
                                    selectedTbcTags.includes(item.label)
                                      ? "border-blue-300 bg-blue-50 text-blue-700"
                                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                                >
                                  {item.label}
                                </button>
                                <span className="inline-flex shrink-0 cursor-help text-slate-400 transition-colors hover:text-slate-600">
                                  <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                </span>
                                <div
                                  role="tooltip"
                                  className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 translate-y-1 rounded-lg bg-slate-800 px-3 py-2 text-left text-xs leading-relaxed text-white opacity-0 shadow-lg transition-all duration-200 ease-out [text-wrap:pretty] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                                >
                                  <span className="block font-semibold text-slate-100">{t.tbcTooltipTitle}</span>
                                  <span className="mt-1 block font-normal text-white/95">{item.description}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm italic text-slate-400">먼저 Step 1에서 진단 부위를 선택해 주세요.</span>
                          )}
                        </div>
                      </div>

                      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          기능 평가 척도 (Outcome Measures) 점수 입력
                        </h3>
                        <p className="mb-4 text-xs text-slate-500">
                          입력하신 객관적 점수는 AI의 치료 예후(Prognosis) 예측에 활용됩니다.
                        </p>

                        {formData.diagnosisArea && selectedOutcomeOptions.length > 0 ? (
                          <>
                            <div className="mb-4 flex flex-wrap gap-2">
                              {selectedOutcomeOptions.map((o) => (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => setSelectedOutcomeTool(o.id)}
                                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                                    selectedOutcomeTool === o.id
                                      ? "bg-blue-700 text-white shadow-md shadow-blue-700/30"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  [{outcomeMeasureChipLabel(o.id)}]
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setSelectedOutcomeTool("manual")}
                                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                                  selectedOutcomeTool === "manual"
                                    ? "bg-blue-700 text-white shadow-md shadow-blue-700/30"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                [직접 입력]
                              </button>
                            </div>

                            {selectedOutcomeTool === "manual" ? (
                              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-4">
                                <p className="text-xs font-bold text-slate-700">목록에 없는 척도 직접 입력</p>
                                <input
                                  value={manualOutcomeName}
                                  onChange={(e) => setManualOutcomeName(e.target.value)}
                                  placeholder="척도 이름 (예: Constant-Murley)"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <div className="flex flex-wrap items-end gap-3">
                                  <div>
                                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">점수</label>
                                    <input
                                      type="number"
                                      value={manualOutcomeScore}
                                      onChange={(e) => setManualOutcomeScore(e.target.value)}
                                      className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>
                                  <div className="min-w-[10rem] flex-1">
                                    <label className="mb-1 block text-[10px] font-semibold text-slate-500">만점·단위 (선택)</label>
                                    <input
                                      value={manualOutcomeMax}
                                      onChange={(e) => setManualOutcomeMax(e.target.value)}
                                      placeholder="예: 100점, %"
                                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const name = manualOutcomeName.trim();
                                    const score = manualOutcomeScore.trim();
                                    if (!name || !score) return;
                                    const suffix = manualOutcomeMax.trim() ? ` (${manualOutcomeMax.trim()})` : "";
                                    const nextLine = `[평가 척도] ${name} : ${score}${suffix}`;
                                    setFormData((prev) => ({
                                      ...prev,
                                      evaluation: prev.evaluation ? `${prev.evaluation}\n${nextLine}` : nextLine,
                                      step2: {
                                        functionalScore: Number.parseFloat(score) || 0,
                                        functionalComment: `${name} 평가 ${score}${suffix} (직접 입력)`,
                                        measureKey: "custom",
                                        measureName: name,
                                        outcomeId: "manual",
                                      },
                                    }));
                                    setOutcomeScores((prev) => ({ ...prev, manual: score }));
                                  }}
                                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                >
                                  노트에 기록 · Step2 요약 반영
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-blue-900">전문 기능 평가 (Outcome Measure)</h4>
                                    <p className="text-xs text-blue-600">
                                      선택: [{outcomeMeasureChipLabel(selectedOutcomeTool)}] · 부위:{" "}
                                      {formData.diagnosisArea.trim() || "미선택"}
                                    </p>
                                    {formData.step2 &&
                                    (formData.step2.outcomeId === selectedOutcomeTool ||
                                      (formData.step2.outcomeId == null && selectedOutcomeTool !== "manual")) ? (
                                      <p className="mt-2 rounded-lg border border-blue-100/80 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-sm">
                                        <span className="font-bold text-blue-700">
                                          {formData.step2.measureName}: {formData.step2.functionalScore}%
                                        </span>
                                        <span className="mt-0.5 block text-slate-600">{formData.step2.functionalComment}</span>
                                      </p>
                                    ) : formData.step2 &&
                                      formData.step2.outcomeId &&
                                      formData.step2.outcomeId !== selectedOutcomeTool ? (
                                      <p className="mt-2 text-[11px] text-slate-500">
                                        다른 척도로 저장된 Step2 요약이 있습니다. 해당 척도 탭을 선택하면 표시됩니다.
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-[11px] text-slate-500">
                                        클릭형 평가는 NDI·ODI·QuickDASH·WOMAC 등 지원 척도에서만 사용할 수 있습니다.
                                      </p>
                                    )}
                                  </div>
                                  {getModalRegionForOutcomeId(selectedOutcomeTool) ? (
                                    <button
                                      type="button"
                                      onClick={() => setMeasureModalOpen(true)}
                                      disabled={!formData.diagnosisArea.trim()}
                                      className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden />
                                      척도 평가 시작
                                    </button>
                                  ) : (
                                    <p className="max-w-[11rem] shrink-0 text-right text-[11px] font-medium leading-snug text-slate-500">
                                      이 척도는 수동 점수 입력만 지원합니다.
                                    </p>
                                  )}
                                </div>

                                {selectedOutcomeOptions
                                  .filter((o) => o.id === selectedOutcomeTool)
                                  .map((outcome) => (
                                    <div
                                      key={outcome.id}
                                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
                                    >
                                      <label className="text-xs font-bold text-slate-700">{outcome.name}</label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          max={outcome.max}
                                          min={0}
                                          value={outcomeScores[outcome.id] ?? ""}
                                          onChange={(e) => handleOutcomeScoreChange(outcome.id, e.target.value)}
                                          placeholder="점수"
                                          className="w-24 rounded-lg border border-slate-200 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-medium text-slate-400">
                                          / {outcome.max}
                                          {outcome.unit}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleOutcomeAppendToNote(outcome)}
                                          className="ml-auto rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                                        >
                                          노트에 기록
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-sm italic text-slate-400">먼저 Step 1에서 진단 부위를 선택해 주세요.</span>
                        )}
                      </div>

                      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          ICF 모델 결함 요약 (Impairment Summary)
                        </h3>

                        {selectedIcfOptions ? (
                          <div className="space-y-5">
                            <div>
                              <h4 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                                <span className="text-rose-500">■</span> Body Functions & Structures (신체 손상)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedIcfOptions.impairment.map((item, idx) => (
                                  <button
                                    key={`imp-${idx}`}
                                    type="button"
                                    onClick={(e) => handleAppendICF(item, "impairment", e)}
                                    className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                                  >
                                    + {item}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                                <span className="text-amber-500">■</span> Activities (활동 제한)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedIcfOptions.activity.map((item, idx) => (
                                  <button
                                    key={`act-${idx}`}
                                    type="button"
                                    onClick={(e) => handleAppendICF(item, "activity", e)}
                                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                                  >
                                    + {item}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                                <span className="text-indigo-500">■</span> Participation (참여 제약)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedIcfOptions.participation.map((item, idx) => (
                                  <button
                                    key={`part-${idx}`}
                                    type="button"
                                    onClick={(e) => handleAppendICF(item, "participation", e)}
                                    className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                                  >
                                    + {item}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm italic text-slate-400">먼저 Step 1에서 진단 부위를 선택해 주세요.</span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step 3 Prognosis & SMART Goals</p>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <label className="mb-2 block text-xs font-bold uppercase text-slate-500">예상 치료 기간 (Prognosis)</label>
                          <select
                            value={prognosisDuration}
                            onChange={(e) => setPrognosisDuration(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-300"
                          >
                            <option value="">{t.selectDuration}</option>
                            {prognosisWeekOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <p className="mb-2 text-xs font-bold uppercase text-slate-500">재활 잠재력 (Rehab Potential)</p>
                          <div className="grid grid-cols-2 gap-2">
                            {REHAB_POTENTIAL_OPTIONS.map((opt) => {
                              const active = rehabPotential === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setRehabPotential(opt)}
                                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                    active
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <p className="mb-2 text-xs font-bold uppercase text-slate-500">단기 목표 (STG)</p>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => appendGoalText("short", `[기초 데이터] VAS ${examDraft.vas}/10`)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                            >
                              VAS 불러오기
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const icfLine = formData.evaluation.split("\n").find((line) => line.startsWith("[ICF - 활동제한]"));
                                appendGoalText("short", icfLine ?? "[ICF - 활동제한] 데이터 없음");
                              }}
                              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                            >
                              ICF 활동제한 불러오기
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const outcomeLine = formData.evaluation.split("\n").find((line) => line.startsWith("[평가 척도]"));
                                appendGoalText("short", outcomeLine ?? "[평가 척도] 데이터 없음");
                              }}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Outcome 점수 불러오기
                            </button>
                          </div>
                          <textarea
                            value={shortTermGoal}
                            onChange={(e) => setShortTermGoal(e.target.value)}
                            className="h-44 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            placeholder="2-4주 내 달성할 구체적이고 측정 가능한 목표를 입력하세요."
                          />
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <p className="mb-2 text-xs font-bold uppercase text-slate-500">장기 목표 (LTG)</p>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => appendGoalText("long", `[기초 데이터] 진단 부위: ${formData.diagnosisArea || "미선택"}`)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                            >
                              진단 부위 불러오기
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const icfLine = formData.evaluation.split("\n").find((line) => line.startsWith("[ICF - 참여제약]"));
                                appendGoalText("long", icfLine ?? "[ICF - 참여제약] 데이터 없음");
                              }}
                              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              ICF 참여제약 불러오기
                            </button>
                            <button
                              type="button"
                              onClick={() => appendGoalText("long", rehabPotential ? `[Rehab Potential] ${rehabPotential}` : "[Rehab Potential] 미선택")}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              예후 정보 불러오기
                            </button>
                          </div>
                          <textarea
                            value={longTermGoal}
                            onChange={(e) => setLongTermGoal(e.target.value)}
                            className="h-44 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            placeholder="6-12주 이상 장기 기능회복 및 복귀 목표를 입력하세요."
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step 4 APTA 4-Category Intervention System</p>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">1. 도수/수기 치료 (Manual Therapy)</h3>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <input
                            value={manualDraft.name}
                            onChange={(e) => setManualDraft((p) => ({ ...p, name: e.target.value }))}
                            placeholder="중재명"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          />
                          <select
                            value={manualDraft.grade}
                            onChange={(e) => setManualDraft((p) => ({ ...p, grade: e.target.value as ManualTherapyEntry["grade"] }))}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          >
                            {["Grade I", "Grade II", "Grade III", "Grade IV", "Grade V", "Soft Tissue", "Neural"].map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={manualDraft.minutes}
                            onChange={(e) => setManualDraft((p) => ({ ...p, minutes: e.target.value }))}
                            placeholder="적용 시간(분)"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
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
                          {manualEntries.map((m, idx) => (
                            <p key={`${m.name}-${idx}`}>• {m.name} | {m.grade} | {m.minutes || "-"}분</p>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">2. 치료적 운동 (Therapeutic Exercise)</h3>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                          <input
                            value={exerciseDraft.name}
                            onChange={(e) => setExerciseDraft((p) => ({ ...p, name: e.target.value }))}
                            placeholder="운동명"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          />
                          <input
                            type="number"
                            value={exerciseDraft.sets}
                            onChange={(e) => setExerciseDraft((p) => ({ ...p, sets: e.target.value }))}
                            placeholder="Sets"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          />
                          <input
                            type="number"
                            value={exerciseDraft.reps}
                            onChange={(e) => setExerciseDraft((p) => ({ ...p, reps: e.target.value }))}
                            placeholder="Reps"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          />
                          <input
                            type="number"
                            value={exerciseDraft.holdSec}
                            onChange={(e) => setExerciseDraft((p) => ({ ...p, holdSec: e.target.value }))}
                            placeholder="Hold(초)"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
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
                          {exerciseEntries.map((e, idx) => (
                            <p key={`${e.name}-${idx}`}>• {e.name} | {e.sets || "-"}x{e.reps || "-"} | Hold {e.holdSec || "-"}초</p>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">3. 기기 및 물리치료 (Modalities)</h3>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <select
                            value={modalityDraft.modality}
                            onChange={(e) => setModalityDraft((p) => ({ ...p, modality: e.target.value as ModalityEntry["modality"] }))}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
                          >
                            {["Hot/Cold Pack", "Ultrasound", "TENS/ICT", "Traction", "ESWT", "Laser"].map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <input
                            value={modalityDraft.target}
                            onChange={(e) => setModalityDraft((p) => ({ ...p, target: e.target.value }))}
                            placeholder="적용 부위"
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300"
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
                          {modalityEntries.map((m, idx) => (
                            <p key={`${m.modality}-${idx}`}>• {m.modality} | 적용 부위: {m.target}</p>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">4. 환자 교육 및 홈 프로그램 (Education & HEP)</h3>
                        <textarea
                          value={educationHep}
                          onChange={(e) => setEducationHep(e.target.value)}
                          className="h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          placeholder="자세 교정, 금기 동작, 자가 운동, 복약/생활 지도 내용을 상세 기록하세요."
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">AI 입력용 자동 요약 (Intervention)</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{formData.intervention}</p>
                      </div>
                    </div>
                  ) : null}

                  {step !== 1 && step !== 3 && step !== 4 ? (
                    <textarea
                      name={currentField}
                      value={currentValue}
                      onChange={handleChange}
                      className="h-64 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-6 leading-relaxed text-slate-700 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-50/50"
                      placeholder="임상적 근거를 바탕으로 상세 내용을 입력하세요..."
                    />
                  ) : null}
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

                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDraftSave}
                      disabled={isDraftSaving}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isDraftSaving
                        ? locale === "en"
                          ? "Saving draft..."
                          : "임시 저장 중..."
                        : locale === "en"
                          ? "Save Draft"
                          : "임시 저장하기"}
                    </button>
                    {draftSavedAt ? (
                      <p className="text-xs text-slate-500">
                        {locale === "en" ? `Draft saved (${draftSavedAt})` : `임시 저장되었습니다 (${draftSavedAt})`}
                      </p>
                    ) : null}
                  </div>

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
                      onClick={() => void handleAnalyze()}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 px-10 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      {isLoading ? (
                        <>
                          <Activity className="h-5 w-5 animate-spin" /> Scanning for Red Flags...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5" /> {t.analyze}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <DashboardRightPanel
              locale={locale}
              result={dashboardResult}
              isLoading={isLoading}
              savePayloadPatientId={effectivePatientId || null}
              onSaveRecord={() => void handleSaveDiagnosisRecord()}
              onRetrySave={() => void handleSaveDiagnosisRecord()}
              isSaving={isSaving}
              saveStatus={saveStatus}
              saveErrorMessage={saveErrorMessage}
            />
          )}
          </div>
        </div>
        <MeasureModal
          open={measureModalOpen}
          onClose={() => setMeasureModalOpen(false)}
          diagnosisArea={formData.diagnosisArea}
          locale={locale}
          activeOutcomeId={selectedOutcomeTool !== "manual" ? selectedOutcomeTool : null}
          onApply={(payload: Step2OutcomePayload) => {
            const oid = payload.outcomeId ?? (selectedOutcomeTool !== "manual" ? selectedOutcomeTool : undefined);
            setFormData((prev) => ({
              ...prev,
              step2: { ...payload, outcomeId: oid },
            }));
            if (oid && oid !== "manual") {
              setOutcomeScores((prev) => ({ ...prev, [oid]: String(payload.functionalScore) }));
            }
          }}
        />

        {showProPaywall ? (
          <div
            className="absolute inset-0 z-[40] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-paywall-title"
          >
            <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/90 bg-white p-8 shadow-2xl ring-1 ring-slate-900/5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f172a]/70">
                {locale === "en" ? "Re:PhyT Pro" : "Re:PhyT Pro"}
              </p>
              <h2 id="pro-paywall-title" className="mt-2 text-xl font-black tracking-tight text-[#0f172a]">
                {locale === "en" ? "Unlock unlimited reports" : "무제한 리포트 이용"}
              </h2>
              <p className="mt-5 text-[15px] font-medium leading-relaxed text-slate-600">
                {locale === "en" ? (
                  <>
                    You&apos;ve used all free report generations for this month. Upgrade to Pro for unlimited
                    reports and stronger audit-defense insights.
                  </>
                ) : (
                  <>
                    한 달 무료 이용 횟수를 모두 소진하셨습니다. 무제한 리포트와 삭감 방어 기능을 위해 Pro 플랜으로 업그레이드하세요!
                  </>
                )}
              </p>
              {paywallUsage ? (
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  {locale === "en" ? "This month: " : "이번 달 사용: "}
                  <span className="font-mono text-[#0f172a]">
                    {paywallUsage.used}/{paywallUsage.limit}
                  </span>
                </p>
              ) : null}
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href={`/${locale}/pricing`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f172a] px-6 py-3.5 text-center text-[15px] font-black text-white shadow-md transition hover:bg-[#1e293b] active:scale-[0.99]"
                >
                  {locale === "en" ? "Upgrade to Pro" : "Pro 업그레이드 하기"}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowProPaywall(false)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  {locale === "en" ? "Not now" : "나중에"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SoapNewPageClient({ dict: _dict, locale }: Props) {
  return <RedFlagMentor locale={locale} />;
}
