/**
 * 기능 평가 척도 마스터 데이터 (클릭·자동 산출용)
 * — NDI / ODI: 각 문항 0~5점, 합계 최대 50 → % = (합/50)×100
 * — QuickDASH: 11문항 각 1~5 → ((평균)−1)×25 → 0~100
 * — WOMAC: 통증 5 + 강직 2 + 일상기능 17, 각 0~4 → 소계·총점(96) 및 정규화 %
 */

export type Likert6Option = readonly [string, string, string, string, string, string];

export type MeasureQuestion6 = {
  id: number;
  text: string;
  /** 인덱스 0~5 = 점수 0~5 */
  options: Likert6Option;
};

export type MeasureQuestion5 = {
  id: number;
  text: string;
  /** 인덱스 0~4 = 점수 1~5 (QuickDASH) */
  options: readonly [string, string, string, string, string];
};

export type MeasureQuestionWomac = {
  id: number;
  section: "pain" | "stiffness" | "function";
  text: string;
  /** 인덱스 0~4 = 점수 0~4 */
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

/** NDI / ODI 공통 6점 척도 (0=장애 없음 … 5=최대 장애) */
export const LIKERT_6_DISABILITY_KO: Likert6Option = [
  "전혀 없음",
  "약간",
  "보통",
  "상당함",
  "매우 심함",
  "할 수 없음",
] as const;

/** QuickDASH 5점 척도 (1=어려움 없음 … 5=매우 어려움 / 불가) */
const QUICKDASH_5_KO = [
  "어려움 없음",
  "약간 어려움",
  "보통 어려움",
  "많이 어려움",
  "할 수 없음",
] as const;

const NDI_QUESTIONS: MeasureQuestion6[] = [
  { id: 1, text: "통증의 강도", options: LIKERT_6_DISABILITY_KO },
  { id: 2, text: "세면·양치, 옷 입기 등 자기 관리", options: LIKERT_6_DISABILITY_KO },
  { id: 3, text: "무거운 물건 들어올리기", options: LIKERT_6_DISABILITY_KO },
  { id: 4, text: "독서(책·스마트폰 등)", options: LIKERT_6_DISABILITY_KO },
  { id: 5, text: "두통", options: LIKERT_6_DISABILITY_KO },
  { id: 6, text: "집중력", options: LIKERT_6_DISABILITY_KO },
  { id: 7, text: "직장·가사 등 일(평소 하던 일)", options: LIKERT_6_DISABILITY_KO },
  { id: 8, text: "운전 또는 대중교통 이용", options: LIKERT_6_DISABILITY_KO },
  { id: 9, text: "잠자기", options: LIKERT_6_DISABILITY_KO },
  { id: 10, text: "여가·레크리에이션", options: LIKERT_6_DISABILITY_KO },
];

/** NDI 합계 0~50 → 장애도 구간 (Vernon & Mior, 한국어 임상 관례에 맞춘 요약) */
export function calcNdi(score: number): NdiOdiCalcResult {
  const raw = Math.max(0, Math.min(50, score));
  const percent = (raw / 50) * 100;
  let label: string;
  if (raw <= 4) label = "장애 없음";
  else if (raw <= 14) label = "경도 장애";
  else if (raw <= 24) label = "중등도 장애";
  else if (raw <= 34) label = "중증 장애";
  else label = "고도 장애";
  return { raw, max: 50, percent, label };
}

const ODI_QUESTIONS: MeasureQuestion6[] = [
  { id: 1, text: "통증의 정도", options: LIKERT_6_DISABILITY_KO },
  { id: 2, text: "세면·양치, 옷 입기 등 개인 위생", options: LIKERT_6_DISABILITY_KO },
  { id: 3, text: "물건 들어올리기", options: LIKERT_6_DISABILITY_KO },
  { id: 4, text: "걷기", options: LIKERT_6_DISABILITY_KO },
  { id: 5, text: "앉아 있기", options: LIKERT_6_DISABILITY_KO },
  { id: 6, text: "서 있기", options: LIKERT_6_DISABILITY_KO },
  { id: 7, text: "잠자기", options: LIKERT_6_DISABILITY_KO },
  { id: 8, text: "성생활(해당 시)", options: LIKERT_6_DISABILITY_KO },
  { id: 9, text: "사회·여가 활동", options: LIKERT_6_DISABILITY_KO },
  { id: 10, text: "여행(외출)", options: LIKERT_6_DISABILITY_KO },
];

/** ODI % 해석 (요통 임상에서 흔한 구간) */
export function calcOdi(score: number): NdiOdiCalcResult {
  const raw = Math.max(0, Math.min(50, score));
  const percent = (raw / 50) * 100;
  let label: string;
  if (percent <= 20) label = "최소 장애";
  else if (percent <= 40) label = "중등도 장애";
  else if (percent <= 60) label = "중증 장애";
  else label = "고도 장애·불구에 가까움";
  return { raw, max: 50, percent, label };
}

/** QuickDASH 본 설문 11문항 (지난 한 주 기준) */
const QUICKDASH_MAIN: MeasureQuestion5[] = [
  { id: 1, text: "딱딱한 뚜껑(신규 병 등)을 여는 것", options: QUICKDASH_5_KO },
  { id: 2, text: "무거운 집안일(창문 닦기·바닥 닦기 등)", options: QUICKDASH_5_KO },
  { id: 3, text: "쇼핑백·서류 가방 등 들고 다니기", options: QUICKDASH_5_KO },
  { id: 4, text: "등을 씻거나 머리를 감는 것", options: QUICKDASH_5_KO },
  { id: 5, text: "칼·도구로 음식 자르기", options: QUICKDASH_5_KO },
  { id: 6, text: "힘을 쓰는 취미·운동(골프·테니스 등)", options: QUICKDASH_5_KO },
  { id: 7, text: "팔을 많이 쓰는 취미·운동(수영 등)", options: QUICKDASH_5_KO },
  { id: 8, text: "대중교통 이용(버스·지하철)", options: QUICKDASH_5_KO },
  { id: 9, text: "성적·친밀한 활동(해당 시)", options: QUICKDASH_5_KO },
  { id: 10, text: "평소 하던 일(직장·가사)을 원만히 할 수 있음", options: QUICKDASH_5_KO },
  { id: 11, text: "팔·어깨·손 문제로 인한 전반적 장애", options: QUICKDASH_5_KO },
];

/**
 * QuickDASH 점수: 각 1~5, DASH = ((응답 합 / 11) − 1) × 25 → 0~100
 * 높을수록 장애가 큼.
 */
export function calcQuickDash(responses: readonly number[]): QuickDashCalcResult {
  const n = QUICKDASH_MAIN.length;
  if (responses.length !== n) {
    return { rawMean: 0, dashScore: 0, percent: 0, label: "응답 수 불일치(11문항 필요)" };
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = responses[i];
    if (typeof v !== "number" || v < 1 || v > 5) {
      return { rawMean: 0, dashScore: 0, percent: 0, label: "각 문항은 1~5만 허용" };
    }
    sum += v;
  }
  const rawMean = sum / n;
  const dashScore = Math.round(((rawMean - 1) * 25 + Number.EPSILON) * 100) / 100;
  const percent = Math.min(100, Math.max(0, dashScore));
  let label: string;
  if (percent <= 25) label = "경미한 장애";
  else if (percent <= 50) label = "중등도 장애";
  else if (percent <= 75) label = "중증 장애";
  else label = "고도 장애";
  return { rawMean, dashScore: dashScore, percent, label };
}

/** WOMAC: 없음 / 약간 / 보통 / 심함 / 매우 심함 → 0~4 */
const LIKERT_4_WOMAC = ["없음", "약간", "보통", "심함", "매우 심함"] as const;

const WOMAC_PAIN: MeasureQuestionWomac[] = [
  { id: 1, section: "pain", text: "평지 걸을 때", options: LIKERT_4_WOMAC },
  { id: 2, section: "pain", text: "계단 오르내릴 때", options: LIKERT_4_WOMAC },
  { id: 3, section: "pain", text: "밤에 누워 있을 때", options: LIKERT_4_WOMAC },
  { id: 4, section: "pain", text: "앉아 있거나 누워 있을 때", options: LIKERT_4_WOMAC },
  { id: 5, section: "pain", text: "서 있을 때", options: LIKERT_4_WOMAC },
];

const WOMAC_STIFFNESS: MeasureQuestionWomac[] = [
  { id: 6, section: "stiffness", text: "아침에 일어났을 때의 강직", options: LIKERT_4_WOMAC },
  { id: 7, section: "stiffness", text: "하루 중 이후(앉았다 일어난 뒤 등)의 강직", options: LIKERT_4_WOMAC },
];

const WOMAC_FUNCTION: MeasureQuestionWomac[] = [
  { id: 8, section: "function", text: "계단 내려가기", options: LIKERT_4_WOMAC },
  { id: 9, section: "function", text: "계단 올라가기", options: LIKERT_4_WOMAC },
  { id: 10, section: "function", text: "의자에서 일어서기", options: LIKERT_4_WOMAC },
  { id: 11, section: "function", text: "서 있기", options: LIKERT_4_WOMAC },
  { id: 12, section: "function", text: "바닥에 물건 집기(굽히기)", options: LIKERT_4_WOMAC },
  { id: 13, section: "function", text: "평지 걷기", options: LIKERT_4_WOMAC },
  { id: 14, section: "function", text: "차에 타고 내리기", options: LIKERT_4_WOMAC },
  { id: 15, section: "function", text: "장보기(쇼핑)", options: LIKERT_4_WOMAC },
  { id: 16, section: "function", text: "양말·스타킹 신기", options: LIKERT_4_WOMAC },
  { id: 17, section: "function", text: "침대에서 일어나기", options: LIKERT_4_WOMAC },
  { id: 18, section: "function", text: "양말·스타킹 벗기", options: LIKERT_4_WOMAC },
  { id: 19, section: "function", text: "침대에 누워 있기", options: LIKERT_4_WOMAC },
  { id: 20, section: "function", text: "목욕·샤워(욕조 출입 포함)", options: LIKERT_4_WOMAC },
  { id: 21, section: "function", text: "앉아 있기", options: LIKERT_4_WOMAC },
  { id: 22, section: "function", text: "화장실 보조(일어서기 등)", options: LIKERT_4_WOMAC },
  { id: 23, section: "function", text: "가벼운 가사(설거지 등)", options: LIKERT_4_WOMAC },
  { id: 24, section: "function", text: "무거운 가사(청소·이사 등)", options: LIKERT_4_WOMAC },
];

function sumWomacScores(scores: number[], max: number): number {
  let s = 0;
  for (const v of scores) {
    if (typeof v !== "number" || v < 0 || v > 4) return NaN;
    s += v;
  }
  return s > max ? max : s;
}

/**
 * WOMAC: 통증 최대 20, 강직 8, 기능 68, 총 96
 * 정규화 % = (총점/96)×100
 */
export function calcWomac(pain: number[], stiffness: number[], func: number[]): WomacCalcResult {
  if (pain.length !== 5 || stiffness.length !== 2 || func.length !== 17) {
    return {
      pain: NaN,
      stiffness: NaN,
      function: NaN,
      total: NaN,
      maxTotal: 96,
      percent: 0,
      label: "문항 수 불일치(통증5·강직2·기능17)",
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
      label: "각 점수는 0~4만 허용",
    };
  }
  const total = p + st + f;
  const percent = (total / 96) * 100;
  let label: string;
  if (percent < 25) label = "경미한 증상";
  else if (percent < 50) label = "중등도";
  else if (percent < 75) label = "중증";
  else label = "고도(심함)";
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

/** 부위별 척도 정의 (앱 `JOSPT_OUTCOME_DB` 키와 동일: neck, shoulder, lumbar, knee) */
export const OUTCOME_MEASURES = {
  neck: {
    id: "ndi" as const,
    name: "NDI (Neck Disability Index)",
    description: "경추 관련 장애 지수 — 문항당 0~5점, 합계 최대 50점",
    questions: NDI_QUESTIONS,
    maxRaw: 50,
    calc: calcNdi,
  },
  /** 요추: ODI (앱 키는 `lumbar`) */
  lumbar: {
    id: "odi" as const,
    name: "ODI (Oswestry Disability Index)",
    description: "요추 관련 장애 지수 — 문항당 0~5점, 합계 최대 50점",
    questions: ODI_QUESTIONS,
    maxRaw: 50,
    calc: calcOdi,
  },
  shoulder: {
    id: "quickdash" as const,
    name: "QuickDASH (상지 기능 장애)",
    description: "지난 1주일 — 문항당 1~5점, DASH = ((평균)−1)×25",
    questions: QUICKDASH_MAIN,
    itemCount: 11,
    calc: calcQuickDash,
  },
  knee: {
    id: "womac" as const,
    name: "WOMAC (슬관절 골관절염 지수)",
    description: "통증 5 + 강직 2 + 일상기능 17, 각 0~4점, 총점 최대 96",
    sections: {
      pain: WOMAC_PAIN,
      stiffness: WOMAC_STIFFNESS,
      function: WOMAC_FUNCTION,
    },
    allQuestions: [...WOMAC_PAIN, ...WOMAC_STIFFNESS, ...WOMAC_FUNCTION],
    maxTotal: 96 as const,
    calc: calcWomac,
  },
} as const;

/** `lumbar`와 동일 데이터 (별칭) */
export const OUTCOME_MEASURES_LOWBACK = OUTCOME_MEASURES.lumbar;

export type OutcomeMeasureRegion = keyof typeof OUTCOME_MEASURES;

const OUTCOME_REGION_ALIASES: Record<string, OutcomeMeasureRegion> = {
  lowback: "lumbar",
  "low-back": "lumbar",
};

/** Step 1 진단 부위 문자열 → 클릭형 척도 키 (미지원 부위는 null) */
export function resolveOutcomeMeasureRegion(diagnosisArea: string): OutcomeMeasureRegion | null {
  const raw = diagnosisArea.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!raw) return null;
  if (raw in OUTCOME_MEASURES) return raw as OutcomeMeasureRegion;
  return OUTCOME_REGION_ALIASES[raw] ?? null;
}

/** JOSPT 척도 id → 클릭형 모달(OUTCOME_MEASURES) 영역. 없으면 해당 척도는 수동 점수만 */
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
