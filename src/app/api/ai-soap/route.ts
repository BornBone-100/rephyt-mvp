import { NextResponse } from "next/server";
import { getDictionary } from "@/dictionaries/getDictionary";

/** 프론트 드롭다운 언어 코드(ko/en/ja/zh/ru) 및 구버전 영문 라벨 → 사전 지시문 */
function resolveAiSoapLanguageDirective(
  language: string | undefined,
  a: {
    directiveKoreanMixed: string;
    directiveEnglish: string;
    directiveJapanese: string;
    directiveChinese: string;
    directiveRussian: string;
  },
): string {
  const raw = (language ?? "ko").trim();
  const code = raw.toLowerCase();

  if (code === "en" || raw === "English") return a.directiveEnglish;
  if (code === "ja" || raw === "Japanese") return a.directiveJapanese;
  if (code === "zh" || raw === "Chinese") return a.directiveChinese;
  if (code === "ru" || raw === "Russian") return a.directiveRussian;
  if (
    code === "ko" ||
    raw === "Korean-Mixed" ||
    code === "korean-mixed" ||
    code === "korean"
  ) {
    return a.directiveKoreanMixed;
  }
  return a.directiveKoreanMixed;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      promptData,
      patientInfo,
      language = "ko",
      locale: localeRaw = "ko",
    } = body as {
      promptData?: string;
      /** 환자·평가 입력 텍스트 (`promptData`와 동일 역할) */
      patientInfo?: string;
      language?: string;
      locale?: string;
    };

    const userContent = (patientInfo ?? promptData ?? "").trim();

    const locale = localeRaw === "en" ? "en" : "ko";
    const dict = await getDictionary(locale);
    const a = dict.dashboard.aiSoap;

    console.log(a.logLanguageSetting, language);

    const languageDirective = resolveAiSoapLanguageDirective(language, a);

    // 언어 규약을 앞뒤로 두 번 명시해 모델이 출력 언어를 놓치지 않도록 함
    const systemPrompt = `
${a.promptBody}
${a.languagePromptLeadIn}${languageDirective}

${a.outputLanguageHeader}
${languageDirective}
${a.promptJsonSuffix}
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    const data = await response.json();
    const aiSoap = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(aiSoap);
  } catch (error) {
    console.error("AI SOAP route error:", error);
    try {
      const d = await getDictionary("ko");
      return NextResponse.json({ error: d.dashboard.aiSoap.errorServer }, { status: 500 });
    } catch {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
}
