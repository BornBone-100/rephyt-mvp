import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const sort = searchParams.get("sort") === "popular" ? "popular" : "latest";
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase.from("community_posts").select("*", { count: "exact" });

    if (sort === "popular") {
      query = query.order("likes", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: posts, error, count } = await query.range(start, end);

    if (error) {
      console.error("community/feed:", error);
      return NextResponse.json({ success: false, message: "피드를 불러오지 못했습니다." }, { status: 500 });
    }

    const total = count ?? 0;
    const hasMore = start + limit < total;

    return NextResponse.json({
      success: true,
      posts: posts ?? [],
      hasMore,
    });
  } catch (error) {
    console.error("community/feed:", error);
    return NextResponse.json({ success: false, message: "피드를 불러오지 못했습니다." }, { status: 500 });
  }
}
