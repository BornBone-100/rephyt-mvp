"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import NeuroEntrapmentSelector from "./NeuroEntrapmentSelector";
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
import { calculateDefenseScore } from "@/lib/clinical/calculate-defense-score";
import { calculateRecoveryPrognosis } from "@/lib/clinical/calculate-recovery-prognosis";
import { VisitFollowupPanel } from "@/components/VisitFollowupPanel";
import type { VisitFollowupChangeLog } from "@/features/treatment/visit-followup-metadata";
import {
  buildTreatmentVisitMetadata,
  formatVisitFollowupContentBlock,
} from "@/features/treatment/visit-followup-metadata";
import type { Json } from "@/types/supabase-generated";

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
  /** 피부분절: 빠른 선택 + 자유 기입 */
  dermatomeQuick: string[];
  dermatomeFreeText: string;
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
  neck: [
    "Spurling test",
    "Distraction test",
    "ULTT 1 (Median)",
    "ULTT 2 (Radial)",
    "ULTT 3 (Ulnar)",
    "Tinel's sign (supraclavicular)",
    "Cervical Rotation ROM",
  ],
  shoulder: ["Neer test", "Hawkins-Kennedy", "Roos / Elevated arm stress (TOS screen)", "Empty Can", "Speed test"],
  elbow: ["Cozen test", "Mill's test", "Tinel sign (Cubital tunnel)", "Phalen's (elbow variant)", "Valgus stress test"],
  wrist: ["Finkelstein test", "Phalen's test", "Reverse Phalen", "Tinel sign (Carpal tunnel)", "TFCC load test"],
  hand: ["Froment sign", "Durkan compression test", "Bunnell-Littler test", "Allen test", "Grind test (CMC)"],
  lumbar: ["SLR (Straight Leg Raise)", "Slump test", "Femoral nerve tension test", "Prone instability test", "PAIVM"],
  hip: ["FADIR test", "FABER test", "Slump (hip bias)", "Scour test", "Trendelenburg sign"],
  knee: ["Lachman test", "McMurray test", "Anterior Drawer", "Valgus stress test"],
  ankle: ["Anterior Drawer (Ankle)", "Talar Tilt", "Squeeze test", "Thompson test"],
  foot: ["Windlass test", "Navicular drop test", "Mulder click test", "Tinel sign (Tarsal tunnel)"],
};

/** Step 3: 신경 역동학 (상·하지 공통 표시, 부위와 무관하게 기록 가능) */
const NEURODYNAMIC_TEST_KEYS = [
  "ULTT 1 (Median)",
  "ULTT 2 (Radial)",
  "ULTT 3 (Ulnar)",
  "SLR (Straight Leg Raise)",
  "Slump test",
  "Femoral nerve tension test",
] as const;

const DERMATOME_QUICK_LEVELS = ["C5", "C6", "C7", "C8", "T1", "L4", "L5", "S1"] as const;

const MYOTOME_LEVELS = ["C5", "C6", "C7", "C8", "T1", "L2", "L3", "L4", "L5", "S1"] as const;

const DTR_ROWS: { key: string; labelKo: string; labelEn: string }[] = [
  { key: "biceps", labelKo: "상완이두( C5-6 )", labelEn: "Biceps (C5-6)" },
  { key: "triceps", labelKo: "상완삼두( C7-8 )", labelEn: "Triceps (C7-8)" },
  { key: "br", labelKo: "요척골( C5-6 )", labelEn: "Brachioradialis (C5-6)" },
  { key: "patellar", labelKo: "슬건( L3-4 )", labelEn: "Patellar (L3-4)" },
  { key: "achilles", labelKo: "아킬레스( S1 )", labelEn: "Achilles (S1)" },
];

const NEURO_STATUS_OPTIONS = ["정상", "저하", "소실"] as const;

type NeuroSyndromeOption = {
  key: string;
  ko: string;
  en: string;
  descriptionKo: string;
  descriptionEn: string;
  recommendedTests: string[];
};

type NeuroSyndromeGroup = {
  groupKo: string;
  groupEn: string;
  options: NeuroSyndromeOption[];
};

const NEURO_SYNDROME_2DEPTH: Record<"upper" | "lower", NeuroSyndromeGroup[]> = {
  upper: [
    {
      groupKo: "흉곽/견갑",
      groupEn: "Thoracic / Scapular",
      options: [
        {
          key: "tos",
          ko: "TOS",
          en: "TOS",
          descriptionKo: "흉곽출구에서 신경혈관 다발 압박. 팔 저림/무거움, 자세에 따른 악화가 흔함.",
          descriptionEn: "Neurovascular compression at thoracic outlet; arm paresthesia/heaviness often posture-dependent.",
          recommendedTests: ["Adson test", "ULTT 1 (Median)"],
        },
        {
          key: "suprascapular",
          ko: "견갑상신경",
          en: "Suprascapular nerve",
          descriptionKo: "견갑상절흔 부근 포착. 외회전 약화 및 후상방 견갑부 통증이 특징.",
          descriptionEn: "Entrapment near suprascapular notch; posterior-superior shoulder pain with ER weakness.",
          recommendedTests: ["Suprascapular nerve stretch test"],
        },
      ],
    },
    {
      groupKo: "정중신경",
      groupEn: "Median nerve",
      options: [
        {
          key: "pronator",
          ko: "회내근 증후군",
          en: "Pronator syndrome",
          descriptionKo: "회내근 부위 정중신경 포착. 전완 근위부 통증과 감각 이상이 동반될 수 있음.",
          descriptionEn: "Median nerve compression at pronator region; proximal forearm pain with sensory symptoms.",
          recommendedTests: ["Pronator teres test", "ULTT 1 (Median)"],
        },
        {
          key: "ains",
          ko: "AINS",
          en: "AINS",
          descriptionKo: "전골간신경(AIN) 포착. OK 사인 약화/집기 기능 저하가 전형적.",
          descriptionEn: "Anterior interosseous nerve syndrome; weak pinch/OK sign with motor-dominant deficit.",
          recommendedTests: ["Pinch sign (AIN)", "ULTT 1 (Median)"],
        },
        {
          key: "cts",
          ko: "CTS",
          en: "CTS",
          descriptionKo: "정중신경 포착. 1~3지 저림과 야간통이 흔하며 Phalen/Tinel 양성이 많음.",
          descriptionEn: "Median nerve entrapment with nocturnal paresthesia in digits 1-3; often Phalen/Tinel positive.",
          recommendedTests: ["Phalen's test", "Tinel's sign (Carpal tunnel)", "ULTT 1 (Median)"],
        },
      ],
    },
    {
      groupKo: "척골신경",
      groupEn: "Ulnar nerve",
      options: [
        {
          key: "cubital",
          ko: "주관 증후군",
          en: "Cubital tunnel syndrome",
          descriptionKo: "주관절 내측 척골신경 포착. 4~5지 저림과 팔꿈치 굴곡 시 악화가 특징.",
          descriptionEn: "Ulnar nerve compression at cubital tunnel; paresthesia in digits 4-5 worse with elbow flexion.",
          recommendedTests: ["Tinel's sign (Cubital tunnel)", "ULTT 3 (Ulnar)"],
        },
        {
          key: "guyon",
          ko: "가이욘관 증후군",
          en: "Guyon's canal syndrome",
          descriptionKo: "손목 가이욘관 척골신경 포착. 파지 약화 및 척측 손 저림을 유발.",
          descriptionEn: "Ulnar nerve entrapment at Guyon's canal; ulnar hand paresthesia with grip weakness.",
          recommendedTests: ["Tinel's sign (Guyon canal)", "ULTT 3 (Ulnar)"],
        },
      ],
    },
    {
      groupKo: "요골신경",
      groupEn: "Radial nerve",
      options: [
        {
          key: "radial_tunnel",
          ko: "요골관 증후군",
          en: "Radial tunnel syndrome",
          descriptionKo: "요골신경 심부 가지 포착. 외상과통과 유사하나 신경통 양상이 동반될 수 있음.",
          descriptionEn: "Deep radial branch entrapment; may mimic lateral epicondylalgia with neuropathic features.",
          recommendedTests: ["Radial tunnel provocation", "ULTT 2 (Radial)"],
        },
        {
          key: "pins",
          ko: "PINS",
          en: "PINS",
          descriptionKo: "후골간신경 포착. 손목/손가락 신전 약화 등 운동신경성 증상이 두드러짐.",
          descriptionEn: "Posterior interosseous nerve syndrome; motor-dominant weakness of finger/wrist extension.",
          recommendedTests: ["Middle finger extension test", "ULTT 2 (Radial)"],
        },
        {
          key: "wartenberg",
          ko: "Wartenberg 증후군",
          en: "Wartenberg's syndrome",
          descriptionKo: "표재요골신경 포착. 손등 요측부 감각 이상/타는 듯한 통증이 특징.",
          descriptionEn: "Superficial radial nerve entrapment causing dorsoradial hand dysesthesia/burning pain.",
          recommendedTests: ["Tinel's sign (Superficial radial)", "ULTT 2 (Radial)"],
        },
      ],
    },
    {
      groupKo: "액와/기타 신경",
      groupEn: "Axillary / Other nerves",
      options: [
        {
          key: "quadrilateral_space",
          ko: "사각공 증후군",
          en: "Quadrilateral Space Syn.",
          descriptionKo: "사각공에서 액와신경/후상완회선동맥 압박. 외전/외회전 시 후외측 어깨 통증.",
          descriptionEn: "Axillary nerve/posterior circumflex humeral artery compression in quadrilateral space.",
          recommendedTests: ["Quadrilateral space palpation test", "ULTT 2 (Radial)"],
        },
        {
          key: "long_thoracic",
          ko: "장흉신경 포착",
          en: "Long Thoracic N.",
          descriptionKo: "전거근 약화로 견갑 익상(scapular winging) 가능. 벽 밀기 동작에서 관찰됨.",
          descriptionEn: "Long thoracic nerve involvement; scapular winging from serratus anterior weakness.",
          recommendedTests: ["Wall push-up scapular winging test"],
        },
        {
          key: "musculocutaneous",
          ko: "근피신경/오훼완근 포착",
          en: "Musculocutaneous N.",
          descriptionKo: "오훼완근 통과부 포착. 전완 외측 감각 저하와 팔꿈치 굴곡 약화 가능.",
          descriptionEn: "Entrapment through coracobrachialis; lateral forearm sensory change with elbow flexion weakness.",
          recommendedTests: ["Resisted elbow flexion provocation", "Biceps reflex"],
        },
      ],
    },
  ],
  lower: [
    {
      groupKo: "좌골신경",
      groupEn: "Sciatic nerve",
      options: [
        {
          key: "piriformis",
          ko: "이상근 증후군",
          en: "Piriformis syndrome",
          descriptionKo: "이상근 주변 좌골신경 자극. 둔부 깊은 통증과 하지 방사 증상이 동반될 수 있음.",
          descriptionEn: "Sciatic irritation around piriformis with deep gluteal pain and possible leg radiation.",
          recommendedTests: ["FAIR test", "SLR (Straight Leg Raise)", "Slump test"],
        },
        {
          key: "hamstring_origin",
          ko: "햄스트링 기시부",
          en: "Proximal hamstring origin",
          descriptionKo: "좌골 결절 부위 통증이 좌골신경 증상과 동반될 수 있어 감별 필요.",
          descriptionEn: "Proximal hamstring origin pain may coexist with sciatic symptoms; requires differentiation.",
          recommendedTests: ["Bent-knee stretch test", "SLR (Straight Leg Raise)"],
        },
      ],
    },
    {
      groupKo: "대퇴/복재신경",
      groupEn: "Femoral / Saphenous",
      options: [
        {
          key: "meralgia",
          ko: "대퇴감각이상증",
          en: "Meralgia paresthetica",
          descriptionKo: "외측대퇴피신경 포착. 대퇴 외측 화끈거림/저림, 감각증상이 우세.",
          descriptionEn: "Lateral femoral cutaneous nerve entrapment; burning/paresthesia over lateral thigh.",
          recommendedTests: ["Pelvic compression test", "Femoral nerve tension test"],
        },
        {
          key: "obturator",
          ko: "폐쇄신경",
          en: "Obturator nerve entrapment",
          descriptionKo: "내전근 약화와 서혜부/내측 대퇴 통증이 특징적일 수 있음.",
          descriptionEn: "May present with adductor weakness and groin/medial thigh pain.",
          recommendedTests: ["Resisted adduction pain test", "Femoral nerve tension test"],
        },
        {
          key: "femoral_iliopsoas",
          ko: "장요근 하부 대퇴신경 포착",
          en: "Femoral N. at distal iliopsoas",
          descriptionKo: "장요근 하부 통과부 대퇴신경 자극. 고관절 굴곡 관련 전면 대퇴 증상 유발.",
          descriptionEn: "Femoral nerve irritation near distal iliopsoas; anterior thigh symptoms with hip flexion tasks.",
          recommendedTests: ["Femoral nerve tension test", "Thomas test"],
        },
        {
          key: "hunters_canal",
          ko: "내전근관 증후군 (복재신경)",
          en: "Hunter's Canal Syn. (Saphenous)",
          descriptionKo: "복재신경 포착으로 무릎 내측/하퇴 내측 통증·감각 이상이 나타날 수 있음.",
          descriptionEn: "Saphenous nerve entrapment at adductor canal causing medial knee/leg pain and paresthesia.",
          recommendedTests: ["Tinel's sign (Adductor canal)", "Single-leg squat provocation"],
        },
      ],
    },
    {
      groupKo: "경골/비골/족부",
      groupEn: "Tibial / Peroneal / Foot",
      options: [
        {
          key: "peroneal",
          ko: "비골신경 포착",
          en: "Peroneal nerve entrapment",
          descriptionKo: "비골두 부위 포착이 흔함. 발목 배측굴곡 약화/저림과 연관될 수 있음.",
          descriptionEn: "Commonly around fibular head; may relate to dorsiflexion weakness and paresthesia.",
          recommendedTests: ["Tinel's sign (Fibular head)", "SLR (Straight Leg Raise)"],
        },
        {
          key: "tarsal_tunnel",
          ko: "Tarsal Tunnel 증후군",
          en: "Tarsal tunnel syndrome",
          descriptionKo: "경골신경의 내과 후방 포착. 발바닥 저림/야간 통증 감별에 중요.",
          descriptionEn: "Tibial nerve entrapment behind medial malleolus; plantar paresthesia/night pain.",
          recommendedTests: ["Tinel sign (Tarsal tunnel)", "Dorsiflexion-eversion test"],
        },
        {
          key: "baxters_nerve",
          ko: "박스터 신경 포착",
          en: "Baxter's Nerve",
          descriptionKo: "만성 족저근막염과 유사한 발뒤꿈치 내측 통증. 감별 진단 필수.",
          descriptionEn: "Medial heel pain mimicking chronic plantar fasciitis; key differential diagnosis.",
          recommendedTests: ["Baxter nerve palpation", "Windlass test"],
        },
        {
          key: "anterior_tarsal_tunnel",
          ko: "전족근관 증후군",
          en: "Anterior Tarsal Tunnel",
          descriptionKo: "심부비골신경 전족부 포착. 발등 통증/저림과 신발 압박 악화가 흔함.",
          descriptionEn: "Deep peroneal nerve entrapment at anterior tarsal tunnel; dorsal foot pain/paresthesia.",
          recommendedTests: ["Tinel's sign (Dorsal foot)", "Toe extensor provocation"],
        },
      ],
    },
  ],
};

const NEURO_SYNDROME_LABEL_MAP = Object.fromEntries(
  Object.values(NEURO_SYNDROME_2DEPTH)
    .flatMap((groups) => groups)
    .flatMap((group) => group.options)
    .map((opt) => [
      opt.key,
      {
        ko: opt.ko,
        en: opt.en,
        descriptionKo: opt.descriptionKo,
        descriptionEn: opt.descriptionEn,
        recommendedTests: opt.recommendedTests,
      },
    ]),
) as Record<
  string,
  { ko: string; en: string; descriptionKo: string; descriptionEn: string; recommendedTests: string[] }
>;

type NerveHypothesisState = {
  entrapmentSuspected: boolean;
  differentialNeckDisc: boolean;
  doubleCrushSyndrome: boolean;
  peripheralThoracicOutlet: boolean;
  peripheralCarpalTunnel: boolean;
  peripheralCubitalTunnel: boolean;
  peripheralOtherNote: string;
};

type LrCell = { L: string; R: string };
type NeuroStatusValue = (typeof NEURO_STATUS_OPTIONS)[number];
type NeuroStatusCell = { L: NeuroStatusValue; R: NeuroStatusValue };

function emptyLr(): LrCell {
  return { L: "", R: "" };
}

function emptyNeuroStatus(): NeuroStatusCell {
  return { L: "정상", R: "정상" };
}

function buildDefaultNeuroExamTable(): {
  myotome: Record<string, LrCell>;
  dermatomeSensory: Record<string, LrCell>;
  dtr: Record<string, LrCell>;
} {
  const myotome: Record<string, LrCell> = {};
  for (const lv of MYOTOME_LEVELS) myotome[lv] = emptyLr();
  const dermatomeSensory: Record<string, LrCell> = {};
  for (const lv of MYOTOME_LEVELS) dermatomeSensory[lv] = emptyLr();
  const dtr: Record<string, LrCell> = {};
  for (const r of DTR_ROWS) dtr[r.key] = emptyLr();
  return { myotome, dermatomeSensory, dtr };
}

function buildDefaultEvaluationNeuroExamTable(): {
  myotome: Record<string, NeuroStatusCell>;
  dermatome: Record<string, NeuroStatusCell>;
  dtr: Record<string, NeuroStatusCell>;
} {
  const myotome: Record<string, NeuroStatusCell> = {};
  for (const lv of MYOTOME_LEVELS) myotome[lv] = emptyNeuroStatus();
  const dermatome: Record<string, NeuroStatusCell> = {};
  for (const lv of MYOTOME_LEVELS) dermatome[lv] = emptyNeuroStatus();
  const dtr: Record<string, NeuroStatusCell> = {};
  for (const r of DTR_ROWS) dtr[r.key] = emptyNeuroStatus();
  return { myotome, dermatome, dtr };
}

const NEURO_ENTRAPMENT_BLOCK_START = "[NEURO_ENTRAPMENT_BLOCK_START]";
const NEURO_ENTRAPMENT_BLOCK_END = "[NEURO_ENTRAPMENT_BLOCK_END]";

function upsertNeuroEntrapmentBlock(text: string, lines: string[]): string {
  const escapedStart = NEURO_ENTRAPMENT_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = NEURO_ENTRAPMENT_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, "g");
  const base = text.replace(blockRegex, "").trim();
  if (lines.length === 0) return base;
  const block = [NEURO_ENTRAPMENT_BLOCK_START, ...lines, NEURO_ENTRAPMENT_BLOCK_END].join("\n");
  return base ? `${base}\n\n${block}` : block;
}

function composeNerveHypothesisLines(h: NerveHypothesisState, locale: SoapLocale): string[] {
  if (!h.entrapmentSuspected) return [];
  const parts: string[] = [];
  parts.push(locale === "en" ? "Nerve entrapment suspected: Yes" : "신경 포착 의심: 예");
  if (h.differentialNeckDisc) parts.push(locale === "en" ? "- Differentiate from cervical radiculopathy / disc" : "- 목 디스크·신경근병증과의 감별");
  if (h.doubleCrushSyndrome) parts.push(locale === "en" ? "- Double crush syndrome considered" : "- 이중 압박 증후군(Double Crush) 고려");
  const sites: string[] = [];
  if (h.peripheralThoracicOutlet) sites.push(locale === "en" ? "Thoracic outlet" : "흉곽출구");
  if (h.peripheralCarpalTunnel) sites.push("CTS / Carpal tunnel");
  if (h.peripheralCubitalTunnel) sites.push(locale === "en" ? "Cubital tunnel" : "주관 신경 포착");
  if (sites.length) {
    parts.push(
      (locale === "en" ? "- Peripheral entrapment sites: " : "- 말초 신경 포착 부위: ") + sites.join(", "),
    );
  }
  const o = h.peripheralOtherNote.trim();
  if (o) parts.push((locale === "en" ? "- Other: " : "- 기타: ") + o);
  return parts;
}

const NERVE_HEP_CAUTION_KO =
  "[HEP] 신경 스트레칭·글라이딩 주의: 가동 범위 내에서만 수행하고, 저림·전기감·통증이 과도해지면 즉시 중단 후 치료사에게 문의하세요.";
const NERVE_HEP_CAUTION_EN =
  "[HEP] Nerve glide/slide caution: stay within symptom-free range; stop if numbness, shock-like pain, or severe pain increases and contact your clinician.";

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
  nerveHypothesis: NerveHypothesisState;
  neurodynamicSelection: Record<string, SpecialTestValue>;
  neuroExamTable: ReturnType<typeof buildDefaultNeuroExamTable>;
  evaluationNeuroExamTable: ReturnType<typeof buildDefaultEvaluationNeuroExamTable>;
  selectedNeuroSyndromes: string[];
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
  visitSpecialNotes: string;
  visitIsFlagged: boolean;
  visitChangeLog: VisitFollowupChangeLog;
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
  assessmentData?: Record<string, unknown>;
  rom_assessment?: {
    bodyPart: string;
    sideMode: "left" | "right" | "bilateral" | "none";
    motions: string[];
    data: Record<string, RomMmtBySide>;
  };
  special_tests?: {
    recommended: Array<{ name: string; result: "positive" | "negative" | "not_tested" }>;
    custom: Array<{ id: string; name: string; result: "양성" | "음성" }>;
    merged: Array<{ name: string; result: string; source: "recommended" | "custom" | "neurodynamic" }>;
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
      assessmentData:
        payload.assessmentData && typeof payload.assessmentData === "object"
          ? payload.assessmentData
          : undefined,
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
  const dermaQuick =
    draft.dermatomeQuick.length > 0
      ? draft.dermatomeQuick.join(", ")
      : locale === "en"
        ? "Not specified"
        : "미지정";
  const dermaFree = draft.dermatomeFreeText.trim() || (locale === "en" ? "None" : "없음");

  return [
    `${t.prefixChief}: ${draft.chiefComplaint || t.notProvided}`,
    `${t.prefixOnset}: ${onsetLabel(draft.onset, locale)} (${traumaLabel(draft.traumaType, locale)})`,
    `${t.prefixVas}: ${draft.vas}`,
    `${t.prefixQuality}: ${qualityText}`,
    `${locale === "en" ? "Dermatome (quick)" : "피부분절(빠른 선택)"}: ${dermaQuick}`,
    `${locale === "en" ? "Dermatome (free text)" : "피부분절(상세 기입)"}: ${dermaFree}`,
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
  const [activeReportId, setActiveReportId] = useState<string>("");
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

  const defaultNerveHypothesis = useMemo(
    (): NerveHypothesisState => ({
      entrapmentSuspected: false,
      differentialNeckDisc: false,
      doubleCrushSyndrome: false,
      peripheralThoracicOutlet: false,
      peripheralCarpalTunnel: false,
      peripheralCubitalTunnel: false,
      peripheralOtherNote: "",
    }),
    [],
  );
  const [nerveHypothesis, setNerveHypothesis] = useState<NerveHypothesisState>(defaultNerveHypothesis);
  const [neurodynamicSelection, setNeurodynamicSelection] = useState<Record<string, SpecialTestValue>>({});
  const [neuroExamTable, setNeuroExamTable] = useState(() => buildDefaultNeuroExamTable());
  const [evaluationNeuroExamTable, setEvaluationNeuroExamTable] = useState(() => buildDefaultEvaluationNeuroExamTable());
  const [selectedNeuroSyndromes, setSelectedNeuroSyndromes] = useState<string[]>([]);
  const nerveHepCautionDoneRef = useRef(false);

  const [examDraft, setExamDraft] = useState<ExamDraft>({
    chiefComplaint: "",
    onset: "Acute",
    traumaType: "Non-traumatic",
    vas: 5,
    painQualities: [],
    dermatomeQuick: [],
    dermatomeFreeText: "",
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
  const [romAssessmentMeta, setRomAssessmentMeta] = useState<{
    bodyPart: string;
    sideMode: "left" | "right" | "bilateral" | "none";
    motions: string[];
    data: Record<string, RomMmtBySide>;
  } | null>(null);
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
  const [visitSpecialNotes, setVisitSpecialNotes] = useState("");
  const [visitIsFlagged, setVisitIsFlagged] = useState(false);
  const [visitChangeLog, setVisitChangeLog] = useState<VisitFollowupChangeLog>("");
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

  const handleNeurodynamicToggle = (testName: string, value: SpecialTestValue) => {
    setNeurodynamicSelection((prev) => ({ ...prev, [testName]: value }));
  };

  const toggleNeuroSyndrome = (key: string) => {
    setSelectedNeuroSyndromes((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setNerveHypothesis((old) => ({ ...old, entrapmentSuspected: next.length > 0 }));
      return next;
    });
  };

  const clearNeuroSyndromes = () => {
    setSelectedNeuroSyndromes([]);
    setNerveHypothesis((old) => ({ ...old, entrapmentSuspected: false }));
  };

  useEffect(() => {
    if (selectedNeuroSyndromes.length > 0 && !nerveHypothesis.entrapmentSuspected) {
      setNerveHypothesis((old) => ({ ...old, entrapmentSuspected: true }));
    }
  }, [nerveHypothesis.entrapmentSuspected, selectedNeuroSyndromes.length]);

  const patchEvaluationNeuroExam = (
    section: "myotome" | "dermatome" | "dtr",
    rowKey: string,
    side: "L" | "R",
    value: NeuroStatusValue,
  ) => {
    setEvaluationNeuroExamTable((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [rowKey]: {
          ...(prev[section][rowKey] ?? emptyNeuroStatus()),
          [side]: value,
        },
      },
    }));
  };

  const toggleDermatomeQuick = (level: string) => {
    setExamDraft((prev) => ({
      ...prev,
      dermatomeQuick: prev.dermatomeQuick.includes(level)
        ? prev.dermatomeQuick.filter((x) => x !== level)
        : [...prev.dermatomeQuick, level],
    }));
  };

  const patchNeuroExamLr = (
    section: "myotome" | "dermatomeSensory" | "dtr",
    key: string,
    side: "L" | "R",
    value: string,
  ) => {
    setNeuroExamTable((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...(prev[section][key] ?? emptyLr()),
          [side]: value,
        },
      },
    }));
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
    setExamDraft({
      ...draft.examDraft,
      dermatomeQuick: draft.examDraft?.dermatomeQuick ?? [],
      dermatomeFreeText: draft.examDraft?.dermatomeFreeText ?? "",
    });
    setNerveHypothesis(draft.nerveHypothesis ?? { ...defaultNerveHypothesis });
    setNeurodynamicSelection(draft.neurodynamicSelection ?? {});
    setNeuroExamTable(draft.neuroExamTable ?? buildDefaultNeuroExamTable());
    setEvaluationNeuroExamTable(draft.evaluationNeuroExamTable ?? buildDefaultEvaluationNeuroExamTable());
    setSelectedNeuroSyndromes(draft.selectedNeuroSyndromes ?? []);
    nerveHepCautionDoneRef.current = false;
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
    setVisitSpecialNotes(draft.visitSpecialNotes ?? "");
    setVisitIsFlagged(draft.visitIsFlagged ?? false);
    setVisitChangeLog(draft.visitChangeLog ?? "");
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
      nerveHypothesis,
      neurodynamicSelection,
      neuroExamTable,
      evaluationNeuroExamTable,
      selectedNeuroSyndromes,
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
      visitSpecialNotes,
      visitIsFlagged,
      visitChangeLog,
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

  const detectObjectiveTrigger = useCallback(() => {
    const hasPositiveSpecial =
      Object.values(specialTestSelection).some((v) => v === "positive") ||
      Object.values(neurodynamicSelection).some((v) => v === "positive");
    const hasRomRestriction =
      !!romAssessmentMeta &&
      Object.values(romAssessmentMeta.data ?? {}).some((row) => {
        const left = row?.left;
        const right = row?.right;
        const values = [left?.arom, left?.prom, right?.arom, right?.prom]
          .map((v) => String(v ?? "").trim().toLowerCase())
          .filter(Boolean);
        if (values.length === 0) return false;
        return values.some(
          (v) =>
            /limited|restriction|제한|painful|통증/i.test(v) ||
            (Number.isFinite(Number(v)) && Number(v) < 100),
        );
      });
    return { hasPositiveSpecial, hasRomRestriction };
  }, [neurodynamicSelection, romAssessmentMeta, specialTestSelection]);

  const applyAiGoalSuggestion = () => {
    const { hasPositiveSpecial, hasRomRestriction } = detectObjectiveTrigger();
    const syndromeNames = selectedNeuroSyndromes
      .map((key) => (locale === "en" ? NEURO_SYNDROME_LABEL_MAP[key]?.en : NEURO_SYNDROME_LABEL_MAP[key]?.ko))
      .filter((v): v is string => Boolean(v));
    const syndromeText = syndromeNames.length > 0 ? syndromeNames.join(", ") : locale === "en" ? "neuro entrapment pattern" : "신경 포착 패턴";

    const stg = locale === "en"
      ? `2-4 weeks: reduce symptom provocation and improve objective findings related to ${syndromeText} (${hasPositiveSpecial ? "positive neuro/special test present" : "monitor test response"}).`
      : `2-4주: ${syndromeText} 관련 증상 유발을 감소시키고 객관적 검사 소견을 개선한다 (${hasPositiveSpecial ? "신경/특수검사 양성 반영" : "검사 반응 추적"}).`;
    const ltg = locale === "en"
      ? `6-12+ weeks: restore pain-controlled ROM and functional ADL/work tolerance${hasRomRestriction ? " with measurable ROM gains" : ""}.`
      : `6-12주+: 통증 조절 하에 ROM 및 일상/직무 기능을 회복${hasRomRestriction ? "하고 가동범위 개선 수치를 확보" : ""}한다.`;

    setShortTermGoal((prev) => (prev.trim() ? prev : stg));
    setLongTermGoal((prev) => (prev.trim() ? prev : ltg));
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
        assessmentData: {
          step1: {
            chiefComplaint: examDraft.chiefComplaint,
            onset: examDraft.onset,
            traumaType: examDraft.traumaType,
            vas: examDraft.vas,
            painQualities: examDraft.painQualities,
            dermatomeQuick: examDraft.dermatomeQuick,
            dermatomeFreeText: examDraft.dermatomeFreeText,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
          },
          step2: {
            body_part: romAssessmentMeta?.bodyPart ?? formData.diagnosisArea,
            diagnosisArea: formData.diagnosisArea,
            evaluation: formData.evaluation,
            nerve_entrapment_hypothesis: nerveHypothesis,
          },
          step3: {
            rom_assessment: romAssessmentMeta,
            neurodynamics: neurodynamicSelection,
            neuro_exam: neuroExamTable,
          },
          step4: {
            plan: formData.intervention,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
            nerve_mobilization: {
              education_auto_caution: locale === "en" ? NERVE_HEP_CAUTION_EN : NERVE_HEP_CAUTION_KO,
            },
          },
        },
        rom_assessment: romAssessmentMeta ?? undefined,
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
      const nextReportId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setActiveReportId(nextReportId);
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
    if (isSaving) return;
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
    const reportId =
      activeReportId ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    if (!activeReportId) setActiveReportId(reportId);
    setIsSaving(true);
    setSaveStatus("saving");
    setSaveErrorMessage(null);
    try {
      const visitRecordedAt = new Date().toISOString();
      const visitFollowupSnapshot = {
        special_notes: visitSpecialNotes,
        is_flagged: visitIsFlagged,
        change_log: visitChangeLog,
        created_at: visitRecordedAt,
      };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("🕵️‍♂️ [디버깅] 프론트엔드에서 찾은 user_id:", user?.id);
      if (!user?.id) {
        alert("⚠️ 시스템 경고: 로그인 정보(user_id)를 찾을 수 없습니다! 백엔드로 null이 날아갑니다.");
      }
      console.log("🚀 [SAVE] 쏠 준비 완료. Patient ID:", chartPatientId);
      const payload = {
        reportId,
        patientId: chartPatientId,
        userId: user?.id,
        diagnosisArea: formData.diagnosisArea,
        locale,
        language: formData.language,
        originalData: {
          exam: {
            chiefComplaint: examDraft.chiefComplaint,
            onset: examDraft.onset,
            traumaType: examDraft.traumaType,
            vas: examDraft.vas,
            painQualities: examDraft.painQualities,
            dermatomeQuick: examDraft.dermatomeQuick,
            dermatomeFreeText: examDraft.dermatomeFreeText,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
            screeningRegion,
            redFlags: examDraft.redFlags,
            notes: examDraft.otherNotes,
            summary: formData.examination,
            neuro_symptoms: {
              painQualities: examDraft.painQualities,
              dermatomeQuick: examDraft.dermatomeQuick,
              dermatomeFreeText: examDraft.dermatomeFreeText,
            },
          },
          evaluation: {
            bodyPart: romAssessmentMeta?.bodyPart ?? formData.diagnosisArea,
            diagnosisArea: formData.diagnosisArea,
            onset: examDraft.onset,
            traumaType: examDraft.traumaType,
            clinicalReasoning: formData.evaluation,
            summary: formData.evaluation,
            nerve_entrapment_hypothesis: nerveHypothesis,
            neuro_syndrome_map: selectedNeuroSyndromes,
            neuro_exam: evaluationNeuroExamTable,
          },
          goal: {
            summary: formData.prognosis,
            rom: romAssessmentMeta ?? null,
            neurodynamics: neurodynamicSelection,
            neuro_exam: neuroExamTable,
            special_tests: mergedSpecialTests.merged,
          },
          objective_tests: {
            special_tests: mergedSpecialTests.merged,
            neurodynamic_tests: neurodynamicSelection,
            syndrome_priority_tests: syndromePriorityTests,
          },
          goals: {
            stg: shortTermGoal,
            ltg: longTermGoal,
          },
          plan: {
            summary: formData.intervention,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
            nerve_gliding_options: [
              "신경 글라이딩 (Nerve gliding/sliding)",
              "신경 가동술 (Nerve mobilization)",
            ],
            hep_nerve_caution: locale === "en" ? NERVE_HEP_CAUTION_EN : NERVE_HEP_CAUTION_KO,
            visit_followup: visitFollowupSnapshot,
          },
        },
        assessmentData: {
          step1: {
            chiefComplaint: examDraft.chiefComplaint,
            onset: examDraft.onset,
            traumaType: examDraft.traumaType,
            vas: examDraft.vas,
            painQualities: examDraft.painQualities,
            dermatomeQuick: examDraft.dermatomeQuick,
            dermatomeFreeText: examDraft.dermatomeFreeText,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
          },
          step2: {
            body_part: romAssessmentMeta?.bodyPart ?? formData.diagnosisArea,
            diagnosisArea: formData.diagnosisArea,
            evaluation: formData.evaluation,
            nerve_entrapment_hypothesis: nerveHypothesis,
            neuro_syndrome_map: selectedNeuroSyndromes,
            neuro_exam: evaluationNeuroExamTable,
          },
          step3: {
            rom_assessment: romAssessmentMeta,
            neurodynamics: neurodynamicSelection,
            neuro_exam: neuroExamTable,
            special_tests: mergedSpecialTests.merged,
            stg: shortTermGoal,
            ltg: longTermGoal,
          },
          step4: {
            plan: formData.intervention,
            aggravatingFactors: examDraft.aggravatingFactors,
            relievingFactors: examDraft.relievingFactors,
            nerve_mobilization: {
              education_auto_caution: locale === "en" ? NERVE_HEP_CAUTION_EN : NERVE_HEP_CAUTION_KO,
            },
            visit_followup: visitFollowupSnapshot,
          },
        },
        rom_assessment: romAssessmentMeta,
        result: reportResult,
      };
      const res = await fetch("/api/cdss-guardrail/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        activity?: {
          id: string;
          type: "report";
          createdAt: string;
          title: string;
          description: string;
          metadata?: { report_id?: string; patient_id?: string };
        };
      };
      const response = { ok: res.ok, status: res.status, body };
      console.log("✅ [DB INSERT] 성공 여부:", response);
      if (!res.ok) {
        throw new Error(body.error || t.dashSaveRecordError);
      }

      const planTextForTreatment =
        formatPlanToTreatment(manualEntries, exerciseEntries, modalityEntries, educationHep).trim() ||
        formData.intervention.trim();
      const visitContentBlockForTreatment =
        visitSpecialNotes.trim() || visitIsFlagged || visitChangeLog
          ? formatVisitFollowupContentBlock(visitSpecialNotes, visitChangeLog, locale === "en" ? "en" : "ko")
          : "";
      if (planTextForTreatment || visitContentBlockForTreatment) {
        const treatmentMetadata = buildTreatmentVisitMetadata({
          special_notes: visitSpecialNotes,
          is_flagged: visitIsFlagged,
          change_log: visitChangeLog,
          createdAt: visitRecordedAt,
        }) as Json;
        const treatmentContent = [planTextForTreatment, visitContentBlockForTreatment].filter(Boolean).join("\n\n");
        const { error: treatmentInsertError } = await supabase.from("treatments").insert({
          patient_id: chartPatientId,
          content: treatmentContent,
          created_by: user?.id ?? null,
          metadata: treatmentMetadata,
        } as never);
        if (treatmentInsertError) {
          console.warn("[handleSaveDiagnosisRecord] treatments insert:", treatmentInsertError.message);
        }
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
      if (typeof window !== "undefined" && body.activity) {
        window.dispatchEvent(new CustomEvent("rephyt:activity-created", { detail: body.activity }));
        window.localStorage.setItem("rephyt:latest-activity", JSON.stringify(body.activity));
      }
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
    { n: 2, label: "Evaluation", icon: <Activity className="h-4 w-4" /> },
    { n: 3, label: "Objective & Goal", icon: <Target className="h-4 w-4" /> },
    { n: 4, label: "Plan", icon: <Stethoscope className="h-4 w-4" /> },
  ];

  const currentField = STEP_FIELD_MAP[step];
  const currentValue = formData[currentField];
  const regionKey = formData.diagnosisArea.split(" ")[0].toLowerCase();
  const selectedDiagnosisKey = resolveDiagnosisKey(formData.diagnosisArea);
  const recommendedTests = selectedDiagnosisKey
    ? SPECIAL_TESTS_DB[regionKey as keyof typeof SPECIAL_TESTS_DB] ?? []
    : [];
  const syndromePriorityTests = useMemo(
    () =>
      selectedNeuroSyndromes.flatMap(
        (key) => NEURO_SYNDROME_LABEL_MAP[key]?.recommendedTests ?? [],
      ),
    [selectedNeuroSyndromes],
  );
  const recommendedTestsForObjective = useMemo(
    () => [...new Set([...syndromePriorityTests, ...recommendedTests])],
    [recommendedTests, syndromePriorityTests],
  );
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
    const neuroFromDynamics = NEURODYNAMIC_TEST_KEYS.map((name) => {
      const result = neurodynamicSelection[name] ?? "not_tested";
      return { name: String(name), result };
    }).filter((row) => row.result !== "not_tested");

    const recommended = [
      ...neuroFromDynamics,
      ...Object.entries(specialTestSelection)
        .filter(([, result]) => Boolean(result))
        .map(([name, result]) => ({
          name: name.trim(),
          result,
        }))
        .filter((row): row is { name: string; result: "positive" | "negative" | "not_tested" } => Boolean(row.name)),
    ];

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
        ...neuroFromDynamics.map((row) => ({
          name: row.name,
          result: specialTestLabel[row.result],
          source: "neurodynamic" as const,
        })),
        ...Object.entries(specialTestSelection)
          .filter(([, result]) => Boolean(result))
          .map(([name, result]) => ({
            name: name.trim(),
            result: specialTestLabel[result],
            source: "recommended" as const,
          }))
          .filter((row) => Boolean(row.name)),
        ...custom.map((row) => ({
          name: row.name,
          result: row.result,
          source: "custom" as const,
        })),
      ],
    };
  }, [customSpecialTests, neurodynamicSelection, specialTestLabel, specialTestSelection]);

  const objectiveTriggerState = useMemo(() => detectObjectiveTrigger(), [detectObjectiveTrigger]);

  const originalDataSnapshotForRubrics = useMemo(
    () => ({
      exam: {
        chiefComplaint: examDraft.chiefComplaint,
        onset: examDraft.onset,
        traumaType: examDraft.traumaType,
        vas: examDraft.vas,
        painQualities: examDraft.painQualities,
        dermatomeQuick: examDraft.dermatomeQuick,
        dermatomeFreeText: examDraft.dermatomeFreeText,
        aggravatingFactors: examDraft.aggravatingFactors,
        relievingFactors: examDraft.relievingFactors,
        screeningRegion,
        redFlags: examDraft.redFlags,
        notes: examDraft.otherNotes,
        summary: formData.examination,
        neuro_symptoms: {
          painQualities: examDraft.painQualities,
          dermatomeQuick: examDraft.dermatomeQuick,
          dermatomeFreeText: examDraft.dermatomeFreeText,
        },
      },
      evaluation: {
        bodyPart: romAssessmentMeta?.bodyPart ?? formData.diagnosisArea,
        diagnosisArea: formData.diagnosisArea,
        onset: examDraft.onset,
        traumaType: examDraft.traumaType,
        clinicalReasoning: formData.evaluation,
        summary: formData.evaluation,
        nerve_entrapment_hypothesis: nerveHypothesis,
        neuro_syndrome_map: selectedNeuroSyndromes,
        neuro_exam: evaluationNeuroExamTable,
      },
      goal: {
        summary: formData.prognosis,
        rom: romAssessmentMeta ?? null,
        neurodynamics: neurodynamicSelection,
        neuro_exam: neuroExamTable,
        special_tests: mergedSpecialTests.merged,
      },
      objective_tests: {
        special_tests: mergedSpecialTests.merged,
        neurodynamic_tests: neurodynamicSelection,
        syndrome_priority_tests: syndromePriorityTests,
      },
      goals: {
        stg: shortTermGoal,
        ltg: longTermGoal,
      },
      plan: {
        summary: formData.intervention,
        aggravatingFactors: examDraft.aggravatingFactors,
        relievingFactors: examDraft.relievingFactors,
        nerve_gliding_options: [
          "신경 글라이딩 (Nerve gliding/sliding)",
          "신경 가동술 (Nerve mobilization)",
        ],
        hep_nerve_caution: locale === "en" ? NERVE_HEP_CAUTION_EN : NERVE_HEP_CAUTION_KO,
        visit_followup: {
          special_notes: visitSpecialNotes,
          is_flagged: visitIsFlagged,
          change_log: visitChangeLog,
        },
      },
    }),
    [
      examDraft,
      formData.diagnosisArea,
      formData.evaluation,
      formData.examination,
      formData.intervention,
      formData.prognosis,
      mergedSpecialTests,
      nerveHypothesis,
      neurodynamicSelection,
      neuroExamTable,
      evaluationNeuroExamTable,
      selectedNeuroSyndromes,
      romAssessmentMeta,
      screeningRegion,
      shortTermGoal,
      longTermGoal,
      syndromePriorityTests,
      visitChangeLog,
      visitIsFlagged,
      visitSpecialNotes,
      locale,
    ],
  );

  const documentationDefenseRubric = useMemo(
    () => calculateDefenseScore(originalDataSnapshotForRubrics),
    [originalDataSnapshotForRubrics],
  );

  const documentationRecoveryPrognosis = useMemo(
    () => calculateRecoveryPrognosis(originalDataSnapshotForRubrics),
    [originalDataSnapshotForRubrics],
  );

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
    const trackedNames = [
      ...recommendedTests,
      ...NEURODYNAMIC_TEST_KEYS,
      ...customSpecialTests.map((row) => row.name.trim()).filter(Boolean),
    ];
    const specialLines = [
      ...NEURODYNAMIC_TEST_KEYS.map((name) => {
        const result = neurodynamicSelection[name];
        if (!result || result === "not_tested") return "";
        return `${name}: ${specialTestLabel[result]}`;
      }).filter(Boolean),
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
  }, [customSpecialTests, neurodynamicSelection, recommendedTests, specialTestLabel, specialTestSelection]);

  useEffect(() => {
    const lines = composeNerveHypothesisLines(nerveHypothesis, locale);
    setFormData((prev) => {
      const next = upsertNeuroEntrapmentBlock(prev.evaluation, lines);
      if (next === prev.evaluation) return prev;
      return { ...prev, evaluation: next };
    });
  }, [locale, nerveHypothesis]);

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
    if (step !== 4) return;
    if (nerveHepCautionDoneRef.current) return;
    nerveHepCautionDoneRef.current = true;
    const tag = locale === "en" ? NERVE_HEP_CAUTION_EN : NERVE_HEP_CAUTION_KO;
    setEducationHep((prev) => {
      const p = prev.trim();
      if (p.includes("[HEP] 신경 스트레칭") || p.includes("[HEP] Nerve glide")) return prev;
      return p ? `${p}\n\n${tag}` : tag;
    });
  }, [locale, step]);

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

                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <p className="mb-1 text-xs font-bold uppercase text-indigo-700">
                          {locale === "en" ? "Neuro symptom screening · Dermatome" : "신경성 증상 스크리닝 · 피부분절(Dermatome)"}
                        </p>
                        <p className="mb-3 text-[11px] leading-relaxed text-slate-600">
                          {locale === "en"
                            ? "Pain quality chips include numbness/tingling, burning (neuropathic), and electric shock–like pain. Pick quick dermatome levels and/or describe in text."
                            : "통증 양상에서 저림·화끈거림·전기 찌름을 선택할 수 있습니다. 아래 분절을 빠르게 체크하거나 상세 부위를 자유 기입하세요."}
                        </p>
                        <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">
                          {locale === "en" ? "Dermatome (quick select)" : "피부분절 빠른 선택"}
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {DERMATOME_QUICK_LEVELS.map((level) => {
                            const on = examDraft.dermatomeQuick.includes(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => toggleDermatomeQuick(level)}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                  on
                                    ? "border border-indigo-500 bg-indigo-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                          {locale === "en" ? "Dermatome / sensory distribution (free text)" : "감각 이상 부위·분절 (자유 기입)"}
                        </label>
                        <textarea
                          value={examDraft.dermatomeFreeText}
                          onChange={(e) => handleExamDraftChange({ dermatomeFreeText: e.target.value })}
                          rows={3}
                          placeholder={
                            locale === "en"
                              ? "e.g. lateral forearm C6, medial elbow T1..."
                              : "예: 우측 손등 C6, 좌측 악수 시 저림 C7-T1 방사..."
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
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
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {locale === "en"
                          ? "Step 2. Evaluation (Clinical reasoning)"
                          : "Step 2. Evaluation (임상적 추론)"}
                      </p>

                      <NeuroEntrapmentSelector
                        locale={locale}
                        syndromeMap={NEURO_SYNDROME_2DEPTH}
                        selectedSyndromes={selectedNeuroSyndromes}
                        onToggleSyndrome={toggleNeuroSyndrome}
                        onClearSyndromes={clearNeuroSyndromes}
                        evaluationNeuroExamTable={evaluationNeuroExamTable}
                        onPatchEvaluationNeuroExam={patchEvaluationNeuroExam}
                        myotomeLevels={MYOTOME_LEVELS}
                        dtrRows={DTR_ROWS}
                      />

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
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {locale === "en"
                          ? "Step 3. Objective & Goal (Objective tests and goal setting)"
                          : "Step 3. Objective & Goal (객관적 검사 및 목표)"}
                      </p>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase text-slate-700">3-1. {locale === "en" ? "Objective tests" : "객관적 검사"}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {locale === "en"
                            ? "ROM + syndrome-linked neuro/special tests are prioritized from Step 2."
                            : "Step 2에서 선택한 증후군을 기반으로 ROM 및 신경/특수검사를 우선 배치합니다."}
                        </p>
                      </div>

                      {selectedRegionEvidence ? (
                        <ObjectiveEvaluation
                          movements={selectedRegionEvidence.rom}
                          romMmtInputs={romMmtInputs}
                          onPatchSide={handleRomMmtChange}
                          onReplaceMovementRow={handleRomMmtReplaceRow}
                          selectedDiagnosisArea={formData.diagnosisArea}
                          onAssessmentMetaChange={setRomAssessmentMeta}
                          locale={locale}
                        />
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                          {locale === "en"
                            ? "Select diagnosis area at Step 1 to enable ROM objective inputs."
                            : "Step 1에서 진단 부위를 선택하면 ROM 객관적 입력이 활성화됩니다."}
                        </div>
                      )}

                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-indigo-800">
                          {locale === "en" ? "Recommended precision tests (Neurodynamics & Special tests)" : "추천 정밀 검사 (Neurodynamics & Special Tests)"}
                        </p>
                        <div className="space-y-2">
                          {recommendedTestsForObjective.map((test) => {
                            const selected = specialTestSelection[test] ?? "not_tested";
                            const isPriority = syndromePriorityTests.includes(test);
                            return (
                              <div
                                key={test}
                                className={`flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center sm:justify-between ${
                                  isPriority ? "border-indigo-200 bg-white ring-1 ring-indigo-100" : "border-slate-100 bg-white"
                                }`}
                              >
                                <p className="text-xs font-semibold text-slate-800">
                                  {isPriority ? "★ " : ""}{test}
                                </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {(["positive", "negative", "not_tested"] as const).map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => handleSpecialTestToggle(test, v)}
                                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                                        selected === v
                                          ? v === "positive"
                                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                                            : v === "negative"
                                              ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
                                              : "bg-slate-200 text-slate-800"
                                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      {specialTestLabel[v]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-indigo-800">
                          {locale === "en" ? "Neurodynamic tests (ULTT / SLR / Slump / Femoral)" : "신경 역동학 검사 (ULTT·SLR·Slump·Femoral)"}
                        </p>
                        <div className="space-y-2">
                          {NEURODYNAMIC_TEST_KEYS.map((test) => {
                            const selected = neurodynamicSelection[test] ?? "not_tested";
                            return (
                              <div
                                key={test}
                                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-2 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <p className="text-xs font-semibold text-slate-800">{test}</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {(["positive", "negative", "not_tested"] as const).map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => handleNeurodynamicToggle(test, v)}
                                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                                        selected === v
                                          ? v === "positive"
                                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                                            : v === "negative"
                                              ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
                                              : "bg-slate-200 text-slate-800"
                                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      {specialTestLabel[v]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-600">
                          {locale === "en" ? "Neuro exam · Myotome (L/R)" : "신경학적 검사 · 근력(Myotome) L/R"}
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[320px] text-left text-[10px] sm:text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-2 py-1.5">Level</th>
                                <th className="px-2 py-1.5">MMT L</th>
                                <th className="px-2 py-1.5">MMT R</th>
                              </tr>
                            </thead>
                            <tbody>
                              {MYOTOME_LEVELS.map((lv) => (
                                <tr key={lv} className="border-t border-slate-100">
                                  <td className="px-2 py-1 font-semibold text-slate-700">{lv}</td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.myotome[lv]?.L ?? ""}
                                      onChange={(e) => patchNeuroExamLr("myotome", lv, "L", e.target.value)}
                                      placeholder="0-5"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.myotome[lv]?.R ?? ""}
                                      onChange={(e) => patchNeuroExamLr("myotome", lv, "R", e.target.value)}
                                      placeholder="0-5"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-600">
                          {locale === "en" ? "Sensory · Dermatome (L/R)" : "감각(Dermatome) L/R"}
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[320px] text-left text-[10px] sm:text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-2 py-1.5">Level</th>
                                <th className="px-2 py-1.5">L</th>
                                <th className="px-2 py-1.5">R</th>
                              </tr>
                            </thead>
                            <tbody>
                              {MYOTOME_LEVELS.map((lv) => (
                                <tr key={`d-${lv}`} className="border-t border-slate-100">
                                  <td className="px-2 py-1 font-semibold text-slate-700">{lv}</td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.dermatomeSensory[lv]?.L ?? ""}
                                      onChange={(e) => patchNeuroExamLr("dermatomeSensory", lv, "L", e.target.value)}
                                      placeholder="N/T"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.dermatomeSensory[lv]?.R ?? ""}
                                      onChange={(e) => patchNeuroExamLr("dermatomeSensory", lv, "R", e.target.value)}
                                      placeholder="N/T"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-600">DTR (L/R)</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[360px] text-left text-[10px] sm:text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-2 py-1.5">{locale === "en" ? "Reflex" : "반사"}</th>
                                <th className="px-2 py-1.5">L</th>
                                <th className="px-2 py-1.5">R</th>
                              </tr>
                            </thead>
                            <tbody>
                              {DTR_ROWS.map((row) => (
                                <tr key={row.key} className="border-t border-slate-100">
                                  <td className="px-2 py-1 font-medium text-slate-700">
                                    {locale === "en" ? row.labelEn : row.labelKo}
                                  </td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.dtr[row.key]?.L ?? ""}
                                      onChange={(e) => patchNeuroExamLr("dtr", row.key, "L", e.target.value)}
                                      placeholder="+/++/0"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      value={neuroExamTable.dtr[row.key]?.R ?? ""}
                                      onChange={(e) => patchNeuroExamLr("dtr", row.key, "R", e.target.value)}
                                      placeholder="+/++/0"
                                      className="h-8 w-full rounded border border-slate-200 px-1 text-[10px]"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="my-1 border-t border-dashed border-slate-300" />
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-black uppercase text-emerald-800">3-2. {locale === "en" ? "STG & LTG goals" : "목표 설정 (STG / LTG)"}</p>
                            <p className="mt-1 text-[11px] text-emerald-700/80">
                              {locale === "en"
                                ? "Set measurable short/long-term goals from objective findings."
                                : "객관적 검사 결과를 근거로 단기/장기 목표를 설정합니다."}
                            </p>
                          </div>
                          {(objectiveTriggerState.hasRomRestriction || objectiveTriggerState.hasPositiveSpecial) ? (
                            <button
                              type="button"
                              onClick={applyAiGoalSuggestion}
                              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
                            >
                              {locale === "en" ? "AI goal suggestion" : "AI 목표 추천"}
                            </button>
                          ) : null}
                        </div>
                      </div>

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
                        <p className="mb-2 text-[10px] font-bold uppercase text-indigo-700">
                          {locale === "en" ? "Nerve gliding / mobilization (quick add)" : "신경 글라이딩·가동술 빠른 추가"}
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(
                            locale === "en"
                              ? [
                                  ["Median nerve glide", "Median nerve glide"],
                                  ["Ulnar nerve glide", "Ulnar nerve glide"],
                                  ["Radial nerve glide", "Radial nerve glide"],
                                  ["Sciatic nerve slider (supine)", "Sciatic nerve slider"],
                                  ["Femoral nerve mobilization", "Femoral nerve mobilization"],
                                ]
                              : [
                                  ["정중신경 글라이딩 (Median)", "정중신경 글라이딩 (Median)"],
                                  ["척신경 글라이딩 (Ulnar)", "척신경 글라이딩 (Ulnar)"],
                                  ["요골신경 글라이딩 (Radial)", "요골신경 글라이딩 (Radial)"],
                                  ["좌골신경 슬라이딩 (Sciatic)", "좌골신경 슬라이딩 (Sciatic)"],
                                  ["대퇴신경 가동술 (Femoral)", "대퇴신경 가동술 (Femoral)"],
                                ]
                          ).map(([label, name]) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() =>
                                setManualEntries((prev) => [...prev, { name, grade: "Neural", minutes: "10" }])
                              }
                              className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-bold text-indigo-800 transition hover:bg-indigo-50"
                            >
                              + {label}
                            </button>
                          ))}
                        </div>
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
                        <p className="mb-2 text-[10px] font-bold uppercase text-indigo-700">
                          {locale === "en" ? "Home nerve sliders / glides" : "가정 신경 슬라이더·글라이딩"}
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(locale === "en"
                            ? ["HEP: Median nerve glide", "HEP: Ulnar nerve glide", "HEP: Sciatic slider (gentle)"]
                            : ["HEP: 정중신경 글라이딩", "HEP: 척신경 글라이딩", "HEP: 좌골신경 슬라이더 (약하게)"]
                          ).map((label) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() =>
                                setExerciseEntries((prev) => [
                                  ...prev,
                                  { name: label, sets: "1", reps: "10", holdSec: "3" },
                                ])
                              }
                              className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-bold text-indigo-800 transition hover:bg-indigo-50"
                            >
                              + {label}
                            </button>
                          ))}
                        </div>
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

                      <VisitFollowupPanel
                        locale={locale === "en" ? "en" : "ko"}
                        specialNotes={visitSpecialNotes}
                        isFlagged={visitIsFlagged}
                        changeLog={visitChangeLog}
                        onSpecialNotes={setVisitSpecialNotes}
                        onFlagged={setVisitIsFlagged}
                        onChangeLog={setVisitChangeLog}
                        accent="rose"
                      />

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
              documentationDefenseScore={documentationDefenseRubric.total}
              documentationDefenseBreakdown={documentationDefenseRubric.breakdown}
              documentationRecoveryPrognosis={documentationRecoveryPrognosis}
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
