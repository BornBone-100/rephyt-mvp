import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase-generated";

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

    const body = (await request.json()) as { text?: string };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ success: false, message: "게시글 내용을 입력해 주세요." }, { status: 400 });
    }

    const content = { type: "general", body: text };
    const baseInsert = {
      content: content as unknown as Json,
      likes: 0,
      views: 0,
    } as const;

    // 프로젝트별 스키마 차이(user_id/author_id)를 흡수해 500을 방지한다.
    let insertedPost: Record<string, unknown> | null = null;
    let insertError: { message?: string } | null = null;

    const userIdInsert = await supabase
      .from("community_posts")
      .insert({ ...baseInsert, user_id: user.id } as any)
      .select("*")
      .single();

    if (!userIdInsert.error) {
      insertedPost = (userIdInsert.data ?? null) as Record<string, unknown> | null;
    } else if (/author_id/i.test(userIdInsert.error.message ?? "")) {
      const authorIdInsert = await supabase
        .from("community_posts")
        .insert({ ...baseInsert, author_id: user.id } as any)
        .select("*")
        .single();
      if (!authorIdInsert.error) {
        insertedPost = (authorIdInsert.data ?? null) as Record<string, unknown> | null;
      } else {
        insertError = { message: authorIdInsert.error.message };
      }
    } else {
      insertError = { message: userIdInsert.error.message };
    }

    if (!insertedPost) {
      console.error("community_posts insert:", insertError?.message ?? "unknown error");
      return NextResponse.json({ success: false, message: "저장 실패(500)" }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: insertedPost });
  } catch (error) {
    console.error("게시물 작성 에러:", error);
    return NextResponse.json({ success: false, message: "저장 실패(500)" }, { status: 500 });
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

    const body = (await request.json()) as { postId?: string };
    const postId = typeof body.postId === "string" ? body.postId.trim() : "";
    if (!postId) {
      return NextResponse.json({ success: false, message: "postId가 필요합니다." }, { status: 400 });
    }

    const deleteByUserId = await supabase
      .from("community_posts")
      .delete()
      .match({ id: postId, user_id: user.id } as any);

    let error = deleteByUserId.error;
    if (error && /author_id/i.test(error.message ?? "")) {
      const deleteByAuthorId = await supabase
        .from("community_posts")
        .delete()
        .match({ id: postId, author_id: user.id } as any);
      error = deleteByAuthorId.error;
    }

    if (error) {
      console.error("community_posts delete:", error);
      return NextResponse.json({ success: false, message: "삭제 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "케이스가 커뮤니티에서 삭제되었습니다." });
  } catch (error) {
    console.error("게시물 삭제 에러:", error);
    return NextResponse.json({ success: false, message: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
