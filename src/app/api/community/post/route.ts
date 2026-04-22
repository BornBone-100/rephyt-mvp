import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .match({ id: postId, user_id: user.id });

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
