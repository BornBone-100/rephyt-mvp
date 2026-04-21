"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/utils/supabase/client";
import { JOSPT_ICF_DB, JOSPT_OUTCOME_DB, JOSPT_TBC_DB } from "./constants";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
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
};

type ExamOnset = "급성(Acute)" | "아급성(Subacute)" | "만성(Chronic)";
type ExamTrauma = "외상성(Traumatic)" | "비외상성(Non-traumatic)";
type PainQuality = "날카로운" | "쑤시는" | "저리는" | "타는듯한" | "뻐근한" | "묵직한";

type ExamDraft = {
  chiefComplaint: string;
  onset: ExamOnset;
  traumaType: ExamTrauma;
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

const PAIN_QUALITY_OPTIONS: PainQuality[] = ["날카로운", "쑤시는", "저리는", "타는듯한", "뻐근한", "묵직한"];

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

const SPECIAL_TEST_LABEL: Record<SpecialTestValue, string> = {
  positive: "양성(+)",
  negative: "음성(-)",
  not_tested: "미실시",
};

const END_FEEL_OPTIONS = ["Normal", "Hard", "Soft", "Firm", "Empty"] as const;
const MMT_OPTIONS = ["5", "4+", "4", "4-", "3+", "3", "3-", "2", "1", "0"] as const;
const PROGNOSIS_DURATION_OPTIONS = ["1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주", "9주", "10주", "11주", "12주 이상"] as const;
const REHAB_POTENTIAL_OPTIONS = ["Excellent", "Good", "Fair", "Poor"] as const;

type RomMmtInput = {
  arom: string;
  prom: string;
  endFeel: string;
  mmt: string;
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

type IcfSelectionState = {
  impairment: string[];
  activity: string[];
  participation: string[];
};

type GuardrailPayload = {
  examination: string;
  evaluation: string;
  prognosis: string;
  intervention: string;
  step4: string;
  language: string;
};

function resolveDiagnosisKey(raw: string): keyof typeof SPECIAL_TESTS_DB | null {
  const v = raw.trim().split(" ")[0].toLowerCase();
  if (!v) return null;
  return (v in SPECIAL_TESTS_DB ? (v as keyof typeof SPECIAL_TESTS_DB) : null);
}

function upsertSpecialTestLine(text: string, testName: string, valueLabel: string) {
  const line = `${testName}: ${valueLabel}`;
  const escaped = testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}:.*$`, "m");
  if (re.test(text)) {
    return text.replace(re, line);
  }
  return text.trim() ? `${text.trim()}\n${line}` : line;
}

function appendUniqueLine(text: string, line: string) {
  const trimmed = text.trim();
  if (!line.trim()) return trimmed;
  if (!trimmed) return line;
  const lines = trimmed.split("\n");
  if (lines.includes(line)) return trimmed;
  return `${trimmed}\n${line}`;
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

function composeExaminationSummary(draft: ExamDraft) {
  const qualityText = draft.painQualities.length > 0 ? draft.painQualities.join(", ") : "미기재";
  const redFlags = [
    draft.redFlags.nightPain ? "야간통" : null,
    draft.redFlags.weightLoss ? "체중 감소" : null,
    draft.redFlags.neuroBowelBladder ? "감각/대소변 이상" : null,
  ].filter(Boolean);

  return [
    `주소증: ${draft.chiefComplaint || "미기재"}`,
    `발병: ${draft.onset} (${draft.traumaType})`,
    `VAS: ${draft.vas}`,
    `통증 양상: ${qualityText}`,
    `가중 요인: ${draft.aggravatingFactors || "미기재"}`,
    `완화 요인: ${draft.relievingFactors || "미기재"}`,
    `Red Flag: ${redFlags.length > 0 ? redFlags.join(", ") : "특이사항 없음"}`,
    `기타 메모: ${draft.otherNotes || "없음"}`,
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
};

const STEP_FIELD_MAP: Record<number, keyof FormData> = {
  1: "examination",
  2: "evaluation",
  3: "prognosis",
  4: "intervention",
};

function RedFlagMentor() {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [reportResult, setReportResult] = useState<RedFlagResult | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<RedFlagResult | null>(null);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    patientId: "",
    diagnosisArea: "",
    language: "ko",
    examination: "",
    evaluation: "",
    prognosis: "",
    intervention: "",
    todayTreatment: "",
  });
  const [examDraft, setExamDraft] = useState<ExamDraft>({
    chiefComplaint: "",
    onset: "급성(Acute)",
    traumaType: "비외상성(Non-traumatic)",
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
  const [selectedTbcTags, setSelectedTbcTags] = useState<string[]>([]);
  const [romMmtInputs, setRomMmtInputs] = useState<Record<string, RomMmtInput>>({});
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
    setFormData((prev) => ({ ...prev, examination: composeExaminationSummary(examDraft) }));
  }, [examDraft]);

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

  const handleSpecialTestToggle = (testName: string, value: SpecialTestValue) => {
    if (step !== 2) return;
    setSpecialTestSelection((prev) => ({ ...prev, [testName]: value }));
    setFormData((prev) => ({
      ...prev,
      evaluation: upsertSpecialTestLine(prev.evaluation, testName, SPECIAL_TEST_LABEL[value]),
    }));
  };

  const handleRomMmtChange = (movement: string, patch: Partial<RomMmtInput>) => {
    setRomMmtInputs((prev) => ({
      ...prev,
      [movement]: {
        arom: prev[movement]?.arom ?? "",
        prom: prev[movement]?.prom ?? "",
        endFeel: prev[movement]?.endFeel ?? "Normal",
        mmt: prev[movement]?.mmt ?? "",
        ...patch,
      },
    }));
  };

  const handleOutcomeScoreChange = (measureName: string, value: string) => {
    setOutcomeScores((prev) => ({ ...prev, [measureName]: value }));
  };

  const handleOutcomeAppendToNote = (outcome: { id: string; name: string; max: number; unit: string }) => {
    const inputVal = (outcomeScores[outcome.id] ?? "").trim();
    if (!inputVal) return;

    const nextLine = `[평가 척도] ${outcome.name} : ${inputVal}/${outcome.max}${outcome.unit}`;
    setFormData((prev) => ({
      ...prev,
      evaluation: prev.evaluation ? `${prev.evaluation}\n${nextLine}` : nextLine,
    }));
    setOutcomeScores((prev) => ({ ...prev, [outcome.id]: "" }));
  };

  const handleTbcToggle = (tbcTag: string) => {
    setSelectedTbcTags((prev) => {
      const exists = prev.includes(tbcTag);
      const line = `[TBC 분류] ${tbcTag}`;
      setFormData((fd) => ({
        ...fd,
        evaluation: exists ? removeExactLine(fd.evaluation, line) : appendUniqueLine(fd.evaluation, line),
      }));
      return exists ? prev.filter((v) => v !== tbcTag) : [...prev, tbcTag];
    });
  };

  const handleAppendICF = (
    item: string,
    categoryLabel: "신체손상" | "활동제한" | "참여제약",
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    event?.currentTarget.blur();
    const line = `[ICF - ${categoryLabel}] ${item}`;
    const key =
      categoryLabel === "신체손상" ? "impairment" : categoryLabel === "활동제한" ? "activity" : "participation";
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
    try {
      const treatmentText = formatPlanToTreatment(
        manualEntries,
        exerciseEntries,
        modalityEntries,
        educationHep,
      );
      setFormData((prev) => ({ ...prev, todayTreatment: treatmentText }));
      const step4Structured = {
        manual: manualEntries ?? [],
        exercise: exerciseEntries ?? [],
        modalities: modalityEntries ?? [],
        education: educationHep?.trim() || "",
      };
      const payload: GuardrailPayload = {
        examination: formData.examination.trim(),
        evaluation: formData.evaluation.trim(),
        prognosis: formData.prognosis.trim(),
        intervention: treatmentText || formData.intervention.trim(),
        step4: JSON.stringify(step4Structured),
        language: formData.language,
      };
      const res = await fetch("/api/cdss-guardrail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Red Flag 분석 요청 실패");
      }

      const data = (await res.json()) as RedFlagResult;
      setReportResult(data);
      setEvaluationResult(data);
      if (typeof window !== "undefined" && formData.patientId) {
        const cautionLines =
          data.cpgCompliance
            ?.filter((item) => item.level === "yellow" || item.level === "red")
            .map((item) => `${item.intervention}: ${item.reasoning}`) ?? [];
        window.localStorage.setItem(
          `rephyt:treatment-draft:${formData.patientId}`,
          JSON.stringify({
            content: treatmentText || formData.intervention.trim(),
            cautions: cautionLines,
            updatedAt: new Date().toISOString(),
          }),
        );
      }
    } catch (error) {
      console.error(error);
      alert("Red Flag 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
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
  const regionKey = formData.diagnosisArea.split(" ")[0].toLowerCase();
  const selectedDiagnosisKey = resolveDiagnosisKey(formData.diagnosisArea);
  const recommendedTests = selectedDiagnosisKey
    ? SPECIAL_TESTS_DB[regionKey as keyof typeof SPECIAL_TESTS_DB] ?? []
    : [];
  const selectedRegionEvidence = selectedDiagnosisKey
    ? REGION_EVIDENCE_DB[regionKey as keyof typeof REGION_EVIDENCE_DB] ?? null
    : null;
  const selectedTbcOptions = selectedDiagnosisKey
    ? JOSPT_TBC_DB[regionKey as keyof typeof JOSPT_TBC_DB] ?? selectedRegionEvidence?.tbc ?? []
    : [];
  const selectedOutcomeOptions = selectedDiagnosisKey
    ? JOSPT_OUTCOME_DB[regionKey as keyof typeof JOSPT_OUTCOME_DB] ?? []
    : [];
  const selectedIcfOptions = selectedDiagnosisKey
    ? JOSPT_ICF_DB[regionKey as keyof typeof JOSPT_ICF_DB] ?? null
    : null;

  useEffect(() => {
    const autoRomLines = Object.entries(romMmtInputs)
      .filter(([, row]) => row.arom || row.prom || row.mmt)
      .map(
        ([movement, row]) =>
          `[ROM/MMT] ${movement} | AROM: ${row.arom || "-"} | PROM: ${row.prom || "-"} | End Feel: ${row.endFeel || "-"} | MMT: ${
            row.mmt || "-"
          }`,
      );
    const autoOutcomeLines = selectedOutcomeOptions
      .map((o) => {
        const score = (outcomeScores[o.id] ?? "").trim();
        if (!score) return null;
        return `[평가 척도] ${o.name} : ${score}/${o.max}${o.unit}`;
      })
      .filter((v): v is string => Boolean(v));
    const autoTbcLines = selectedTbcTags.map((tbc) => `[TBC 분류] ${tbc}`);
    const autoIcfLines = [
      ...icfSelection.impairment.map((item) => `[ICF - 신체손상] ${item}`),
      ...icfSelection.activity.map((item) => `[ICF - 활동제한] ${item}`),
      ...icfSelection.participation.map((item) => `[ICF - 참여제약] ${item}`),
    ];
    const autoLines = [...autoRomLines, ...autoOutcomeLines, ...autoTbcLines, ...autoIcfLines];
    setFormData((prev) => ({
      ...prev,
      evaluation: upsertAutoObjectiveBlock(prev.evaluation, autoLines),
    }));
  }, [icfSelection, outcomeScores, romMmtInputs, selectedOutcomeOptions, selectedTbcTags]);

  useEffect(() => {
    const lines = [
      prognosisDuration ? `[예상 치료 기간] ${prognosisDuration}` : "",
      rehabPotential ? `[Rehab Potential] ${rehabPotential}` : "",
      shortTermGoal.trim() ? `[STG]\n${shortTermGoal.trim()}` : "",
      longTermGoal.trim() ? `[LTG]\n${longTermGoal.trim()}` : "",
    ].filter(Boolean);
    setFormData((prev) => ({ ...prev, prognosis: lines.join("\n\n") }));
  }, [longTermGoal, prognosisDuration, rehabPotential, shortTermGoal]);

  useEffect(() => {
    const manualLines = manualEntries.map(
      (m, i) => `${i + 1}. ${m.name} | ${m.grade} | ${m.minutes || "-"}분`,
    );
    const exerciseLines = exerciseEntries.map(
      (e, i) => `${i + 1}. ${e.name} | ${e.sets || "-"} Sets x ${e.reps || "-"} Reps x Hold ${e.holdSec || "-"}초`,
    );
    const modalityLines = modalityEntries.map((m, i) => `${i + 1}. ${m.modality} | 적용 부위: ${m.target}`);
    const blocks = [
      "[Manual Therapy]",
      ...(manualLines.length > 0 ? manualLines : ["- 없음"]),
      "",
      "[Therapeutic Exercise]",
      ...(exerciseLines.length > 0 ? exerciseLines : ["- 없음"]),
      "",
      "[Modalities]",
      ...(modalityLines.length > 0 ? modalityLines : ["- 없음"]),
      "",
      "[Education & HEP]",
      educationHep.trim() || "- 없음",
    ];
    setFormData((prev) => ({ ...prev, intervention: blocks.join("\n") }));
  }, [educationHep, exerciseEntries, manualEntries, modalityEntries]);

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
                    <div className="mb-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">환자 선택</label>
                          <select
                            name="patientId"
                            value={formData.patientId}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">{patientsLoading ? "환자 목록 로딩 중..." : "환자를 선택하세요"}</option>
                            {patients.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.birthDate || "생년월일 미등록"})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">진단 부위</label>
                          <select
                            name="diagnosisArea"
                            value={formData.diagnosisArea}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">부위를 선택하세요</option>
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
                          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">출력 언어</label>
                          <select
                            name="language"
                            value={formData.language}
                            onChange={handleInputChange}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="ko">한국어 (+ 영문 의학용어)</option>
                            <option value="ja">日本語 (일본어)</option>
                            <option value="vi">Tiếng Việt (베트남어)</option>
                            <option value="th">ภาษาไทย (태국어)</option>
                          </select>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">1. 주요 호소 증상 (Chief Complaint)</label>
                        <input
                          value={examDraft.chiefComplaint}
                          onChange={(e) => handleExamDraftChange({ chiefComplaint: e.target.value })}
                          placeholder="가장 불편한 부위와 증상을 간략히 적어주세요."
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">2. 발병 시기 및 경위 (Onset & Mechanism)</p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(["급성(Acute)", "아급성(Subacute)", "만성(Chronic)"] as const).map((item) => (
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
                              {item}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["외상성(Traumatic)", "비외상성(Non-traumatic)"] as const).map((item) => (
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
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">3. 통증 양상 및 강도 (Pain Pattern & Intensity)</p>
                        <div className="mb-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-500">통증 강도 (VAS): {examDraft.vas}</label>
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
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">4. 통증 가중 및 완화 요인 (Aggravating & Relieving Factors)</p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">가중 요인 (어떨 때 아픈가요?)</label>
                            <input
                              value={examDraft.aggravatingFactors}
                              onChange={(e) => handleExamDraftChange({ aggravatingFactors: e.target.value })}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">완화 요인 (어떨 때 편안한가요?)</label>
                            <input
                              value={examDraft.relievingFactors}
                              onChange={(e) => handleExamDraftChange({ relievingFactors: e.target.value })}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-rose-600">5. 레드플래그 스크리닝 (Red Flag Screening)</p>
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
                              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                examDraft.redFlags[key as keyof ExamDraft["redFlags"]]
                                  ? "border-rose-300 bg-rose-100 text-rose-700"
                                  : "border-rose-200 bg-white text-slate-600"
                              }`}
                            >
                              <span>{label}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                                {examDraft.redFlags[key as keyof ExamDraft["redFlags"]] ? "ON" : "OFF"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <label className="mb-2 block text-xs font-bold uppercase text-slate-500">6. 기타 메모 (Other Notes)</label>
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
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">ROM / PROM + End Feel + MMT</p>
                        <div className="space-y-3">
                          {selectedRegionEvidence.rom.map((movement) => {
                            const row = romMmtInputs[movement] ?? { arom: "", prom: "", endFeel: "Normal", mmt: "" };
                            return (
                              <div key={movement} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-white p-3 md:grid-cols-5">
                                <p className="text-sm font-semibold text-slate-700">{movement}</p>
                                <input
                                  value={row.arom}
                                  onChange={(e) => handleRomMmtChange(movement, { arom: e.target.value })}
                                  placeholder="AROM"
                                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-rose-300"
                                />
                                <input
                                  value={row.prom}
                                  onChange={(e) => handleRomMmtChange(movement, { prom: e.target.value })}
                                  placeholder="PROM"
                                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-rose-300"
                                />
                                <select
                                  value={row.endFeel}
                                  onChange={(e) => handleRomMmtChange(movement, { endFeel: e.target.value })}
                                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-rose-300"
                                >
                                  {END_FEEL_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={row.mmt}
                                  onChange={(e) => handleRomMmtChange(movement, { mmt: e.target.value })}
                                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-rose-300"
                                >
                                  <option value="">MMT</option>
                                  {MMT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          JOSPT 치료 기반 분류 (TBC) 선택
                        </h3>
                        <p className="mb-4 text-xs text-slate-500">
                          환자의 핵심 기능적 결함을 선택하세요. AI가 최적의 중재 가이드라인을 매핑합니다.
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {selectedTbcOptions.length > 0 ? (
                            selectedTbcOptions.map((tbcTag, idx) => (
                              <button
                                key={`${tbcTag}-${idx}`}
                                type="button"
                                onClick={() => handleTbcToggle(tbcTag)}
                                className={`rounded-full border px-4 py-2 text-left text-sm font-medium transition-all ${
                                  selectedTbcTags.includes(tbcTag)
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                }`}
                              >
                                {tbcTag}
                              </button>
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

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {formData.diagnosisArea && selectedOutcomeOptions.length > 0 ? (
                            selectedOutcomeOptions.map((outcome) => (
                              <div key={outcome.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <label className="text-xs font-bold text-slate-700">{outcome.name}</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    max={outcome.max}
                                    min={0}
                                    value={outcomeScores[outcome.id] ?? ""}
                                    onChange={(e) => handleOutcomeScoreChange(outcome.id, e.target.value)}
                                    placeholder="점수"
                                    className="w-20 rounded-lg border border-slate-200 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                            ))
                          ) : (
                            <span className="col-span-2 text-sm italic text-slate-400">먼저 Step 1에서 진단 부위를 선택해 주세요.</span>
                          )}
                        </div>
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
                                    onClick={(e) => handleAppendICF(item, "신체손상", e)}
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
                                    onClick={(e) => handleAppendICF(item, "활동제한", e)}
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
                                    onClick={(e) => handleAppendICF(item, "참여제약", e)}
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
                            <option value="">치료 기간 선택</option>
                            {PROGNOSIS_DURATION_OPTIONS.map((opt) => (
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
                          <AlertTriangle className="h-5 w-5" /> 🚀 AI 임상 스크리닝 리포트 생성
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
            reportResult
              ? {
                  hasRedFlag: reportResult.hasRedFlag,
                  criticalAlert: reportResult.criticalAlert ?? null,
                  overallScore: reportResult.overallScore ?? reportResult.complianceScore ?? 0,
                  logicChainAudit: reportResult.logicChainAudit ?? {
                    status: "warning",
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
                    riskLevel: "Medium",
                    defenseScore: reportResult.overallScore ?? reportResult.complianceScore ?? 0,
                    feedback: "삭감 방어력 기본 데이터가 생성되었습니다. 목표-중재-재평가 링크를 강화하세요.",
                    improvementTip: "Outcome 재평가 시점과 수치 목표를 명시해 문서 방어력을 높이세요.",
                  },
                  predictiveTrajectory: reportResult.predictiveTrajectory ?? {
                    estimatedWeeks: 8,
                    trajectoryText: "현재 데이터 기준 평균 8주 회복 경로가 예상됩니다.",
                  },
                }
              : null
          }
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export function SoapNewPageClient({ dict: _dict }: Props) {
  return <RedFlagMentor />;
}
