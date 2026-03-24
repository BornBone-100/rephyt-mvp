import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDefaultOpenAIModel, getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

/**
 * Re:PhyT 의료 AI 스크라이브 입력 스키마(프론트 → API)
 * - "파편화된 데이터"를 허용하되, 최소한 patient.name 정도는 받도록 설계
 */
const requestSchema = z.object({
  locale: z.enum(["ko", "en"]).default("ko").optional(),
  systemPromptOverride: z.string().min(1).max(8000).optional(),
  patient: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    birthDate: z.string().optional(), // YYYY-MM-DD or ISO
    sex: z.enum(["M", "F", "Other"]).optional(),
    occupation: z.string().optional(),
    chiefComplaint: z.string().optional(),
    primaryPainArea: z.string().optional(),
    onsetDate: z.string().optional(),
    mechanismOfInjury: z.string().optional(),
    pmhx: z.string().optional(),
  }),
  subjective: z
    .object({
      pain: z
        .object({
          vasMm: z.number().int().min(0).max(100).optional(),
          nrs: z.number().int().min(0).max(10).optional(),
          quality: z.string().optional(), // sharp/dull/burning...
          irritability: z.string().optional(),
          easingFactors: z.string().optional(),
          aggravatingFactors: z.string().optional(),
        })
        .optional(),
      adlLimitations: z.string().optional(),
      history: z.string().optional(),
      goals: z.string().optional(),
      redFlags: z.string().optional(),
    })
    .optional(),
  objective: z
    .object({
      rom: z.string().optional(),
      mmt: z.string().optional(),
      specialTests: z.string().optional(),
      observation: z.string().optional(),
      palpation: z.string().optional(),
      neuro: z.string().optional(),
      rcas: z
        .object({
          sfma: z
            .array(
              z.object({
                pattern: z.string().min(1),
                result: z.enum(["FN", "FP", "DN", "DP"]),
              }),
            )
            .optional(),
          mdt: z
            .object({
              painResponse: z.enum(["Centralization", "Peripheralization"]).optional(),
              directionalPreference: z.string().optional(),
            })
            .optional(),
          msi: z
            .object({
              faults: z.array(z.string().min(1)).optional(),
            })
            .optional(),
          janda: z
            .object({
              profile: z.string().optional(),
              tonicTight: z.array(z.string().min(1)).optional(),
              phasicWeak: z.array(z.string().min(1)).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  therapist: z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().optional(),
      clinic: z.string().optional(),
    })
    .optional(),
  planDraft: z
    .object({
      interventions: z.string().optional(), // manual therapy, modalities, education...
      appiModifiedPilatesLevel: z.enum(["1", "2", "3", "4"]).optional(),
      exercises: z.string().optional(),
      homework: z.string().optional(),
      nextSessionFocus: z.string().optional(),
      precautions: z.string().optional(),
    })
    .optional(),
  extra: z.record(z.string(), z.any()).optional(),
});

function buildSystemPrompt() {
  return [
    "역할(페르소나): 너는 근골격계(MSK) 및 신경계(Neurologic) 재활 임상 경험이 풍부한 전문 물리치료사(Physiotherapist)이자, EBP(Evidence-Based Practice) 문서화를 매우 잘한다.",
    "프레임워크: Re:PhyT 코어 평가 시스템(RCAS)을 통해 SFMA/MDT/MSI/Janda 프레임워크를 통합적으로 활용한다.",
    "철학: '데이터는 정직하고 케어는 전문 물리치료사와 함께 정교하게 실행한다'를 준수한다.",
    "",
    "핵심 규칙(중요):",
    "- 입력 JSON에 없는 사실을 추정/창작하지 않는다. 불명확/누락 정보는 '추가 확인 필요'로 명시한다.",
    "- 의학적 진단을 단정하지 않는다. 감별/가설은 가능성(probable/possible)로 표현한다.",
    "- 과도한 과장, 인사말, 서론을 금지한다. 결과만 출력한다.",
    "- 개인정보/민감정보를 불필요하게 반복하지 말고, 임상 문서에 필요한 최소만 포함한다.",
    "- 문장에는 확실함을 뜻하는 단정적 표현(예: '확실히', '반드시', '진단됨')을 피한다.",
    "",
    "출력 형식(엄격):",
    "- 마크다운(Markdown) 텍스트만 출력한다. (JSON/코드블록/메타설명 금지)",
    "- 아래 SOAP 템플릿 헤더를 정확히 사용한다:",
    "  ## S (Subjective)",
    "  ## O (Objective)",
    "  ## A (Assessment)",
    "  ## P (Plan)",
    "- 전문 용어는 한국어/영어 혼용을 자연스럽게 사용한다. (예: ROM, MMT, special tests, motor control, biomechanics 등)",
    "",
    "작성 기준:",
    "[S] Subjective:",
    "- Chief Complaint, 통증 강도(VAS/NRS), Onset/Mechanism, ADL 제한을 명확히 요약한다.",
    "- 필요 시 통증 양상(quality), aggravating/easing factors, 목표(goals)를 포함한다.",
    "- 형식: 3~6개의 간결한 bullet 또는 짧은 문단.",
    "",
    "[O] Objective:",
    "- ROM/MMT/Special Tests 및 관찰/촉진/신경학적 소견을 객관적으로 기술한다.",
    "- RCAS 기반으로 SFMA/MDT/MSI/Janda 결과를 객관적 소견으로 구조화하여 포함한다.",
    "- 필수 라벨(반드시 포함, 정보 없으면 '추가 확인 필요'만 기재):",
    "  - ROM: ...",
    "  - MMT: ...",
    "  - Special Tests: ...",
    "  - SFMA: ... (pattern + FN/FP/DN/DP)",
    "  - MDT: ... (Centralization/Peripheralization, Directional Preference)",
    "  - MSI: ... (대표적 역학적 결함 list)",
    "  - Janda: ... (UCS/LCS/Layered 등 + Tonic/Phasic)",
    "- 형식: 4~10개의 간결한 bullet 또는 짧은 문단.",
    "",
    "[A] Assessment:",
    "- S와 O를 통합해 Clinical Reasoning을 제시한다.",
    "- Biomechanical + neuromusculoskeletal 관점에서 통증/기능부전의 '가능한 원인'을 구조적으로 정리한다.",
    "- 위험 신호/추가 평가 필요 항목이 있으면 명시한다.",
    "- 형식: 'Clinical hypothesis(가능성) → 근거 요약 → 추가 확인 필요' 순으로 2~5개의 bullet.",
    "",
    "[P] Plan:",
    "- 통증 조절 + 기능 회복을 위한 중재(예: manual therapy, neuromuscular re-education, education, HEP)를 제시한다.",
    "- APPI Modified Pilates Level 1~4 기반의 단계별 운동 처방을 포함한다.",
    "- Level 선택 근거: 가능하면 입력 데이터에 근거해 Level을 명시한다.",
    "- 입력에 Level이 없으면, 실제 처방이 아닌 'Level 1~4 적용 템플릿(기준/진행 단계)' 형태로 작성하고, 마지막 줄에 '치료사 검증 필요'를 명시한다.",
    "- 필수 포함: Plan 안에 반드시 'APPI Modified Pilates Level X' 형태( X는 1~4 )가 1회 이상 등장해야 한다.",
    "- 각 중재/단계마다 1문장 이하의 치료적 rationale(EBP 관점 요약)를 포함한다.",
    "- 형식: 4~12개의 bullet 또는 짧은 문단.",
    "",
    "금지(중요):",
    "- SOAP 외 다른 섹션(예: 'Warnings', 'Disclaimer', 'Notes')을 추가하지 않는다.",
  ].join("\n");
}

function buildUserPrompt(input: unknown) {
  return [
    "아래 JSON을 바탕으로 SOAP 노트를 작성하라.",
    "",
    "입력(JSON):",
    JSON.stringify(input),
  ].join("\n");
}

function getObjectiveBlock(text: string) {
  const start = text.indexOf("## O (Objective)");
  if (start < 0) return null;
  const next = text.indexOf("## A (Assessment)", start);
  if (next < 0) return text.slice(start);
  return text.slice(start, next);
}

function validateSoapOutput(text: string) {
  const requiredHeaders = [
    "## S (Subjective)",
    "## O (Objective)",
    "## A (Assessment)",
    "## P (Plan)",
  ];

  const missing = requiredHeaders.filter((h) => !text.includes(h));
  if (missing.length) {
    return { ok: false as const, reason: "MISSING_SECTION_HEADERS", missing };
  }

  const objective = getObjectiveBlock(text);
  if (!objective) {
    return { ok: false as const, reason: "OBJECTIVE_BLOCK_MISSING" };
  }

  const romanChecks: Array<[string, RegExp]> = [
    ["ROM", /(ROM\s*:|관절가동범위)/i],
    ["MMT", /(MMT\s*:|도수근력검사)/i],
    ["Special Tests", /(Special Tests\s*:|특수검사)/i],
  ];

  const missingRoman: string[] = [];
  for (const [label, re] of romanChecks) {
    if (!re.test(objective)) missingRoman.push(label);
  }
  if (missingRoman.length) {
    return {
      ok: false as const,
      reason: "OBJECTIVE_BASIC_TESTS_MISSING",
      missingRoman,
    };
  }

  const rcasChecks: Array<[string, RegExp]> = [
    ["SFMA", /(SFMA\s*:|움직임\s*패턴\s*평가)/i],
    ["MDT", /(MDT\s*:|Centralization|Peripheralization|중심화|말초화)/i],
    ["MSI", /(MSI\s*:|역학적\s*결함|movement\s*system\s*impairment)/i],
    ["Janda", /(Janda\s*:|UCS|LCS|Layered|교차\s*증후군)/i],
  ];

  const missingRcas: string[] = [];
  for (const [label, re] of rcasChecks) {
    if (!re.test(objective)) missingRcas.push(label);
  }
  if (missingRcas.length) {
    return {
      ok: false as const,
      reason: "RCAS_LABELS_MISSING",
      missingRcas,
    };
  }

  const planBlockStart = text.indexOf("## P (Plan)");
  if (planBlockStart < 0) {
    return { ok: false as const, reason: "PLAN_BLOCK_MISSING" };
  }
  const planText = text.slice(planBlockStart);
  const hasLevel = /APPI\s*Modified\s*Pilates\s*Level\s*[1-4]/i.test(planText) || /Level\s*[1-4]/i.test(planText) || /레벨\s*[1-4]/i.test(planText);
  const hasAPPI = /APPI\s*Modified\s*Pilates/i.test(planText);
  if (!hasLevel || !hasAPPI) {
    return {
      ok: false as const,
      reason: "PLAN_APPI_LEVEL_MISSING",
    };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  const requestId = uuidv4();

  try {
    const json = await req.json();
    const input = requestSchema.parse(json);

    const openai = getOpenAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const systemPrompt = input.systemPromptOverride ?? buildSystemPrompt();
      const userBasePrompt = buildUserPrompt(input);

      // 1회 재시도: 섹션 누락/필수 라벨 누락이 발생하면 형식 재요구
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const extraUserInstruction =
          attempt === 1
            ? ""
            : [
                "",
                "중요: 방금 출력이 형식 규칙을 위반했을 수 있다.",
                "반드시 아래 규칙을 모두 만족하도록 다시 작성해라.",
                "- SOAP 섹션 헤더 4개: S/O/A/P 각각 반드시 포함",
                "- Objective 내에 기본 이학적 검사 라벨 3개를 각각 포함",
                "  - ROM:",
                "  - MMT:",
                "  - Special Tests:",
                "- Objective 내에 RCAS 라벨 4개를 각각 포함",
                "  - SFMA:",
                "  - MDT:",
                "  - MSI:",
                "  - Janda:",
                "- Plan 내에 반드시 'APPI Modified Pilates Level X'(X=1~4) 포함(1회 이상)",
              ].join("\n");

        const resp = await openai.responses.create(
          {
            model: getDefaultOpenAIModel(),
            input: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `${userBasePrompt}${extraUserInstruction}`,
              },
            ],
            temperature: 0.2,
            max_output_tokens: 1400,
          },
          { signal: controller.signal },
        );

        const text = (resp.output_text ?? "").trim();

        if (!text) {
          if (attempt === maxAttempts) {
            return NextResponse.json(
              { error: "EMPTY_MODEL_OUTPUT", requestId },
              { status: 502 },
            );
          }
          continue;
        }

        const validation = validateSoapOutput(text);
        if (validation.ok) {
          return new NextResponse(text, {
            status: 200,
            headers: {
              "Content-Type": "text/markdown; charset=utf-8",
              "X-Request-Id": requestId,
            },
          });
        }
      }

      return NextResponse.json(
        {
          error: "SOAP_OUTPUT_VALIDATION_FAILED",
          requestId,
        },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    // Zod validation error
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          requestId,
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    // Abort / timeout
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "UPSTREAM_TIMEOUT", requestId },
        { status: 504 },
      );
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    // OpenAI SDK 오류는 케이스가 다양하므로 안전한 공통 형태로 반환
    return NextResponse.json(
      { error: "GENERATE_SOAP_FAILED", message, requestId },
      { status: 500 },
    );
  }
}

