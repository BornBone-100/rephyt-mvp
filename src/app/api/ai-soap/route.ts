import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 🚀 1. 프론트엔드에서 넘어온 언어 데이터(targetLanguage)를 함께 받습니다.
    const { promptData, targetLanguage = "Korean-Mixed" } = await req.json();

    // 🚀 2. 선택된 언어에 따른 AI 지시어 셋업
    let languageDirective = "결과는 한국어와 영문 의학용어를 혼용하여 전문적으로 작성하세요.";

    if (targetLanguage === "English") {
      languageDirective = "Translate and write the entire content in 100% professional Medical English.";
    } else if (targetLanguage === "Japanese") {
      languageDirective = "결과를 전문적인 일본어 의학 용어(日本語)로 번역해서 작성하세요.";
    } else if (targetLanguage === "Chinese") {
      languageDirective = "결과를 전문적인 중국어 의학 용어(中文)로 번역해서 작성하세요.";
    } else if (targetLanguage === "Russian") {
      languageDirective = "결과를 전문적인 러시아어 의학 용어(Русский)로 번역해서 작성하세요.";
    }

    // 🚨 [진짜 7년 차 치료사의 뇌 이식] AI에게 강력한 임상 추론을 지시합니다.
    const systemPrompt = `
      당신은 7년 차 이상의 최고급 정형도수 전문 물리치료사(Orthopedic Manual Physical Therapist)입니다.
      입력된 환자의 날것(Raw) 데이터(History Taking, ROM, MMT, 특수검사)를 단순 요약하는 것을 넘어, 
      전문가의 시각에서 심층적으로 분석하고 유추하여 완벽한 임상 추론이 담긴 SOAP 노트를 작성해야 합니다.

      [강력한 심층 분석 및 유추 지시사항]
      1. Subjective (S): 
         - 환자의 일상적인 표현 이면에 숨겨진 손상 기전(MOI, Mechanism of Injury)을 의학적으로 유추하세요.
         - 통증의 양상(PQRST), 악화/완화 요인을 철저히 의학 용어로 재구성하세요.
         - 감별 진단에 필요한 Red Flag나 Yellow Flag 징후가 유추된다면 반드시 포함하세요.
      
      2. Objective (O): 
         - 입력된 ROM, MMT, 특수검사(Special Tests) 수치를 깔끔하게 나열하되, 양성 반응이나 저하된 수치가 의미하는 바를 함께 엮어서 서술하세요.
      
      3. Assessment (A) [★가장 중요★]: 
         - 단순한 증상 나열은 절대 금지합니다! S와 O를 종합하여 심층적인 임상 추론(Clinical Reasoning)을 전개하세요.
         - 문제의 근본 원인조직(Tissue at fault), 생체역학적 기능 부전(Biomechanical faults), 그리고 반드시 감별 진단(Rule Out / R/O)을 유추하여 포함하세요.
         - 환자의 기능적 제한(Functional Limitations)과 손상의 상관관계를 전문가 수준으로 서술하세요.
      
      4. Plan (P): 
         - A에서 유추된 근본 원인을 해결하기 위한 근거 기반(EBP) 중재 계획을 작성하세요.
         - 단기 목표(통증 제어/염증 감소 등)와 장기 목표(기능/가동성 회복 등)를 명확히 분리하고, 도수치료 기법이나 치료적 운동(FITT 원리 등)의 구체적 방향을 제시하세요.

      [출력 언어 지시사항]
      ${languageDirective}

      반드시 아래 JSON 형식으로만 반환하세요 (🚨주의: Key 값인 subjective, objective, assessment, plan은 절대 다른 언어로 번역하지 말고 영문 소문자 그대로 유지하세요):
      {
        "subjective": "심층 분석된 주관적 호소 및 손상 기전 유추",
        "objective": "객관적 검사 결과 요약",
        "assessment": "전문적인 임상 추론, 감별 진단 및 기능 부전 분석",
        "plan": "단기/장기 목표 및 구체적 EBP 중재 계획"
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