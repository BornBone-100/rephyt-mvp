import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { text, authorId, reportId, mediaUrls, imageUrl, category } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabase.from("community_posts").insert([
      {
        content: text,
        author_id: authorId,
        report_id: reportId || null,
        media_urls: mediaUrls || [],
        image_url: imageUrl || null,
        clinical_category: category,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 기존 POST 함수 아래에 추가
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // URL에서 ?id=... 값을 가져옴

    if (!id) return NextResponse.json({ error: "ID 누락" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // community_posts 테이블에서 해당 ID를 삭제
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
