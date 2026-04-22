/**
 * Outcome measures (click-to-score) — NDI / ODI / QuickDASH / WOMAC
 * NDI·ODI: 0–5 per item, sum max 50 → % = (sum/50)×100
 * QuickDASH: 11 items 1–5 → ((mean)−1)×25 → 0–100
 * WOMAC: pain 5 + stiffness 2 + function 17, each 0–4 → total 96, normalized %
 */

export type MeasureLocale = "ko" | "en";

export type Likert6Option = readonly [string, string, string, string, string, string];

export type MeasureQuestion6 = {
  id: number;
  text: string;
  options: Likert6Option;
};

export type MeasureQuestion5 = {
  id: number;
  text: string;
  options: readonly [string, string, string, string, string];
};

export type MeasureQuestionWomac = {
  id: number;
  section: "pain" | "stiffness" | "function";
  text: string;
  options: readonly [string, string, string, string, string];
};

export type NdiOdiCalcResult = {
  raw: number;
  max: number;
  percent: number;
  label: string;
};

export type QuickDashCalcResult = {
  rawMean: number;
  dashScore: number;
  percent: number;
  label: string;
};

export type WomacCalcResult = {
  pain: number;
  stiffness: number;
  function: number;
  total: number;
  maxTotal: 96;
  percent: number;
  label: string;
};

/** NDI / ODI 6-point scale (0 = no disability … 5 = complete disability) */
export const LIKERT_6_DISABILITY_KO: Likert6Option = [
  "전혀 없음",
  "약간",
  "보통",
  "상당함",
  "매우 심함",
  "할 수 없음",
] as const;

export const LIKERT_6_DISABILITY_EN: Likert6Option = [
  "No disability",
  "Mild",
  "Moderate",
  "Severe",
  "Very severe",
  "Complete / unable",
] as const;

const QUICKDASH_5_KO = [
  "어려움 없음",
  "약간 어려움",
  "보통 어려움",
  "많이 어려움",
  "할 수 없음",
] as const;

/** QuickDASH original response options (1–5) */
const QUICKDASH_5_EN = [
  "No difficulty",
  "Mild difficulty",
  "Moderate difficulty",
  "Severe difficulty",
  "Unable",
] as const;

function ndiQuestions(L6: Likert6Option): MeasureQuestion6[] {
  return [
    { id: 1, text: "", options: L6 },
    { id: 2, text: "", options: L6 },
    { id: 3, text: "", options: L6 },
    { id: 4, text: "", options: L6 },
    { id: 5, text: "", options: L6 },
    { id: 6, text: "", options: L6 },
    { id: 7, text: "", options: L6 },
    { id: 8, text: "", options: L6 },
    { id: 9, text: "", options: L6 },
    { id: 10, text: "", options: L6 },
  ];
}

const NDI_TEXT_KO = [
  "통증의 강도",
  "세면·양치, 옷 입기 등 자기 관리",
  "무거운 물건 들어올리기",
  "독서(책·스마트폰 등)",
  "두통",
  "집중력",
  "직장·가사 등 일(평소 하던 일)",
  "운전 또는 대중교통 이용",
  "잠자기",
  "여가·레크리에이션",
];

const NDI_TEXT_EN = [
  "Pain intensity",
  "Personal care (washing, dressing, etc.)",
  "Lifting",
  "Reading",
  "Headaches",
  "Concentration",
  "Work / usual duties",
  "Driving or using public transit",
  "Sleeping",
  "Recreation",
];

const ODI_TEXT_KO = [
  "통증의 정도",
  "세면·양치, 옷 입기 등 개인 위생",
  "물건 들어올리기",
  "걷기",
  "앉아 있기",
  "서 있기",
  "잠자기",
  "성생활(해당 시)",
  "사회·여가 활동",
  "여행(외출)",
];

const ODI_TEXT_EN = [
  "Pain intensity",
  "Personal care (wash, dress, etc.)",
  "Lifting",
  "Walking",
  "Sitting",
  "Standing",
  "Sleeping",
  "Sex life (if applicable)",
  "Social life / recreation",
  "Traveling",
];

function buildNdiQuestions(locale: MeasureLocale): MeasureQuestion6[] {
  const L6 = locale === "en" ? LIKERT_6_DISABILITY_EN : LIKERT_6_DISABILITY_KO;
  const texts = locale === "en" ? NDI_TEXT_EN : NDI_TEXT_KO;
  return ndiQuestions(L6).map((q, i) => ({ ...q, text: texts[i] ?? q.text }));
}

function buildOdiQuestions(locale: MeasureLocale): MeasureQuestion6[] {
  const L6 = locale === "en" ? LIKERT_6_DISABILITY_EN : LIKERT_6_DISABILITY_KO;
  const texts = locale === "en" ? ODI_TEXT_EN : ODI_TEXT_KO;
  return ndiQuestions(L6).map((q, i) => ({ ...q, text: texts[i] ?? q.text }));
}

const QD_KO = [
  "딱딱한 뚜껑(신규 병 등)을 여는 것",
  "무거운 집안일(창문 닦기·바닥 닦기 등)",
  "쇼핑백·서류 가방 등 들고 다니기",
  "등을 씻거나 머리를 감는 것",
  "칼·도구로 음식 자르기",
  "힘을 쓰는 취미·운동(골프·테니스 등)",
  "팔을 많이 쓰는 취미·운동(수영 등)",
  "대중교통 이용(버스·지하철)",
  "성적·친밀한 활동(해당 시)",
  "평소 하던 일(직장·가사)을 원만히 할 수 있음",
  "팔·어깨·손 문제로 인한 전반적 장애",
];

const QD_EN = [
  "Open a tight or new jar",
  "Do heavy household chores (e.g., wash walls, floors)",
  "Carry a shopping bag or briefcase",
  "Wash your back or brush your hair",
  "Use a knife to cut food",
  "Recreational activities requiring force (e.g., golf, tennis)",
  "Recreational activities requiring arm use (e.g., swimming)",
  "Use public transit (bus, subway)",
  "Sexual activity (if applicable)",
  "Perform usual work / home duties",
  "Overall arm, shoulder, and hand problem",
];

function buildQuickDash(locale: MeasureLocale): MeasureQuestion5[] {
  const opts = locale === "en" ? QUICKDASH_5_EN : QUICKDASH_5_KO;
  const texts = locale === "en" ? QD_EN : QD_KO;
  return texts.map((text, i) => ({ id: i + 1, text, options: opts }));
}

const LIKERT_4_WOMAC_KO = ["없음", "약간", "보통", "심함", "매우 심함"] as const;
const LIKERT_4_WOMAC_EN = ["None", "Mild", "Moderate", "Severe", "Extreme"] as const;

const WOMAC_PAIN_KO = [
  "평지 걸을 때",
  "계단 오르내릴 때",
  "밤에 누워 있을 때",
  "앉아 있거나 누워 있을 때",
  "서 있을 때",
];
const WOMAC_PAIN_EN = [
  "Walking on flat surface",
  "Going up or down stairs",
  "At night while in bed",
  "Sitting or lying",
  "Standing upright",
];

const WOMAC_STIFFNESS_KO = ["아침에 일어났을 때의 강직", "하루 중 이후(앉았다 일어난 뒤 등)의 강직"];
const WOMAC_STIFFNESS_EN = ["Stiffness after waking", "Stiffness later in the day (e.g., after sitting)"];

const WOMAC_FUNCTION_KO = [
  "계단 내려가기",
  "계단 올라가기",
  "의자에서 일어서기",
  "서 있기",
  "바닥에 물건 집기(굽히기)",
  "평지 걷기",
  "차에 타고 내리기",
  "장보기(쇼핑)",
  "양말·스타킹 신기",
  "침대에서 일어나기",
  "양말·스타킹 벗기",
  "침대에 누워 있기",
  "목욕·샤워(욕조 출입 포함)",
  "앉아 있기",
  "화장실 보조(일어서기 등)",
  "가벼운 가사(설거지 등)",
  "무거운 가사(청소·이사 등)",
];
const WOMAC_FUNCTION_EN = [
  "Descending stairs",
  "Ascending stairs",
  "Rising from sitting",
  "Standing",
  "Bending to pick up an object",
  "Walking on flat surface",
  "Getting in/out of car",
  "Shopping",
  "Putting on socks/stockings",
  "Rising from bed",
  "Taking off socks/stockings",
  "Lying in bed",
  "Bathing/showering (including tub)",
  "Sitting",
  "Using toilet (e.g., standing up)",
  "Light household duties",
  "Heavy household duties",
];

function buildWomac(locale: MeasureLocale) {
  const L4 = locale === "en" ? LIKERT_4_WOMAC_EN : LIKERT_4_WOMAC_KO;
  const painT = locale === "en" ? WOMAC_PAIN_EN : WOMAC_PAIN_KO;
  const stiffT = locale === "en" ? WOMAC_STIFFNESS_EN : WOMAC_STIFFNESS_KO;
  const funcT = locale === "en" ? WOMAC_FUNCTION_EN : WOMAC_FUNCTION_KO;
  const pain: MeasureQuestionWomac[] = painT.map((text, i) => ({
    id: i + 1,
    section: "pain" as const,
    text,
    options: L4,
  }));
  const stiffness: MeasureQuestionWomac[] = stiffT.map((text, i) => ({
    id: i + 6,
    section: "stiffness" as const,
    text,
    options: L4,
  }));
  const fn: MeasureQuestionWomac[] = funcT.map((text, i) => ({
    id: i + 8,
    section: "function" as const,
    text,
    options: L4,
  }));
  return { pain, stiffness, function: fn, allQuestions: [...pain, ...stiffness, ...fn] };
}

export function calcNdi(score: number, locale: MeasureLocale = "ko"): NdiOdiCalcResult {
  const raw = Math.max(0, Math.min(50, score));
  const percent = (raw / 50) * 100;
  let label: string;
  if (locale === "en") {
    if (raw <= 4) label = "No disability";
    else if (raw <= 14) label = "Mild disability";
    else if (raw <= 24) label = "Moderate disability";
    else if (raw <= 34) label = "Severe disability";
    else label = "Complete disability";
  } else {
    if (raw <= 4) label = "장애 없음";
    else if (raw <= 14) label = "경도 장애";
    else if (raw <= 24) label = "중등도 장애";
    else if (raw <= 34) label = "중증 장애";
    else label = "고도 장애";
  }
  return { raw, max: 50, percent, label };
}

export function calcOdi(score: number, locale: MeasureLocale = "ko"): NdiOdiCalcResult {
  const raw = Math.max(0, Math.min(50, score));
  const percent = (raw / 50) * 100;
  let label: string;
  if (locale === "en") {
    if (percent <= 20) label = "Minimal disability";
    else if (percent <= 40) label = "Moderate disability";
    else if (percent <= 60) label = "Severe disability";
    else label = "Bed-bound / crippled";
  } else {
    if (percent <= 20) label = "최소 장애";
    else if (percent <= 40) label = "중등도 장애";
    else if (percent <= 60) label = "중증 장애";
    else label = "고도 장애·불구에 가까움";
  }
  return { raw, max: 50, percent, label };
}

export function calcQuickDash(responses: readonly number[], locale: MeasureLocale = "ko"): QuickDashCalcResult {
  const n = 11;
  if (responses.length !== n) {
    return {
      rawMean: 0,
      dashScore: 0,
      percent: 0,
      label: locale === "en" ? "Item count mismatch (11 required)" : "응답 수 불일치(11문항 필요)",
    };
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = responses[i];
    if (typeof v !== "number" || v < 1 || v > 5) {
      return {
        rawMean: 0,
        dashScore: 0,
        percent: 0,
        label: locale === "en" ? "Each item must be scored 1–5" : "각 문항은 1~5만 허용",
      };
    }
    sum += v;
  }
  const rawMean = sum / n;
  const dashScore = Math.round(((rawMean - 1) * 25 + Number.EPSILON) * 100) / 100;
  const percent = Math.min(100, Math.max(0, dashScore));
  let label: string;
  if (locale === "en") {
    if (percent <= 25) label = "Mild disability";
    else if (percent <= 50) label = "Moderate disability";
    else if (percent <= 75) label = "Severe disability";
    else label = "Extreme disability";
  } else {
    if (percent <= 25) label = "경미한 장애";
    else if (percent <= 50) label = "중등도 장애";
    else if (percent <= 75) label = "중증 장애";
    else label = "고도 장애";
  }
  return { rawMean, dashScore, percent, label };
}

function sumWomacScores(scores: number[], max: number): number {
  let s = 0;
  for (const v of scores) {
    if (typeof v !== "number" || v < 0 || v > 4) return NaN;
    s += v;
  }
  return s > max ? max : s;
}

export function calcWomac(
  pain: number[],
  stiffness: number[],
  func: number[],
  locale: MeasureLocale = "ko",
): WomacCalcResult {
  if (pain.length !== 5 || stiffness.length !== 2 || func.length !== 17) {
    return {
      pain: NaN,
      stiffness: NaN,
      function: NaN,
      total: NaN,
      maxTotal: 96,
      percent: 0,
      label:
        locale === "en"
          ? "Item mismatch (pain 5, stiffness 2, function 17)"
          : "문항 수 불일치(통증5·강직2·기능17)",
    };
  }
  const p = sumWomacScores(pain, 20);
  const st = sumWomacScores(stiffness, 8);
  const f = sumWomacScores(func, 68);
  if ([p, st, f].some((x) => Number.isNaN(x))) {
    return {
      pain: NaN,
      stiffness: NaN,
      function: NaN,
      total: NaN,
      maxTotal: 96,
      percent: 0,
      label: locale === "en" ? "Each score must be 0–4" : "각 점수는 0~4만 허용",
    };
  }
  const total = p + st + f;
  const percent = (total / 96) * 100;
  let label: string;
  if (locale === "en") {
    if (percent < 25) label = "Mild symptoms";
    else if (percent < 50) label = "Moderate";
    else if (percent < 75) label = "Severe";
    else label = "Extreme";
  } else {
    if (percent < 25) label = "경미한 증상";
    else if (percent < 50) label = "중등도";
    else if (percent < 75) label = "중증";
    else label = "고도(심함)";
  }
  return {
    pain: p,
    stiffness: st,
    function: f,
    total,
    maxTotal: 96,
    percent,
    label,
  };
}

export type OutcomeMeasuresBundle = {
  neck: {
    id: "ndi";
    name: string;
    description: string;
    questions: MeasureQuestion6[];
    maxRaw: 50;
    calc: (score: number) => NdiOdiCalcResult;
  };
  lumbar: {
    id: "odi";
    name: string;
    description: string;
    questions: MeasureQuestion6[];
    maxRaw: 50;
    calc: (score: number) => NdiOdiCalcResult;
  };
  shoulder: {
    id: "quickdash";
    name: string;
    description: string;
    questions: MeasureQuestion5[];
    itemCount: 11;
    calc: (responses: readonly number[]) => QuickDashCalcResult;
  };
  knee: {
    id: "womac";
    name: string;
    description: string;
    sections: {
      pain: MeasureQuestionWomac[];
      stiffness: MeasureQuestionWomac[];
      function: MeasureQuestionWomac[];
    };
    allQuestions: MeasureQuestionWomac[];
    maxTotal: 96;
    calc: (pain: number[], stiffness: number[], func: number[]) => WomacCalcResult;
  };
};

export function getOutcomeMeasuresBundle(locale: MeasureLocale): OutcomeMeasuresBundle {
  const womac = buildWomac(locale);
  const L = locale;
  return {
    neck: {
      id: "ndi",
      name: "NDI (Neck Disability Index)",
      description:
        locale === "en"
          ? "Neck-related disability — 0–5 per item, max raw score 50"
          : "경추 관련 장애 지수 — 문항당 0~5점, 합계 최대 50점",
      questions: buildNdiQuestions(locale),
      maxRaw: 50,
      calc: (score: number) => calcNdi(score, L),
    },
    lumbar: {
      id: "odi",
      name: "ODI (Oswestry Disability Index)",
      description:
        locale === "en"
          ? "Low back–related disability — 0–5 per item, max raw score 50"
          : "요추 관련 장애 지수 — 문항당 0~5점, 합계 최대 50점",
      questions: buildOdiQuestions(locale),
      maxRaw: 50,
      calc: (score: number) => calcOdi(score, L),
    },
    shoulder: {
      id: "quickdash",
      name: locale === "en" ? "QuickDASH (Upper Extremity Function)" : "QuickDASH (상지 기능 장애)",
      description:
        locale === "en"
          ? "Past week — items scored 1–5; DASH = ((mean)−1)×25"
          : "지난 1주일 — 문항당 1~5점, DASH = ((평균)−1)×25",
      questions: buildQuickDash(locale),
      itemCount: 11,
      calc: (responses: readonly number[]) => calcQuickDash(responses, L),
    },
    knee: {
      id: "womac",
      name: locale === "en" ? "WOMAC Osteoarthritis Index (Knee)" : "WOMAC (슬관절 골관절염 지수)",
      description:
        locale === "en"
          ? "Pain 5 + stiffness 2 + function 17 items; each 0–4; max total 96"
          : "통증 5 + 강직 2 + 일상기능 17, 각 0~4점, 총점 최대 96",
      sections: {
        pain: womac.pain,
        stiffness: womac.stiffness,
        function: womac.function,
      },
      allQuestions: womac.allQuestions,
      maxTotal: 96,
      calc: (pain: number[], stiffness: number[], func: number[]) => calcWomac(pain, stiffness, func, L),
    },
  };
}

/** Default bundle (Korean) — backward compatible */
export const OUTCOME_MEASURES: OutcomeMeasuresBundle = getOutcomeMeasuresBundle("ko");

export const OUTCOME_MEASURES_LOWBACK = OUTCOME_MEASURES.lumbar;

export type OutcomeMeasureRegion = keyof OutcomeMeasuresBundle;

const OUTCOME_REGION_ALIASES: Record<string, OutcomeMeasureRegion> = {
  lowback: "lumbar",
  "low-back": "lumbar",
};

export function resolveOutcomeMeasureRegion(diagnosisArea: string): OutcomeMeasureRegion | null {
  const raw = diagnosisArea.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!raw) return null;
  if (raw in OUTCOME_MEASURES) return raw as OutcomeMeasureRegion;
  return OUTCOME_REGION_ALIASES[raw] ?? null;
}

export const OUTCOME_ID_TO_MODAL_REGION: Partial<Record<string, OutcomeMeasureRegion>> = {
  ndi: "neck",
  odi: "lumbar",
  quickdash: "shoulder",
  womac: "knee",
};

export function getModalRegionForOutcomeId(outcomeId: string): OutcomeMeasureRegion | null {
  const r = OUTCOME_ID_TO_MODAL_REGION[outcomeId];
  return r ?? null;
}
