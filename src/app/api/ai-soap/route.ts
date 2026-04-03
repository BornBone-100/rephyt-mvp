import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { promptData } = await req.json();

    // 🚨 7년 차 치료사 빙의 프롬프트 (여기가 AI의 뇌를 세팅하는 곳입니다)
    const systemPrompt = `
      당신은 7년 차 전문 정형도수 물리치료사입니다. 
      제공된 환자의 주호소, ROM, MMT, 특수검사(Special Tests) 데이터를 분석하여 
      가장 전문적이고 임상적인 SOAP 노트(Subjective, Objective, Assessment, Plan)를 작성해야 합니다.
      반드시 아래 JSON 형식으로만 답변을 반환하세요:
      {
        "subjective": "환자의 주관적 호소 내용을 전문 용어로 정리",
        "objective": "객관적 검사 수치(ROM, MMT, 특수검사)를 깔끔하게 나열",
        "assessment": "검사 결과를 바탕으로 한 논리적인 임상 추론 및 진단",
        "plan": "단기/장기 목표가 포함된 3단계 재활 치료 계획"
      }
    `;

    // OpenAI 서버로 직통 전화(API 요청)를 겁니다
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 빠르고 가성비 좋은 최신 모델 적용
        response_format: { type: "json_object" }, // 무조건 JSON 형태로만 답변하라고 강제함
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptData },
        ],
      }),
    });

    const data = await response.json();

    // AI가 준 답변을 텍스트에서 진짜 데이터 꾸러미(JSON)로 변환
    const aiSoap = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(aiSoap);
  } catch (error) {
    console.error("AI 차트 생성 중 오류:", error);
    return NextResponse.json(
      { error: "AI 서버와 통신에 실패했습니다." },
      { status: 500 },
    );
  }
}
