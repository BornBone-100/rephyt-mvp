import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

/** 클라이언트 → AP 생성용 입력 */
const bodySchema = z.object({
  subjective: z.string().default(""),
  objective: z.string().default(""),
  pastHistory: z.string().default(""),
  symptomChange: z.string().default(""),
});

const SYSTEM_PROMPT = `너는 15년 이상의 임상 경력을 가진 '정형도수 및 재활 전문 물리치료사'야. 일반 의사가 아닌, 철저하게 물리치료사의 생체역학적, 기능적 시각에서 임상 추론(Clinical Reasoning)을 전개해. 특히 근골격계 질환뿐만 아니라 산전/산후 재활 및 림프부종과 같은 특수 여성 건강 영역에 대한 깊은 이해도를 바탕으로 다각적인 평가를 진행해.

제공된 환자의 주관적 호소(Subjective), 객관적 평가(Objective), 그리고 과거 치료 이력(Past History)을 분석하여 아래 양식에 맞게 완벽한 SOAP 노트의 A(Assessment)와 P(Plan)를 작성해.

[Assessment 작성 규칙]

단순 진단명이 아닌 손상 기전(MOI)과 기능적 제한 원인을 추론할 것.

감별 진단(R/O)을 1~2가지 제시하고, 이전 치료가 실패했다면 그 역학적 원인을 분석할 것.

[Plan 작성 규칙]

구체적인 도수치료 기법(예: Maitland, Mulligan, MFR 등)과 타겟 근육/관절을 명시할 것.

치료적 운동(Therapeutic Exercise)을 단계별(초기-중기)로 제시할 것.

환자 교육 및 금기 동작을 포함할 것.

출력은 반드시 마크다운(Markdown) 없이, 실제 차트에 복사해 넣을 수 있는 깔끔한 텍스트로 A와 P 섹션을 나누어서 출력해.`;

const MODEL = process.env.OPENAI_SOAP_AP_MODEL ?? "gpt-4o";

function buildUserMessage(input: z.infer<typeof bodySchema>): string {
  return [
    "아래 환자 정보를 바탕으로 Assessment와 Plan만 작성하라.",
    "",
    "[주관적 호소 (Subjective)]",
    input.subjective.trim() || "(미제공)",
    "",
    "[객관적 평가 (Objective)]",
    input.objective.trim() || "(미제공)",
    "",
    "[과거 치료 이력 (Past History)]",
    input.pastHistory.trim() || "(없음)",
    "",
    "[증상 변화 (Symptom change)]",
    input.symptomChange.trim() || "(없음)",
    "",
    "출력 형식(반드시 이 두 줄로 구분):",
    "먼저 한 줄에 정확히 <<<ASSESSMENT>>> 라고 쓰고 다음 줄부터 Assessment 본문을 쓴다.",
    "그 다음 한 줄에 정확히 <<<PLAN>>> 이라고 쓰고 다음 줄부터 Plan 본문을 쓴다.",
    "마크다운 기호(#, *, -, bullet 등)는 사용하지 마라.",
  ].join("\n");
}

function parseAssessmentPlan(raw: string): { assessment: string; plan: string } {
  const text = raw.trim();
  const aIdx = text.indexOf("<<<ASSESSMENT>>>");
  const pIdx = text.indexOf("<<<PLAN>>>");

  if (aIdx !== -1 && pIdx !== -1 && pIdx > aIdx) {
    const afterA = text.slice(aIdx + "<<<ASSESSMENT>>>".length).trim();
    const planMarker = "<<<PLAN>>>";
    const innerP = afterA.indexOf(planMarker);
    if (innerP !== -1) {
      return {
        assessment: afterA.slice(0, innerP).trim(),
        plan: afterA.slice(innerP + planMarker.length).trim(),
      };
    }
  }

  // 구분자가 없으면 전체를 assessment에 두고 plan은 빈 문자열 (프론트에서 재시도 유도 가능)
  return { assessment: text, plan: "" };
}

export async function POST(req: Request) {
  const requestId = uuidv4();

  try {
    const json = await req.json();
    const input = bodySchema.parse(json);

    const openai = getOpenAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const completion = await openai.chat.completions.create(
        {
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserMessage(input) },
          ],
          temperature: 0.25,
          max_tokens: 4096,
        },
        { signal: controller.signal },
      );

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!raw) {
        return NextResponse.json(
          { error: "EMPTY_MODEL_OUTPUT", requestId },
          { status: 502 },
        );
      }

      const { assessment, plan } = parseAssessmentPlan(raw);

      return NextResponse.json(
        {
          assessment,
          plan,
          raw,
          requestId,
          model: MODEL,
        },
        { status: 200 },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
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

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "UPSTREAM_TIMEOUT", requestId }, { status: 504 });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "GENERATE_SOAP_AP_FAILED", message, requestId },
      { status: 500 },
    );
  }
}
