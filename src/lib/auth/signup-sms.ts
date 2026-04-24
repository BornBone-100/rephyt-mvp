import { createHash, randomInt } from "node:crypto";

const KR_MOBILE = /^01[0-9]{8,9}$/;

/** 입력에서 숫자만 남김 (하이픈 제거) */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * 국내 휴대폰(01x…) → E.164 (+82…)
 */
export function normalizeKrMobileToE164(raw: string): { ok: true; e164: string } | { ok: false; message: string } {
  const d = digitsOnly(raw);
  if (!d) return { ok: false, message: "휴대폰 번호를 입력해 주세요." };

  if (d.startsWith("82") && d.length >= 11) {
    return { ok: true, e164: `+${d}` };
  }

  if (KR_MOBILE.test(d)) {
    return { ok: true, e164: `+82${d.slice(1)}` };
  }

  return { ok: false, message: "올바른 휴대폰 번호 형식이 아닙니다. (하이픈 없이 01x로 시작)" };
}

export function hashSignupOtp(code: string): string {
  const pepper = process.env.SMS_OTP_PEPPER || "dev-only-change-SMS_OTP_PEPPER-in-production";
  return createHash("sha256").update(`${pepper}:${code}`, "utf8").digest("hex");
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
