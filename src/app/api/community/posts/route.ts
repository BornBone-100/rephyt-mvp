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

    const body = await request.json();
    
    // 1. 데이터 정제: 'text'(자유글) 또는 'reportData'(리포트 공유) 대응
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const reportData = body.reportData || null;

    if (!text && !reportData) {
      return NextResponse.json({ success: false, message: "내용을 입력해 주세요." }, { status: 400 });
    }

    // 2. DB 구조에 맞춘 인서트 데이터 (likes, views 등 확인 안 된 컬럼은 제외)
    const insertData = {
      author_id: user.id, // 스크린샷에서 확인된 확정 컬럼명
      content: (reportData ? reportData : { type: "general", body: text }) as unknown as Json,
      // 만약 DB에 likes, views 컬럼이 확실히 있다면 아래 주석을 해제하세요.
      // likes: 0,
      // views: 0,
    };

    // 3. DB 저장 실행
    const { data, error: insertError } = await supabase
      .from("community_posts")
      .insert(insertData as any)
      .select("*")
      .single();

    if (insertError) {
      // 💡 여기서 에러가 나면 Cursor 하단 터미널을 꼭 보세요!
      console.error("❌ [Community POST] DB 저장 실패:", insertError.message);
      return NextResponse.json({ success: false, message: `저장 실패: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch (error: any) {
    console.error("🚨 [Community POST] 서버 에러:", error.message);
    return NextResponse.json({ success: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
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

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ success: false, message: "삭제할 게시글 ID가 필요합니다." }, { status: 400 });
    }

    // author_id로 본인 확인하며 삭제
    const { error: deleteError } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId)
      .eq("author_id" as any, user.id as any); // user_id 대신 author_id 사용

    if (deleteError) {
      console.error("❌ [Community DELETE] 삭제 실패:", deleteError.message);
      return NextResponse.json({ success: false, message: "삭제 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "게시글이 삭제되었습니다." });
  } catch (error: any) {
    console.error("🚨 [Community DELETE] 서버 에러:", error.message);
    return NextResponse.json({ success: false, message: "서버 오류" }, { status: 500 });
  }
}
