import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashSignupOtp, normalizeKrMobileToE164 } from "@/lib/auth/signup-sms";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const SESSION_TTL_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; code?: string };
    const normalized = normalizeKrMobileToE164(typeof body.phone === "string" ? body.phone : "");
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.message }, { status: 400 });
    }
    const phoneE164 = normalized.e164;
    const code = digitsOnlyCode(body.code);
    if (code.length !== 6) {
      return NextResponse.json({ error: "인증번호 6자리를 입력해 주세요." }, { status: 400 });
    }

    const supabase = getAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "supabase admin not configured" }, { status: 500 });
    }

    const { data: rows, error: fetchError } = await supabase
      .from("signup_sms_challenges")
      .select("id, code_hash, expires_at, verified_at")
      .eq("phone_e164", phoneE164)
      .is("verified_at", null)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !rows?.length) {
      return NextResponse.json({ error: "유효한 인증 요청이 없거나 만료되었습니다. 다시 전송해 주세요." }, { status: 400 });
    }

    const row = rows[0] as { id: string; code_hash: string };
    const expectedHash = row.code_hash;
    const actualHash = hashSignupOtp(code);
    if (expectedHash !== actualHash) {
      return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
    }

    const sessionToken = randomUUID();
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error: updateError } = await supabase
      .from("signup_sms_challenges")
      .update({
        verified_at: new Date().toISOString(),
        session_token: sessionToken,
        session_expires_at: sessionExpiresAt,
      } as never)
      .eq("id", row.id);

    if (updateError) {
      console.error("[verify-signup-sms] update:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      phoneE164,
      sessionToken,
      sessionExpiresAt,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

function digitsOnlyCode(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/\D/g, "").slice(0, 6);
}
