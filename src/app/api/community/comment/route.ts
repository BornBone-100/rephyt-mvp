import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const MAX_COMMENT_LENGTH = 8_000;

const TRANSLATE_SYSTEM_PROMPT = `
당신은 글로벌 물리치료사 커뮤니티의 전문 의료 통번역가입니다.
사용자가 입력한 댓글을 '전문적인 Medical English'로 완벽하게 번역하세요.
일상적인 대화체는 자연스럽게, 해부학/치료 기법(예: 관절가동술, 도수치료 등)은 정확한 영문 의학 용어로 변환해야 합니다.
오직 번역된 결과물 텍스트만 반환하세요. 설명, 따옴표, 마크다운 없이 본문만 출력하세요.
`.trim();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 401 });
    }

    const body = (await request.json()) as {
      postId?: string;
      content?: string;
      authorLang?: string;
    };
    const { postId, content, authorLang } = body;

    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ success: false, message: "postId가 필요합니다." }, { status: 400 });
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ success: false, message: "댓글 내용이 필요합니다." }, { status: 400 });
    }
    const trimmed = content.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { success: false, message: `댓글은 ${MAX_COMMENT_LENGTH}자 이하로 입력해 주세요.` },
        { status: 400 },
      );
    }

    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json({ success: false, message: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("community/comment: OPENAI_API_KEY 없음");
      return NextResponse.json({ success: false, message: "서버 설정 오류" }, { status: 500 });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ],
      }),
    });

    const aiData = (await aiResponse.json()) as {
      choices?: { message?: { content?: string | null } }[];
      error?: { message?: string };
    };

    if (!aiResponse.ok) {
      console.error("community/comment OpenAI:", aiData);
      return NextResponse.json(
        { success: false, message: aiData.error?.message ?? "번역 처리에 실패했습니다." },
        { status: 502 },
      );
    }

    const raw = aiData.choices?.[0]?.message?.content;
    const translatedContent = typeof raw === "string" ? raw.trim() : "";
    if (!translatedContent) {
      return NextResponse.json({ success: false, message: "번역 결과가 비어 있습니다." }, { status: 502 });
    }

    const lang =
      typeof authorLang === "string" && authorLang.trim().length > 0
        ? authorLang.trim().slice(0, 16)
        : null;

    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      original_content: trimmed,
      translated_content: translatedContent,
      author_lang: lang,
    });

    if (error) {
      console.error("community_comments insert:", error);
      return NextResponse.json(
        { success: false, message: `저장 실패: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "댓글이 등록되었습니다." });
  } catch (error) {
    console.error("댓글 등록/번역 에러:", error);
    return NextResponse.json({ success: false, message: "댓글 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "권한이 없습니다." }, { status: 401 });
    }

    const body = (await request.json()) as { commentId?: string };
    const commentId = typeof body.commentId === "string" ? body.commentId.trim() : "";
    if (!commentId) {
      return NextResponse.json({ success: false, message: "commentId가 필요합니다." }, { status: 400 });
    }

    const { error } = await supabase
      .from("community_comments")
      .delete()
      .match({ id: commentId, author_id: user.id });

    if (error) {
      console.error("community_comments delete:", error);
      return NextResponse.json({ success: false, message: "댓글 삭제 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error("댓글 삭제 에러:", error);
    return NextResponse.json(
      { success: false, message: "댓글 삭제 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
