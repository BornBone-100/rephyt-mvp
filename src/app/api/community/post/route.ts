import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { text, authorId } = await req.json();

    if (!text || !authorId) {
      return NextResponse.json({ error: "내용과 작성자 ID가 필요합니다." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // community_posts 테이블에 저장
    const { error } = await supabase.from("community_posts").insert([
      {
        content: text,
        author_id: authorId,
        created_at: new Date().toISOString(),
        likes: 0,
      },
    ]);

    if (error) {
      console.error("DB 저장 에러:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
