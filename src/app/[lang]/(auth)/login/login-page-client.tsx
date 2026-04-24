"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";
import { digitsOnly } from "@/lib/auth/signup-sms";
import {
  clearPendingProfileBootstrap,
  writePendingProfileBootstrap,
  type PendingProfileBootstrapPayload,
} from "@/components/dashboard/pending-signup-profile-sync";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type ExperienceYears = "1-3" | "4-7" | "8-12" | "13+";
const SPECIALTY_OPTIONS = ["도수치료", "스포츠 재활", "림프/부종", "신경계", "근골격계 통증", "수술 후 재활"] as const;

type SignUpProfileInput = {
  name: string;
  licenseNo: string;
  experienceYears: ExperienceYears | "";
  hospitalName: string;
  specialties: string[];
  blogUrl: string;
  bio: string;
  slogan: string;
};

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function stepTitle(step: 1 | 2 | 3 | 4): string {
  switch (step) {
    case 1:
      return "Step 1. 계정 정보";
    case 2:
      return "Step 2. 본인 인증 (휴대폰)";
    case 3:
      return "Step 3. 전문가 프로필";
    default:
      return "Step 4. 브랜딩 정보";
  }
}

function LoginForm({ dict }: Props) {
  const a = dict.auth;
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [phoneVerifySuccess, setPhoneVerifySuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4>(1);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileInput, setProfileInput] = useState<SignUpProfileInput>({
    name: "",
    licenseNo: "",
    experienceYears: "",
    hospitalName: "",
    specialties: [],
    blogUrl: "",
    bio: "",
    slogan: "",
  });

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimerSec, setOtpTimerSec] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);
  const [smsSessionToken, setSmsSessionToken] = useState<string | null>(null);

  const nextPath = `/${lang}/dashboard`;
  const progressPercent = Math.round((signupStep / 4) * 100);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setTimeout(() => setCooldownSec((prev) => prev - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownSec]);

  useEffect(() => {
    if (otpTimerSec <= 0) return;
    const id = window.setTimeout(() => setOtpTimerSec((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [otpTimerSec]);

  const resetSignupPhoneState = () => {
    setPhoneDigits("");
    setOtpInput("");
    setOtpSent(false);
    setOtpTimerSec(0);
    setPhoneVerified(false);
    setVerifiedPhoneE164(null);
    setSmsSessionToken(null);
    setPhoneVerifySuccess(null);
  };

  const signIn = async () => {
    if (loading !== null) return;
    setStatus(null);
    setNeedsEmailConfirm(false);
    setLoading("signin");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(null);

    if (error) {
      const msg = error.message || a.errorSignInFailed;
      if (msg.toLowerCase().includes("email not confirmed")) {
        setNeedsEmailConfirm(true);
        setStatus(a.errorEmailNotConfirmed);
      } else {
        setStatus(msg);
      }
      return;
    }
    router.replace(nextPath);
  };

  function buildBootstrapPayload(): PendingProfileBootstrapPayload | null {
    if (!smsSessionToken || !verifiedPhoneE164) return null;
    return {
      sms_session_token: smsSessionToken,
      phone_number: verifiedPhoneE164,
      name: profileInput.name.trim(),
      license_no: profileInput.licenseNo.trim(),
      experience_years: profileInput.experienceYears,
      hospital_name: profileInput.hospitalName.trim(),
      specialties: profileInput.specialties,
      blog_url: profileInput.blogUrl.trim(),
      bio: profileInput.bio.trim(),
      slogan: profileInput.slogan.trim(),
    };
  }

  const postProfileBootstrap = async (payload: PendingProfileBootstrapPayload): Promise<{ ok: true } | { ok: false; message: string; status: number }> => {
    const res = await fetch("/api/profile/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, message: json.error || "프로필 저장에 실패했습니다.", status: res.status };
    }
    return { ok: true };
  };

  const sendSignupSms = async () => {
    if (sendingSms) return;
    setStatus(null);
    setPhoneVerifySuccess(null);
    const raw = phoneDigits.trim();
    if (raw.length < 10) {
      setStatus("휴대폰 번호를 올바르게 입력해 주세요.");
      return;
    }
    setSendingSms(true);
    try {
      const res = await fetch("/api/auth/send-signup-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; devOtp?: string };
      if (!res.ok) {
        setStatus(json.error || "인증번호 전송에 실패했습니다.");
        return;
      }
      setOtpSent(true);
      setOtpTimerSec(180);
      setOtpInput("");
      setPhoneVerified(false);
      setVerifiedPhoneE164(null);
      setSmsSessionToken(null);
      if (json.devOtp) {
        setPhoneVerifySuccess(`(개발) OTP: ${json.devOtp}`);
      }
    } finally {
      setSendingSms(false);
    }
  };

  const verifySignupSms = async () => {
    if (verifyingSms) return;
    setStatus(null);
    setPhoneVerifySuccess(null);
    const code = digitsOnly(otpInput);
    if (code.length !== 6) {
      setStatus("인증번호 6자리를 입력해 주세요.");
      return;
    }
    setVerifyingSms(true);
    try {
      const res = await fetch("/api/auth/verify-signup-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits, code }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        sessionToken?: string;
        phoneE164?: string;
      };
      if (!res.ok) {
        setStatus(json.error || "인증에 실패했습니다.");
        return;
      }
      if (!json.sessionToken || !json.phoneE164) {
        setStatus("인증 응답이 올바르지 않습니다.");
        return;
      }
      setPhoneVerified(true);
      setVerifiedPhoneE164(json.phoneE164);
      setSmsSessionToken(json.sessionToken);
      setPhoneVerifySuccess("✔ 인증이 완료되었습니다. 다음 단계로 진행할 수 있습니다.");
    } finally {
      setVerifyingSms(false);
    }
  };

  const signUp = async () => {
    if (loading !== null || cooldownSec > 0) return;
    if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setStatus("이메일/비밀번호/비밀번호 확인을 모두 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setStatus("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!phoneVerified || !smsSessionToken || !verifiedPhoneE164) {
      setStatus("휴대폰 본인 인증을 완료해 주세요.");
      return;
    }
    if (!profileInput.name.trim() || !profileInput.licenseNo.trim() || !profileInput.experienceYears || !profileInput.hospitalName.trim()) {
      setStatus("전문가 인증 정보(성명, 면허번호, 임상 연차, 소속 기관명)를 모두 입력해 주세요.");
      return;
    }
    if (profileInput.specialties.length === 0) {
      setStatus("최소 1개 이상의 주요 전문 분야를 선택해 주세요.");
      return;
    }

    const bootstrapPayload = buildBootstrapPayload();
    if (!bootstrapPayload) {
      setStatus("휴대폰 인증 세션이 유효하지 않습니다. Step 2에서 다시 인증해 주세요.");
      return;
    }

    setStatus(null);
    setNeedsEmailConfirm(false);
    setLoading("signup");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: profileInput.name.trim(),
          license_no: profileInput.licenseNo.trim(),
          experience_years: profileInput.experienceYears,
          hospital_name: profileInput.hospitalName.trim(),
          specialties: profileInput.specialties,
          blog_url: profileInput.blogUrl.trim(),
          bio: profileInput.bio.trim(),
          slogan: profileInput.slogan.trim(),
        },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/${lang}/callback` : undefined,
      },
    });
    setLoading(null);

    if (error) {
      if (error.message?.toLowerCase().includes("rate limit")) {
        setCooldownSec(60);
      }
      setStatus(error.message);
      return;
    }

    if (!data.session) {
      writePendingProfileBootstrap(bootstrapPayload);
      setNeedsEmailConfirm(true);
      setCooldownSec(60);
      setStatus(a.signupSuccessCheckEmail);
      return;
    }

    const boot = await postProfileBootstrap(bootstrapPayload);
    if (!boot.ok) {
      if (boot.status === 409) {
        setStatus(boot.message);
      } else {
        setStatus(boot.message);
      }
      return;
    }
    clearPendingProfileBootstrap();
    router.replace(`${nextPath}?welcomeName=${encodeURIComponent(profileInput.name.trim())}`);
  };

  const resendConfirmation = async () => {
    if (loading !== null || cooldownSec > 0) return;
    if (!email) {
      setStatus(a.resendNeedEmail);
      return;
    }
    setLoading("signup");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/${lang}/callback` : undefined,
      },
    });
    setLoading(null);
    if (error) {
      if (error.message?.toLowerCase().includes("rate limit")) {
        setCooldownSec(60);
      }
      setStatus(error.message);
      return;
    }
    setCooldownSec(60);
    setStatus(a.resendSuccess);
  };

  const sendResetPasswordEmail = async () => {
    if (resetLoading || loading !== null) return;
    if (!email.trim()) {
      setStatus(a.resetNeedEmail);
      return;
    }

    setResetLoading(true);
    setStatus(null);

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/${lang}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setResetLoading(false);

    if (error) {
      setStatus(error.message || a.resetFailed);
      return;
    }
    setStatus(a.resetSent);
  };

  const toggleSpecialty = (specialty: string) => {
    setProfileInput((prev) => {
      const exists = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((item) => item !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  const goNextSignupStep = () => {
    setStatus(null);
    if (signupStep === 1) {
      if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
        setStatus("이메일/비밀번호/비밀번호 확인을 모두 입력해 주세요.");
        return;
      }
      if (password !== passwordConfirm) {
        setStatus("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
      setSignupStep(2);
      return;
    }
    if (signupStep === 2) {
      if (!phoneVerified) {
        setStatus("휴대폰 인증을 완료한 뒤 다음으로 이동할 수 있습니다.");
        return;
      }
      setSignupStep(3);
      return;
    }
    if (signupStep === 3) {
      if (!profileInput.name.trim() || !profileInput.licenseNo.trim() || !profileInput.experienceYears || !profileInput.hospitalName.trim()) {
        setStatus("전문가 인증 정보를 모두 입력해 주세요.");
        return;
      }
      if (profileInput.specialties.length === 0) {
        setStatus("최소 1개 이상의 주요 전문 분야를 선택해 주세요.");
        return;
      }
      setSignupStep(4);
    }
  };

  const goPrevSignupStep = () => {
    setStatus(null);
    if (signupStep === 2) {
      setSignupStep(1);
      resetSignupPhoneState();
      return;
    }
    if (signupStep === 3) {
      setSignupStep(2);
      return;
    }
    if (signupStep === 4) {
      setSignupStep(3);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{a.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{a.subtitle}</p>
          </div>

          <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setStatus(null);
                setPhoneVerifySuccess(null);
              }}
              className={`rounded-lg px-3 py-1.5 ${authMode === "signin" ? "bg-indigo-600 text-white" : "text-slate-700"}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setStatus(null);
                setPhoneVerifySuccess(null);
                setSignupStep(1);
                resetSignupPhoneState();
              }}
              className={`rounded-lg px-3 py-1.5 ${authMode === "signup" ? "bg-indigo-600 text-white" : "text-slate-700"}`}
            >
              회원가입
            </button>
          </div>

          {authMode === "signin" ? (
            <>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-800">{a.emailLabel}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={a.emailPlaceholder}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800">{a.passwordLabel}</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={a.passwordPlaceholder}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                  />
                </label>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={signIn}
                  className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading === "signin" ? a.loginLoading : a.loginBtn}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void sendResetPasswordEmail()}
                disabled={resetLoading || loading !== null}
                className="mt-3 text-sm font-medium text-indigo-600 underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading ? a.resetSending : a.forgotPassword}
              </button>
            </>
          ) : (
            <>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{stepTitle(signupStep)}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {signupStep === 1 ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">이메일</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={a.emailPlaceholder}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">비밀번호</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8자 이상 입력"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">비밀번호 확인</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호를 다시 입력"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                </div>
              ) : null}

              {signupStep === 2 ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">휴대폰 번호 (숫자만, 하이픈 없음)</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))}
                      placeholder="01012345678"
                      disabled={phoneVerified}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10 disabled:bg-slate-50"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendSignupSms()}
                    disabled={sendingSms || phoneVerified || phoneDigits.length < 10}
                    className="h-11 w-full rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingSms ? "전송 중…" : "인증번호 전송"}
                  </button>

                  {otpSent ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        <span>인증번호 입력</span>
                        <span className={otpTimerSec > 0 ? "text-indigo-600" : "text-red-600"}>
                          {otpTimerSec > 0 ? formatMmSs(otpTimerSec) : "00:00"}
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(digitsOnly(e.target.value).slice(0, 6))}
                        placeholder="6자리"
                        disabled={phoneVerified}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-center text-lg tracking-[0.3em] outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10 disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => void verifySignupSms()}
                        disabled={verifyingSms || phoneVerified || otpInput.length !== 6 || otpTimerSec <= 0}
                        className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyingSms ? "확인 중…" : "인증 확인"}
                      </button>
                    </div>
                  ) : null}

                  {phoneVerifySuccess ? (
                    <p
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        phoneVerifySuccess.startsWith("✔")
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      {phoneVerifySuccess}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {signupStep === 3 ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">성명 (실명)</span>
                    <input
                      value={profileInput.name}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="예: 김성준"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">면허번호</span>
                    <input
                      value={profileInput.licenseNo}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, licenseNo: e.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder="숫자만 입력"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">임상 연차</span>
                    <select
                      value={profileInput.experienceYears}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, experienceYears: e.target.value as ExperienceYears }))}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    >
                      <option value="">선택하세요</option>
                      <option value="1-3">1~3년</option>
                      <option value="4-7">4~7년</option>
                      <option value="8-12">8~12년</option>
                      <option value="13+">13년 이상</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">소속 기관명</span>
                    <input
                      value={profileInput.hospitalName}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, hospitalName: e.target.value }))}
                      placeholder="병원/센터명"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <div>
                    <p className="text-sm font-medium text-slate-800">주요 전문 분야</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SPECIALTY_OPTIONS.map((specialty) => {
                        const selected = profileInput.specialties.includes(specialty);
                        return (
                          <button
                            key={specialty}
                            type="button"
                            onClick={() => toggleSpecialty(specialty)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400"
                            }`}
                          >
                            {specialty}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {signupStep === 4 ? (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">네이버 블로그 / 웹 URL (선택)</span>
                    <input
                      value={profileInput.blogUrl}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, blogUrl: e.target.value }))}
                      placeholder="https://"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">슬로건 / 한 줄 소개 (선택)</span>
                    <input
                      value={profileInput.slogan}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, slogan: e.target.value }))}
                      placeholder="예: 정직한 데이터로 실무 안전을 돕습니다."
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800">소개 (선택)</span>
                    <textarea
                      value={profileInput.bio}
                      onChange={(e) => setProfileInput((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      placeholder="간단한 소개를 입력해 주세요."
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600/40 focus:ring-2 focus:ring-indigo-600/10"
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-6 flex gap-2">
                {signupStep > 1 ? (
                  <button
                    type="button"
                    onClick={goPrevSignupStep}
                    className="h-11 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    이전
                  </button>
                ) : null}
                {signupStep < 4 ? (
                  <button
                    type="button"
                    onClick={goNextSignupStep}
                    disabled={signupStep === 2 && !phoneVerified}
                    className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    다음
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={signUp}
                    disabled={loading !== null || cooldownSec > 0}
                    className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading === "signup"
                      ? a.signupLoading
                      : cooldownSec > 0
                        ? a.signupCooldown.replace("{seconds}", String(cooldownSec))
                        : a.signupBtn}
                  </button>
                )}
              </div>
            </>
          )}

          {status ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {status}
            </p>
          ) : null}

          {needsEmailConfirm ? (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={loading !== null || cooldownSec > 0}
              className="mt-3 h-10 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "signup"
                ? a.resendLoading
                : cooldownSec > 0
                  ? a.resendCooldown.replace("{seconds}", String(cooldownSec))
                  : a.resendButton}
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function LoginPageClient({ dict }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">{dict.auth.suspenseLoading}</div>
      }
    >
      <LoginForm dict={dict} />
    </Suspense>
  );
}
