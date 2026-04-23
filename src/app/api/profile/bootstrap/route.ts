import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { upsertProfessionalProfile } from "@/lib/profile/upsert-professional-profile";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      license_no?: string;
      experience_years?: string;
      specialties?: string[];
      hospital_name?: string;
      blog_url?: string;
      bio?: string;
    };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await upsertProfessionalProfile({
      userId: user.id,
      name: body.name ?? null,
      licenseNo: body.license_no ?? null,
      experienceYears: body.experience_years ?? null,
      specialties: body.specialties ?? [],
      hospitalName: body.hospital_name ?? null,
      blogUrl: body.blog_url ?? null,
      bio: body.bio ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
