/**
 * Step 1 주관적 문진 — 부위별 특이 질문 (스크리닝)
 * AI Red Flag 위험도 산출 시 `formData.step1.redFlags`와 연동
 */

export type ScreeningCategory = "spine" | "joint" | "general" | "oncology_infection";

export type ScreeningQuestion = {
  /** 전역 고유 ID (로그·AI 근거용) */
  id: string;
  text: string;
  /** 암·감염·골절·신경압박 응급 등 임상적 Red Flag */
  isRedFlag: boolean;
  category: ScreeningCategory;
  /** UI 그룹 라벨 */
  group: "spine" | "joint" | "general";
};

export type ScreeningRegion =
  | "neck"
  | "shoulder"
  | "elbow"
  | "wrist"
  | "hand"
  | "lumbar"
  | "hip"
  | "knee"
  | "ankle"
  | "foot";

/** Spine 그룹 — 신경근·척수·말단(cauda) 관련 */
const SPINE_NECK: ScreeningQuestion[] = [
  {
    id: "neck_nerve_root_radiating",
    text: "팔·손으로 퍼지는 저림·전기가 쏘는 느낌, 또는 근력 약화가 동반되나요? (Nerve root)",
    isRedFlag: false,
    category: "general",
    group: "spine",
  },
  {
    id: "neck_myelopathy_gait",
    text: "걸음이 불안정하거나, 손이 잘 안 따라오고 물건을 자주 떨어뜨리나요? (척수 병증 의심)",
    isRedFlag: true,
    category: "general",
    group: "spine",
  },
  {
    id: "neck_bowel_bladder_new",
    text: "최근에 새로 생긴 배뇨·배변 조절 곤란이 있나요? (응급 평가 필요)",
    isRedFlag: true,
    category: "general",
    group: "spine",
  },
];

const SPINE_LUMBAR: ScreeningQuestion[] = [
  {
    id: "lumbar_nerve_root_radicular",
    text: "한쪽 다리로 퍼지는 저림·감각 이상·근력 저하가 있나요? (Nerve root)",
    isRedFlag: false,
    category: "general",
    group: "spine",
  },
  {
    id: "lumbar_cauda_retention",
    text: "소변이 마려운데도 못 보거나, 배뇨가 거의 안 나오나요? (Cauda equina — 응급)",
    isRedFlag: true,
    category: "general",
    group: "spine",
  },
  {
    id: "lumbar_saddle_anesthesia",
    text: "회음부·둔부에 감각이 묵직하게 사라지거나 ‘안장’ 부위가 무감각한가요? (Cauda equina)",
    isRedFlag: true,
    category: "general",
    group: "spine",
  },
  {
    id: "lumbar_bilateral_weakness",
    text: "양쪽 다리에 동시에 심한 힘이 빠지나요? (Cauda equina 가능성)",
    isRedFlag: true,
    category: "general",
    group: "spine",
  },
];

/** Joint 그룹 — 불안정·힘빠짐·감염·골절 의심 */
const JOINT_BASE: ScreeningQuestion[] = [
  {
    id: "joint_instability",
    text: "관절이 빠질 것 같거나, 방향을 바꿀 때 불안정한 느낌이 있나요? (Instability)",
    isRedFlag: false,
    category: "joint",
    group: "joint",
  },
  {
    id: "joint_giving_way",
    text: "갑자기 무릎·발목 등이 꺾이거나 힘이 빠져서 지지가 안 되나요? (Giving way)",
    isRedFlag: false,
    category: "joint",
    group: "joint",
  },
  {
    id: "joint_hot_swollen_septic",
    text: "갑자기 심한 붓기·열감·발적이 동반되나요? (화농성 관절염·감염 의심)",
    isRedFlag: true,
    category: "oncology_infection",
    group: "joint",
  },
  {
    id: "joint_fracture_trauma",
    text: "외상 후 심한 부종·변형·하중 부지가 전혀 안 되나요? (골절·인대 파열 의심)",
    isRedFlag: true,
    category: "general",
    group: "joint",
  },
];

const JOINT_WEIGHT_BEARING: ScreeningQuestion[] = [
  {
    id: "joint_unable_bear_weight",
    text: "체중을 실을 수 없을 정도로 통증이 심한가요? (골절·심한 손상 의심)",
    isRedFlag: true,
    category: "general",
    group: "joint",
  },
];

/** 부위별 추가 (선택) */
const REGION_EXTRA: Partial<Record<ScreeningRegion, ScreeningQuestion[]>> = {
  knee: [
    {
      id: "knee_locking_catching",
      text: "무릎이 끼이거나 잠기는 느낌이 있나요? (반월상 연골 등)",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
  shoulder: [
    {
      id: "shoulder_traumatic_dislocation",
      text: "탈구 경험이 있거나 어깨가 빠졌다 들어간 적이 있나요?",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
  ankle: [
    {
      id: "ankle_repeated_sprain",
      text: "같은 발목을 반복적으로 접질렀나요? (만성 불안정)",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
};

/** 진단 부위 문자열 → 스크리닝 키 */
export function resolveScreeningRegion(diagnosisArea: string): ScreeningRegion | null {
  const raw = diagnosisArea.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!raw) return null;
  const aliases: Record<string, ScreeningRegion> = {
    back: "lumbar",
    lowback: "lumbar",
    cervical: "neck",
  };
  const key = (aliases[raw] ?? raw) as ScreeningRegion;
  const valid: ScreeningRegion[] = [
    "neck",
    "shoulder",
    "elbow",
    "wrist",
    "hand",
    "lumbar",
    "hip",
    "knee",
    "ankle",
    "foot",
  ];
  return valid.includes(key) ? key : null;
}

function isSpineRegion(r: ScreeningRegion): boolean {
  return r === "neck" || r === "lumbar";
}

export type ScreeningLocale = "ko" | "en";

/** English copies — same IDs for AI / red-flag linkage */
const SPINE_NECK_EN: ScreeningQuestion[] = SPINE_NECK.map((q, i) => ({
  ...q,
  text: [
    "Radiating numbness or electric pain into the arm or hand, or weakness? (Nerve root)",
    "Unsteady gait, hand clumsiness, or frequent dropping of objects? (Possible myelopathy)",
    "New onset difficulty controlling bowel or bladder? (Urgent evaluation)",
  ][i],
}));

const SPINE_LUMBAR_EN: ScreeningQuestion[] = SPINE_LUMBAR.map((q, i) => ({
  ...q,
  text: [
    "Radiating symptoms into one leg with numbness or weakness? (Nerve root)",
    "Urinary retention or inability to void despite urge? (Cauda equina — emergency)",
    "Saddle anesthesia or loss of sensation in the perineum/buttocks? (Cauda equina)",
    "Severe bilateral leg weakness at the same time? (Possible cauda equina)",
  ][i],
}));

const JOINT_BASE_EN: ScreeningQuestion[] = JOINT_BASE.map((q, i) => ({
  ...q,
  text: [
    "Feeling the joint may give way or instability with pivoting? (Instability)",
    "Sudden buckling or inability to bear weight (e.g., knee, ankle)? (Giving way)",
    "Acute hot, swollen, erythematous joint? (Septic arthritis — concern)",
    "Severe swelling, deformity, or inability to bear weight after trauma? (Fracture / ligament injury)",
  ][i],
}));

const JOINT_WEIGHT_BEARING_EN: ScreeningQuestion[] = JOINT_WEIGHT_BEARING.map((q) => ({
  ...q,
  text: "Pain so severe you cannot bear weight? (Fracture / severe injury concern)",
}));

const REGION_EXTRA_EN: Partial<Record<ScreeningRegion, ScreeningQuestion[]>> = {
  knee: [
    {
      id: "knee_locking_catching",
      text: "Locking or catching in the knee? (e.g., meniscus)",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
  shoulder: [
    {
      id: "shoulder_traumatic_dislocation",
      text: "History of dislocation or the shoulder “coming out”?",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
  ankle: [
    {
      id: "ankle_repeated_sprain",
      text: "Repeated ankle sprains on the same side? (Chronic instability)",
      isRedFlag: false,
      category: "joint",
      group: "joint",
    },
  ],
};

/** 부위에 맞는 특이 질문 목록 */
export function getScreeningQuestionsForRegion(
  region: ScreeningRegion | null,
  locale: ScreeningLocale = "ko",
): ScreeningQuestion[] {
  if (!region) return [];

  if (isSpineRegion(region)) {
    const spineBlock =
      region === "neck" ? (locale === "en" ? SPINE_NECK_EN : SPINE_NECK) : locale === "en" ? SPINE_LUMBAR_EN : SPINE_LUMBAR;
    return [...spineBlock];
  }

  const base = locale === "en" ? JOINT_BASE_EN : JOINT_BASE;
  const wb = locale === "en" ? JOINT_WEIGHT_BEARING_EN : JOINT_WEIGHT_BEARING;
  const extra = locale === "en" ? REGION_EXTRA_EN[region] : REGION_EXTRA[region];

  return [...base, ...wb, ...(extra ?? [])];
}

export const GENERIC_RED_FLAG_META = {
  nightPain: {
    id: "generic_night_pain",
    label: "야간통(Night pain) — 악성·감염 등 감별",
    isRedFlag: true,
  },
  weightLoss: {
    id: "generic_unexplained_weight_loss",
    label: "체중 감소(설명되지 않는) — 악성·전신 질환 감별",
    isRedFlag: true,
  },
  neuroBowelBladder: {
    id: "generic_neuro_bowel_bladder",
    label: "신경성 배뇨·배변 장애 — 척수·말단 압박 감별",
    isRedFlag: true,
  },
} as const;

const GENERIC_RED_FLAG_META_EN = {
  nightPain: {
    id: "generic_night_pain",
    label: "Night pain — malignancy / infection work-up",
    isRedFlag: true,
  },
  weightLoss: {
    id: "generic_unexplained_weight_loss",
    label: "Unexplained weight loss — systemic / malignant concern",
    isRedFlag: true,
  },
  neuroBowelBladder: {
    id: "generic_neuro_bowel_bladder",
    label: "Neurogenic bowel/bladder — cord / cauda equina concern",
    isRedFlag: true,
  },
} as const;

export function getGenericRedFlagMeta(locale: ScreeningLocale) {
  return locale === "en" ? GENERIC_RED_FLAG_META_EN : GENERIC_RED_FLAG_META;
}

export type Step1RedFlagEntry = {
  questionId: string;
  regionKey: string;
  label: string;
  isRedFlag: boolean;
  source: "screening" | "generic";
};
