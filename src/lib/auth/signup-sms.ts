import { createHash, randomInt } from "node:crypto";

export function hashSignupOtp(code: string): string {
  const pepper = process.env.SMS_OTP_PEPPER || "dev-only-change-SMS_OTP_PEPPER-in-production";
  return createHash("sha256").update(`${pepper}:${code}`, "utf8").digest("hex");
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
