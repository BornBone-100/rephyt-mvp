import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSixDigitOtp, hashSignupOtp, normalizeKrMobileToE164 } from "@/lib/auth/signup-sms";
import { sendSmsViaTwilio } from "@/lib/sms/twilio-send";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string };
    const raw = typeof body.phone === "string" ? body.phone : "";
    const normalized = normalizeKrMobileToE164(raw);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.message }, { status: 400 });
    }
    const phoneE164 = normalized.e164;

    const supabase = getAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "supabase admin not configured" }, { status: 500 });
    }

    const code = generateSixDigitOtp();
    const codeHash = hashSignupOtp(code);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("signup_sms_challenges").insert({
      phone_e164: phoneE164,
      code_hash: codeHash,
      expires_at: expiresAt,
    } as never);

    if (insertError) {
      console.error("[send-signup-sms] insert:", insertError);
      return NextResponse.json(
        { error: insertError.message || "OTP 저장에 실패했습니다. DB 마이그레이션을 적용했는지 확인하세요." },
        { status: 500 },
      );
    }

    const message = `[Re:PhyT] 본인인증 번호는 [${code}] 입니다. 3분 내에 입력해 주세요.`;

    const twilio = await sendSmsViaTwilio(phoneE164, message);
    const allowPlaintext = process.env.ALLOW_SMS_DEV_PLAINTEXT === "true";

    if (!twilio.ok) {
      console.warn("[send-signup-sms] Twilio skipped or failed:", twilio.message);
      console.info("[send-signup-sms] OTP (서버 로그):", phoneE164, code);
    }

    return NextResponse.json({
      ok: true,
      expiresInSec: 180,
      /** 로컬만: .env에 ALLOW_SMS_DEV_PLAINTEXT=true 일 때만 응답에 포함 */
      devOtp: allowPlaintext ? code : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}
