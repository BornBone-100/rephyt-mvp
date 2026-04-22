// src/constants/measures.ts

export const OUTCOME_MEASURES = {
  // ==========================================
  // 1. UPPER QUARTER (상지 및 척추 상부)
  // ==========================================

  neck: {
    id: "ndi",
    name: "NDI (Neck Disability Index)",
    description: "Choose the statement that best describes your condition.",
    scaleType: "0-5",
    scaleLabels: { min: "0 (No pain/limitation)", max: "5 (Severe pain/limitation)" },
    questions: [
      { id: "n1", section: "General", text: "Pain Intensity" },
      { id: "n2", section: "General", text: "Personal Care (Washing, Dressing, etc.)" },
      { id: "n3", section: "General", text: "Lifting" },
      { id: "n4", section: "General", text: "Reading" },
      { id: "n5", section: "General", text: "Headaches" },
      { id: "n6", section: "General", text: "Concentration" },
      { id: "n7", section: "General", text: "Work" },
      { id: "n8", section: "General", text: "Driving" },
      { id: "n9", section: "General", text: "Sleeping" },
      { id: "n10", section: "General", text: "Recreation" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 50) * 100),
  },

  shoulder: {
    id: "spadi",
    name: "SPADI (Shoulder Pain and Disability Index)",
    description: "Rate your pain and difficulty on a scale of 0 to 10.",
    scaleType: "0-10",
    scaleLabels: { min: "0 (None)", max: "10 (Worst/Unable)" },
    questions: [
      { id: "p1", section: "Pain", text: "Pain at its worst?" },
      { id: "p2", section: "Pain", text: "Pain when lying on the involved side?" },
      { id: "p3", section: "Pain", text: "Pain reaching for something on a high shelf?" },
      { id: "p4", section: "Pain", text: "Pain touching the back of your neck?" },
      { id: "p5", section: "Pain", text: "Pain pushing with the involved arm?" },
      { id: "d1", section: "Disability", text: "Difficulty washing your hair?" },
      { id: "d2", section: "Disability", text: "Difficulty washing your back?" },
      { id: "d3", section: "Disability", text: "Difficulty putting on an undershirt or jumper?" },
      { id: "d4", section: "Disability", text: "Difficulty putting on a shirt that buttons down the front?" },
      { id: "d5", section: "Disability", text: "Difficulty putting on your pants?" },
      { id: "d6", section: "Disability", text: "Difficulty placing an object on a high shelf?" },
      { id: "d7", section: "Disability", text: "Difficulty carrying a heavy object of 10 lbs?" },
      { id: "d8", section: "Disability", text: "Difficulty removing something from your back pocket?" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 130) * 100),
  },

  arm: {
    id: "quickdash",
    name: "QuickDASH",
    description: "Rate your ability to do the following activities in the last week.",
    scaleType: "1-5",
    scaleLabels: { min: "1 (No difficulty)", max: "5 (Unable)" },
    questions: [
      { id: "q1", section: "Function", text: "Open a tight or new jar." },
      { id: "q2", section: "Function", text: "Do heavy household chores." },
      { id: "q3", section: "Function", text: "Carry a shopping bag or briefcase." },
      { id: "q4", section: "Function", text: "Wash your back." },
      { id: "q5", section: "Function", text: "Use a knife to cut food." },
      { id: "q6", section: "Function", text: "Recreational activities which require little effort." },
      { id: "q7", section: "Social", text: "Interference with normal social activities." },
      { id: "q8", section: "Work", text: "Limitation in work or other regular daily activities." },
      { id: "q9", section: "Symptoms", text: "Arm, shoulder or hand pain." },
      { id: "q10", section: "Symptoms", text: "Tingling (pins and needles) in your arm, shoulder or hand." },
      { id: "q11", section: "Symptoms", text: "Difficulty sleeping because of the pain." },
    ],
    calc: (scores: number[]) => {
      const validScores = scores.filter((s) => s >= 1 && s <= 5);
      if (validScores.length === 0) return 0;
      return Math.round(((validScores.reduce((a, b) => a + b, 0) / validScores.length) - 1) * 25);
    },
  },

  // ==========================================
  // 2. LOWER QUARTER (하지 및 척추 하부)
  // ==========================================

  lowback: {
    id: "odi",
    name: "ODI (Oswestry Disability Index)",
    description: "Choose the statement that best describes your condition.",
    scaleType: "0-5",
    scaleLabels: { min: "0 (No pain/limitation)", max: "5 (Severe pain/limitation)" },
    questions: [
      { id: "l1", section: "General", text: "Pain Intensity" },
      { id: "l2", section: "General", text: "Personal Care" },
      { id: "l3", section: "General", text: "Lifting" },
      { id: "l4", section: "General", text: "Walking" },
      { id: "l5", section: "General", text: "Sitting" },
      { id: "l6", section: "General", text: "Standing" },
      { id: "l7", section: "General", text: "Sleeping" },
      { id: "l8", section: "General", text: "Sex Life" },
      { id: "l9", section: "General", text: "Social Life" },
      { id: "l10", section: "General", text: "Traveling" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 50) * 100),
  },

  hip: {
    id: "lefs",
    name: "LEFS (Lower Extremity Functional Scale)",
    description: "Rate your difficulty with the following activities.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (Extreme Difficulty/Unable)", max: "4 (No Difficulty)" },
    questions: [
      { id: "h1", section: "Function", text: "Any of your usual work, housework, or school activities." },
      {
        id: "h2",
        section: "Function",
        text: "Your usual hobbies, recreational or sporting activities.",
      },
      { id: "h3", section: "Function", text: "Getting into or out of the bath." },
      { id: "h4", section: "Function", text: "Walking between rooms." },
      { id: "h5", section: "Function", text: "Putting on your shoes or socks." },
      { id: "h6", section: "Function", text: "Squatting." },
      {
        id: "h7",
        section: "Function",
        text: "Lifting an object, like a bag of groceries from the floor.",
      },
      { id: "h8", section: "Function", text: "Performing light activities around your home." },
      { id: "h9", section: "Function", text: "Performing heavy activities around your home." },
      { id: "h10", section: "Function", text: "Getting into or out of a car." },
      { id: "h11", section: "Function", text: "Walking 2 blocks." },
      { id: "h12", section: "Function", text: "Walking a mile." },
      { id: "h13", section: "Function", text: "Going up or down 10 stairs." },
      { id: "h14", section: "Function", text: "Standing for 1 hour." },
      { id: "h15", section: "Function", text: "Sitting for 1 hour." },
      { id: "h16", section: "Function", text: "Running on even ground." },
      { id: "h17", section: "Function", text: "Running on uneven ground." },
      { id: "h18", section: "Function", text: "Making sharp turns while running fast." },
      { id: "h19", section: "Function", text: "Hopping." },
      { id: "h20", section: "Function", text: "Rolling over in bed." },
    ],
    // LEFS는 점수가 높을수록 좋음 (기능이 좋음). 역산하여 장애율(%)로 통일하려면:
    // 장애율(%) = ((80 - 획득점수) / 80) * 100
    calc: (scores: number[]) => {
      if (scores.length === 0) return 0;
      const total = scores.reduce((a, b) => a + b, 0);
      return Math.round(((80 - total) / 80) * 100);
    },
  },

  knee: {
    id: "koos",
    name: "KOOS-12 (Knee Injury and Osteoarthritis Outcome Score)",
    description: "Rate your knee symptoms and function.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (None)", max: "4 (Extreme)" },
    questions: [
      { id: "k1", section: "Pain", text: "How often do you experience knee pain?" },
      { id: "k2", section: "Pain", text: "Pain when twisting/pivoting on your knee?" },
      { id: "k3", section: "Pain", text: "Pain when going up or down stairs?" },
      { id: "k4", section: "Pain", text: "Pain when walking on flat surface?" },
      { id: "k5", section: "Function", text: "Difficulty descending stairs?" },
      { id: "k6", section: "Function", text: "Difficulty ascending stairs?" },
      { id: "k7", section: "Function", text: "Difficulty rising from sitting?" },
      { id: "k8", section: "Function", text: "Difficulty standing?" },
      { id: "k9", section: "Quality of Life", text: "Awareness of your knee problem?" },
      { id: "k10", section: "Quality of Life", text: "Modified life style to avoid activities?" },
      { id: "k11", section: "Quality of Life", text: "Lack of confidence in your knee?" },
      { id: "k12", section: "Quality of Life", text: "General difficulty with your knee?" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 48) * 100),
  },

  ankle: {
    id: "faam",
    name: "FAAM (Foot and Ankle Ability Measure - ADL)",
    description: "Rate your difficulty with the following activities.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (Unable)", max: "4 (No difficulty)" },
    questions: [
      { id: "a1", section: "ADL", text: "Standing" },
      { id: "a2", section: "ADL", text: "Walking on even ground" },
      { id: "a3", section: "ADL", text: "Walking on even ground without shoes" },
      { id: "a4", section: "ADL", text: "Walking up hills" },
      { id: "a5", section: "ADL", text: "Walking down hills" },
      { id: "a6", section: "ADL", text: "Going up stairs" },
      { id: "a7", section: "ADL", text: "Going down stairs" },
      { id: "a8", section: "ADL", text: "Walking on uneven ground" },
      { id: "a9", section: "ADL", text: "Stepping up and down curbs" },
      { id: "a10", section: "ADL", text: "Squatting" },
      { id: "a11", section: "ADL", text: "Coming up on your toes" },
      { id: "a12", section: "ADL", text: "Walking initially" },
      { id: "a13", section: "ADL", text: "Walking 5 minutes or less" },
      { id: "a14", section: "ADL", text: "Walking approximately 10 minutes" },
      { id: "a15", section: "ADL", text: "Walking 15 minutes or greater" },
      { id: "a16", section: "ADL", text: "Home responsibilities" },
      { id: "a17", section: "ADL", text: "Activities of daily living" },
      { id: "a18", section: "ADL", text: "Personal care" },
      { id: "a19", section: "ADL", text: "Light to moderate work" },
      { id: "a20", section: "ADL", text: "Heavy work" },
      { id: "a21", section: "ADL", text: "Recreational activities" },
    ],
    // FAAM 역시 점수가 높을수록 기능이 좋음. 장애율(%)로 통일: ((84 - 획득점수) / 84) * 100
    calc: (scores: number[]) => {
      if (scores.length === 0) return 0;
      const total = scores.reduce((a, b) => a + b, 0);
      return Math.round(((84 - total) / 84) * 100);
    },
  },
};

export type MeasureLocale = "ko" | "en";

export type MeasureQuestion5 = {
  id: number;
  text: string;
  options: readonly [string, string, string, string, string];
};

export type MeasureQuestion6 = {
  id: number;
  text: string;
  options: readonly [string, string, string, string, string, string];
};

export type MeasureQuestion10 = {
  id: number;
  text: string;
  options: readonly string[];
};

export type MeasureQuestionWomac = {
  id: number;
  section: "pain" | "stiffness" | "function";
  text: string;
  options: readonly [string, string, string, string, string];
};

export type OutcomeMeasureRegion = "neck" | "lumbar" | "shoulder" | "knee";

type NdiOdiCalcResult = {
  raw: number;
  max: number;
  percent: number;
  label: string;
};

type QuickDashCalcResult = {
  rawMean: number;
  dashScore: number;
  percent: number;
  label: string;
};

type WomacCalcResult = {
  pain: number;
  stiffness: number;
  function: number;
  total: number;
  maxTotal: number;
  percent: number;
  label: string;
};

type OutcomeMeasuresBundle = {
  neck: {
    id: string;
    name: string;
    description: string;
    questions: MeasureQuestion6[];
    maxRaw: number;
    calc: (score: number) => NdiOdiCalcResult;
  };
  lumbar: {
    id: string;
    name: string;
    description: string;
    questions: MeasureQuestion6[];
    maxRaw: number;
    calc: (score: number) => NdiOdiCalcResult;
  };
  shoulder: {
    id: string;
    name: string;
    description: string;
    questions: MeasureQuestion5[];
    itemCount: number;
    calc: (responses: readonly number[]) => QuickDashCalcResult;
  };
  knee: {
    id: string;
    name: string;
    description: string;
    sections: {
      pain: MeasureQuestionWomac[];
      stiffness: MeasureQuestionWomac[];
      function: MeasureQuestionWomac[];
    };
    allQuestions: MeasureQuestionWomac[];
    maxTotal: number;
    calc: (pain: number[], stiffness: number[], func: number[]) => WomacCalcResult;
  };
};

const L6_EN: MeasureQuestion6["options"] = [
  "No pain/limitation",
  "Mild",
  "Moderate",
  "Moderately severe",
  "Severe",
  "Unable / extreme",
];

const L6_KO: MeasureQuestion6["options"] = [
  "전혀 없음",
  "약간",
  "보통",
  "중등도",
  "심함",
  "매우 심함/불가",
];

const L5_EN: MeasureQuestion5["options"] = ["No difficulty", "Mild", "Moderate", "Severe", "Unable"];
const L5_KO: MeasureQuestion5["options"] = ["전혀 어려움 없음", "약간", "보통", "심함", "불가"];

function toNumericId(rawId: string, index: number): number {
  const n = Number(rawId.replace(/[^\d]/g, ""));
  if (Number.isFinite(n) && n > 0) return n;
  return index + 1;
}

function toQuestion6(
  questions: Array<{ id: string; text: string }>,
  locale: MeasureLocale,
): MeasureQuestion6[] {
  const options = locale === "en" ? L6_EN : L6_KO;
  return questions.map((q, idx) => ({ id: toNumericId(q.id, idx), text: q.text, options }));
}

function toQuestion5(
  questions: Array<{ id: string; text: string }>,
  locale: MeasureLocale,
): MeasureQuestion5[] {
  const options = locale === "en" ? L5_EN : L5_KO;
  return questions.map((q, idx) => ({ id: toNumericId(q.id, idx), text: q.text, options }));
}

function calcNdiLike(score: number, max = 50): NdiOdiCalcResult {
  const raw = Math.max(0, Math.min(max, score));
  const percent = (raw / max) * 100;
  const label =
    percent <= 20
      ? "Minimal disability"
      : percent <= 40
        ? "Moderate disability"
        : percent <= 60
          ? "Severe disability"
          : "Very severe disability";
  return { raw, max, percent, label };
}

function calcQuickDashLike(responses: readonly number[]): QuickDashCalcResult {
  if (responses.length !== 11) {
    return { rawMean: 0, dashScore: 0, percent: 0, label: "Item count mismatch (11 required)" };
  }
  const valid = responses.every((v) => Number.isFinite(v) && v >= 1 && v <= 5);
  if (!valid) {
    return { rawMean: 0, dashScore: 0, percent: 0, label: "Each item must be scored 1-5" };
  }
  const rawMean = responses.reduce((a, b) => a + b, 0) / responses.length;
  const dashScore = (rawMean - 1) * 25;
  return {
    rawMean,
    dashScore,
    percent: Math.max(0, Math.min(100, dashScore)),
    label: dashScore < 25 ? "Mild disability" : dashScore < 50 ? "Moderate disability" : "Severe disability",
  };
}

function calcWomacLike(pain: number[], stiffness: number[], func: number[]): WomacCalcResult {
  if (pain.length !== 5 || stiffness.length !== 2 || func.length !== 5) {
    return {
      pain: Number.NaN,
      stiffness: Number.NaN,
      function: Number.NaN,
      total: Number.NaN,
      maxTotal: 48,
      percent: 0,
      label: "Item mismatch",
    };
  }
  const all = [...pain, ...stiffness, ...func];
  const valid = all.every((v) => Number.isFinite(v) && v >= 0 && v <= 4);
  if (!valid) {
    return {
      pain: Number.NaN,
      stiffness: Number.NaN,
      function: Number.NaN,
      total: Number.NaN,
      maxTotal: 48,
      percent: 0,
      label: "Each item must be scored 0-4",
    };
  }
  const p = pain.reduce((a, b) => a + b, 0);
  const s = stiffness.reduce((a, b) => a + b, 0);
  const f = func.reduce((a, b) => a + b, 0);
  const total = p + s + f;
  const maxTotal = 48;
  const percent = (total / maxTotal) * 100;
  const label = percent < 25 ? "Mild symptoms" : percent < 50 ? "Moderate" : "Severe";
  return { pain: p, stiffness: s, function: f, total, maxTotal, percent, label };
}

export function getOutcomeMeasuresBundle(locale: MeasureLocale): OutcomeMeasuresBundle {
  const neck = OUTCOME_MEASURES.neck;
  const lowback = OUTCOME_MEASURES.lowback;
  const arm = OUTCOME_MEASURES.arm;
  const knee = OUTCOME_MEASURES.knee;

  const kneeOptions = locale === "en" ? L5_EN : L5_KO;
  const kneePain = knee.questions.slice(0, 4).map((q, i) => ({
    id: toNumericId(q.id, i),
    section: "pain" as const,
    text: q.text,
    options: kneeOptions,
  }));
  const kneeStiffness = knee.questions.slice(4, 6).map((q, i) => ({
    id: toNumericId(q.id, i + 4),
    section: "stiffness" as const,
    text: q.text,
    options: kneeOptions,
  }));
  const kneeFunction = knee.questions.slice(6, 11).map((q, i) => ({
    id: toNumericId(q.id, i + 6),
    section: "function" as const,
    text: q.text,
    options: kneeOptions,
  }));

  return {
    neck: {
      id: neck.id,
      name: neck.name,
      description: neck.description,
      questions: toQuestion6(neck.questions, locale),
      maxRaw: 50,
      calc: (score: number) => calcNdiLike(score, 50),
    },
    lumbar: {
      id: lowback.id,
      name: lowback.name,
      description: lowback.description,
      questions: toQuestion6(lowback.questions, locale),
      maxRaw: 50,
      calc: (score: number) => calcNdiLike(score, 50),
    },
    shoulder: {
      id: arm.id,
      name: arm.name,
      description: arm.description,
      questions: toQuestion5(arm.questions, locale),
      itemCount: 11,
      calc: (responses: readonly number[]) => calcQuickDashLike(responses),
    },
    knee: {
      id: knee.id,
      name: knee.name,
      description: knee.description,
      sections: {
        pain: kneePain,
        stiffness: kneeStiffness,
        function: kneeFunction,
      },
      allQuestions: [...kneePain, ...kneeStiffness, ...kneeFunction],
      maxTotal: 48,
      calc: (pain: number[], stiffness: number[], func: number[]) => calcWomacLike(pain, stiffness, func),
    },
  };
}

const REGION_ALIAS: Record<string, OutcomeMeasureRegion> = {
  neck: "neck",
  cervical: "neck",
  shoulder: "shoulder",
  arm: "shoulder",
  upper: "shoulder",
  lowback: "lumbar",
  "low-back": "lumbar",
  lumbar: "lumbar",
  back: "lumbar",
  knee: "knee",
};

export function resolveOutcomeMeasureRegion(diagnosisArea: string): OutcomeMeasureRegion | null {
  const key = diagnosisArea.trim().toLowerCase().split(/\s+/)[0] ?? "";
  if (!key) return null;
  return REGION_ALIAS[key] ?? null;
}

const OUTCOME_ID_TO_MODAL_REGION: Record<string, OutcomeMeasureRegion> = {
  ndi: "neck",
  odi: "lumbar",
  quickdash: "shoulder",
  spadi: "shoulder",
  koos: "knee",
  womac: "knee",
  lefs: "lumbar",
  faam: "lumbar",
};

export function getModalRegionForOutcomeId(outcomeId: string): OutcomeMeasureRegion | null {
  return OUTCOME_ID_TO_MODAL_REGION[outcomeId] ?? null;
}

export const OUTCOME_MEASURES_LOWBACK = OUTCOME_MEASURES.lowback;
