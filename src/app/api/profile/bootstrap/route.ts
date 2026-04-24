import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { upsertProfessionalProfile } from "@/lib/profile/upsert-professional-profile";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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
      slogan?: string;
      /** SMS 검증 세션 (verify-signup-sms 응답) */
      sms_session_token?: string;
      /** E.164, verify된 번호와 일치해야 함 */
      phone_number?: string;
    };

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const phoneNumber = typeof body.phone_number === "string" ? body.phone_number.trim() : "";
    const smsSessionToken = typeof body.sms_session_token === "string" ? body.sms_session_token.trim() : "";

    if (!phoneNumber || !smsSessionToken) {
      return NextResponse.json({ error: "phone_number and sms_session_token are required" }, { status: 400 });
    }

    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "supabase admin not configured" }, { status: 500 });
    }

    const { data: challengeRows, error: chErr } = await admin
      .from("signup_sms_challenges")
      .select("id, phone_e164, session_expires_at, consumed_at")
      .eq("session_token", smsSessionToken)
      .not("verified_at", "is", null)
      .is("consumed_at", null)
      .limit(1);

    if (chErr || !challengeRows?.length) {
      return NextResponse.json({ error: "유효하지 않은 휴대폰 인증 세션입니다. 다시 인증해 주세요." }, { status: 400 });
    }

    const challenge = challengeRows[0] as {
      id: string;
      phone_e164: string;
      session_expires_at: string | null;
      consumed_at: string | null;
    };

    if (challenge.phone_e164 !== phoneNumber) {
      return NextResponse.json({ error: "인증된 번호와 일치하지 않습니다." }, { status: 400 });
    }
    if (challenge.session_expires_at && new Date(challenge.session_expires_at) < new Date()) {
      return NextResponse.json({ error: "휴대폰 인증 세션이 만료되었습니다. 다시 인증해 주세요." }, { status: 400 });
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
      phoneNumber,
      slogan: body.slogan ?? null,
    });

    if (!result.ok) {
      const msg = result.message.toLowerCase();
      const dup =
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("profiles_phone_number_unique") ||
        result.message.includes("23505");
      if (dup) {
        return NextResponse.json(
          { error: "이미 가입된 휴대폰 번호입니다. 다른 번호로 인증하거나 고객센터로 문의해 주세요." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    await admin
      .from("signup_sms_challenges")
      .update({ consumed_at: new Date().toISOString() } as never)
      .eq("id", challenge.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
