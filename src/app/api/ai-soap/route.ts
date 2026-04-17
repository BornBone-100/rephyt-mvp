import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { promptData, language = "Korean-Mixed" } = await req.json();
    console.log("전달받은 언어 세팅값:", language);

    let languageDirective = "결과는 한국어와 영문 의학용어를 혼용하여 전문적으로 작성하세요.";

    if (language === "English") {
      languageDirective = "Translate and write the ALL values in 100% professional Medical English.";
    } else if (language === "Japanese") {
      languageDirective = "모든 결과 내용을 전문적인 일본어 의학 용어(日本語)로 번역해서 작성하세요.";
    } else if (language === "Chinese") {
      languageDirective = "모든 결과 내용을 전문적인 중국어 의학 용어(中文)로 번역해서 작성하세요.";
    } else if (language === "Russian") {
      languageDirective = "모든 결과 내용을 전문적인 러시아어 의학 용어(Русский)로 번역해서 작성하세요.";
    }

    const systemPrompt = `
      당신은 7년 차 이상의 최고급 정형도수 전문 물리치료사(Orthopedic Manual Physical Therapist)입니다.
      입력된 환자의 날것(Raw) 데이터(History Taking, ROM, MMT, 특수검사)를 단순 요약하는 것을 넘어, 
      전문가의 시각에서 심층적으로 분석하고 유추하여 완벽한 임상 추론이 담긴 SOAP 노트를 작성해야 합니다.

      [강력한 심층 분석 및 유추 지시사항]
      1. Subjective (S): 환자의 일상적인 표현 이면에 숨겨진 손상 기전(MOI)을 의학적으로 유추하세요.
      2. Objective (O): 입력된 ROM, MMT, 특수검사 수치를 나열하고 양성 반응이 의미하는 바를 서술하세요.
      3. Assessment (A): S와 O를 종합하여 근본 원인조직(Tissue at fault), 생체역학적 기능 부전, 감별 진단(R/O)을 유추하세요.
      4. Plan (P): A에서 유추된 원인을 해결하기 위한 구체적인 EBP 중재 계획을 작성하세요.

      [🔥 절대 엄수: 출력 언어 지시사항]
      ${languageDirective}

      반드시 아래 JSON 형식으로만 반환하세요. 
      (🚨주의 1: Key 값인 subjective, objective, assessment, plan은 절대 다른 언어로 번역하지 말고 영문 소문자 그대로 유지하세요.)
      (🚨주의 2: Value 값(내용)은 반드시 위에서 지시한 [언어]로만 작성해야 합니다. 예시에 속지 마세요!)
      {
        "subjective": "[선택된 언어로 심층 분석 내용 작성]",
        "objective": "[선택된 언어로 객관적 검사 결과 작성]",
        "assessment": "[선택된 언어로 임상 추론 작성]",
        "plan": "[선택된 언어로 중재 계획 작성]"
      }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', 
        response_format: { type: "json_object" }, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptData }
        ],
      }),
    });

    const data = await response.json();
    const aiSoap = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(aiSoap);

  } catch (error) {
    console.error("AI 차트 생성 중 오류:", error);
    return NextResponse.json({ error: "AI 서버와 통신에 실패했습니다." }, { status: 500 });
  }
}