import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase-generated";

type ShareBody = {
  mode?: "challenge" | "defense_tip";
  payload?: {
    challengeTitle?: string;
    defenseHighlight?: string;
    anonymousData?: unknown;
    overallScore?: number;
    defenseScore?: number;
  };
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 401 });
    }

    const body = (await request.json()) as ShareBody;
    const mode = body.mode === "defense_tip" ? "defense_tip" : "challenge";
    const payload = body.payload ?? {};

    const content = {
      mode,
      challengeTitle: payload.challengeTitle ?? "Clinical Reasoning Challenge",
      defenseHighlight: payload.defenseHighlight ?? "",
      anonymousData: payload.anonymousData ?? {},
      overallScore: typeof payload.overallScore === "number" ? payload.overallScore : 0,
      defenseScore: typeof payload.defenseScore === "number" ? payload.defenseScore : 0,
    };

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: content as unknown as Json,
      likes: 0,
      views: 0,
    } as any);
    if (error) {
      console.error("community/report-share insert:", error);
      return NextResponse.json({ success: false, message: "커뮤니티 저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("community/report-share route error:", error);
    return NextResponse.json({ success: false, message: "서버 오류" }, { status: 500 });
  }
}
