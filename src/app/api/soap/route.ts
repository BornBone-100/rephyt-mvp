import { NextResponse } from "next/server";
import { getDefaultOpenAIModel, getOpenAIClient } from "@/lib/openai";
import {
  soapGenerateRequestSchema,
  soapNoteSchema,
} from "@/features/soap/schema";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = soapGenerateRequestSchema.parse(json);

    const system = [
      "너는 7년차 이상 임상 경험이 있는 물리치료사이며, 근거중심(Evidence-Based) 문서화를 매우 잘한다.",
      "사용자가 제공한 정보만을 기반으로 SOAP 노트를 작성한다. 모르는 내용은 추정하지 말고 '제공되지 않음' 또는 '추가 확인 필요'로 표기한다.",
      "의학적 진단을 단정하지 말고, 임상적 가설/감별은 '가능성'으로 표현한다.",
      "출력은 반드시 JSON 하나로만 반환한다.",
    ].join("\n");

    const user = [
      "아래 입력을 바탕으로 전문적인 SOAP 노트를 작성해줘.",
      "",
      "요구사항:",
      "- 언어: 한국어",
      "- 각 섹션은 임상 문서 스타일로 간결하지만 핵심을 포함",
      "- warnings에는 (1) 정보 부족/불확실 (2) 법/윤리/안전상 주의 (3) 추가 평가 권고를 bullet 형태 문자열로 넣어줘",
      "",
      "입력(JSON):",
      JSON.stringify(input),
      "",
      "출력(JSON) 형식:",
      JSON.stringify({
        subjective: "string",
        objective: "string",
        assessment: "string",
        plan: "string",
        warnings: ["string"],
      }),
    ].join("\n");

    const openai = getOpenAIClient();
    const resp = await openai.responses.create({
      model: getDefaultOpenAIModel(),
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const text = resp.output_text?.trim() ?? "";
    const parsed = soapNoteSchema.parse(JSON.parse(text));

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "SOAP_GENERATION_FAILED", message },
      { status: 400 },
    );
  }
}

