import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase-generated";

const SYSTEM_PROMPT = `
당신은 의료 데이터 비식별화(Anonymization) 전문 AI입니다.
입력된 SOAP 노트에서 임상적 가치(평가, 진단, 치료 계획)는 100% 보존하되,
누구인지 특정할 수 있는 개인정보(PHI)만 철저하게 제거하여 학술 커뮤니티 공유용 데이터로 세탁하세요.

[비식별화 규칙]
1. 나이: 정확한 나이 대신 연령대로 변경 (예: 38세 -> 30대 후반).
2. 직업 및 소속: 특정 직장명이나 구체적 직업은 포괄적 직군으로 변경 (예: 삼성전자 개발자 -> 장시간 좌식 IT 사무직, 배달의민족 라이더 -> 이륜차 운전직).
3. 고유 명사: 환자의 이름, 특정 병원 이름, 구체적인 지역명(예: 부산시 해운대구)은 모두 삭제하거나 '해당 지역', '본원' 등으로 마스킹 처리.
4. 날짜: '2026년 4월 15일' 같은 정확한 날짜는 'N주 전', '최근' 등으로 변경.

입력 JSON의 subjective(또는 S) 내용만 비식별하여 anonymized_subjective에 담고, objective·assessment·plan은 임상 의미를 유지한 채 PHI만 제거·일반화하세요.

반드시 아래 JSON 형식으로만 반환하세요:
{
  "anonymized_subjective": "[세탁된 Subjective 데이터]",
  "objective": "[비식별 처리된 Objective]",
  "assessment": "[비식별 처리된 Assessment]",
  "plan": "[비식별 처리된 Plan]"
}
`.trim();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { originalSoap?: unknown; chartId?: string };
    const { originalSoap, chartId } = body;

    if (originalSoap === undefined || originalSoap === null) {
      return NextResponse.json(
        { success: false, message: "originalSoap 데이터가 필요합니다." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("community/share: OPENAI_API_KEY 없음");
      return NextResponse.json(
        { success: false, message: "서버 설정 오류" },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(originalSoap) },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("community/share OpenAI HTTP 오류:", data);
      return NextResponse.json(
        { success: false, message: data.error?.message ?? "AI 처리 실패" },
        { status: 502 },
      );
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { success: false, message: "AI 응답이 비어 있습니다." },
        { status: 502 },
      );
    }

    let anonymizedSoap: Record<string, unknown>;
    try {
      anonymizedSoap = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, message: "AI 응답 JSON 파싱 실패" },
        { status: 502 },
      );
    }

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: anonymizedSoap as Json,
      likes: 0,
      views: 0,
    } as any);

    if (error) {
      console.error("community_posts insert:", error);
      return NextResponse.json(
        { success: false, message: `저장 실패: ${error.message}` },
        { status: 500 },
      );
    }

    const trimmedChartId = typeof chartId === "string" ? chartId.trim() : "";
    if (trimmedChartId) {
      const { error: updateError } = await supabase
        .from("soap_notes")
        .update({ is_shared: true })
        .eq("id", trimmedChartId);

      if (updateError) {
        console.error("공유 상태 업데이트 실패:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 커뮤니티에 공유되었습니다.",
    });
  } catch (error) {
    console.error("비식별화 및 공유 실패:", error);
    return NextResponse.json(
      { success: false, message: "서버 통신 오류" },
      { status: 500 },
    );
  }
}
