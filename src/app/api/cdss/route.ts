import { NextResponse } from "next/server";

type CdssBody = {
  examination?: string;
  evaluationDiagnosis?: string;
  prognosisPlan?: string;
  intervention?: string;
  language?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CdssBody;
    const examination = (body.examination ?? "").trim();
    const evaluationDiagnosis = (body.evaluationDiagnosis ?? "").trim();
    const prognosisPlan = (body.prognosisPlan ?? "").trim();
    const intervention = (body.intervention ?? "").trim();
    const language = (body.language ?? "ko").trim().toLowerCase();

    if (!examination || !evaluationDiagnosis || !prognosisPlan || !intervention) {
      return NextResponse.json({ error: "모든 단계 입력이 필요합니다." }, { status: 400 });
    }

    const localeInstruction =
      language === "en"
        ? "Return all fields in English."
        : "모든 응답 필드는 한국어로 작성하세요.";

    const prompt = `
You are a senior APTA-aligned clinical decision support mentor for physical therapy.
Evaluate the clinical coherence across the four stages and return only strict JSON.

${localeInstruction}

Input:
1) Examination
${examination}

2) Evaluation & Diagnosis
${evaluationDiagnosis}

3) Prognosis & Plan of Care
${prognosisPlan}

4) Intervention
${intervention}

Output JSON schema:
{
  "totalScore": number (0-100 integer),
  "strengths": string[],
  "blindspots": string[],
  "evidence": string[]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You must return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("CDSS API upstream error:", text);
      return NextResponse.json({ error: "AI 평가 생성에 실패했습니다." }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      totalScore?: number;
      strengths?: string[];
      blindspots?: string[];
      evidence?: string[];
    };

    return NextResponse.json({
      totalScore: Number.isFinite(parsed.totalScore) ? Math.max(0, Math.min(100, Math.round(parsed.totalScore as number))) : 0,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      blindspots: Array.isArray(parsed.blindspots) ? parsed.blindspots : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    });
  } catch (error) {
    console.error("CDSS route error:", error);
    return NextResponse.json({ error: "서버 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
