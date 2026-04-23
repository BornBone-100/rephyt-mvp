"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";

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
};

function LoginForm({ dict }: Props) {
  const a = dict.auth;
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileInput, setProfileInput] = useState<SignUpProfileInput>({
    name: "",
    licenseNo: "",
    experienceYears: "",
    hospitalName: "",
    specialties: [],
    blogUrl: "",
    bio: "",
  });

  const nextPath = `/${lang}/dashboard`;

  const progressPercent = signupStep === 1 ? 50 : 100;

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setTimeout(() => setCooldownSec((prev) => prev - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownSec]);

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

  const upsertProfileAfterSignUp = async () => {
    const payload = {
      name: profileInput.name.trim(),
      license_no: profileInput.licenseNo.trim(),
      experience_years: profileInput.experienceYears,
      hospital_name: profileInput.hospitalName.trim(),
      specialties: profileInput.specialties,
      blog_url: profileInput.blogUrl.trim(),
      bio: profileInput.bio.trim(),
    };
    await fetch("/api/profile/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
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
    if (!profileInput.name.trim() || !profileInput.licenseNo.trim() || !profileInput.experienceYears || !profileInput.hospitalName.trim()) {
      setStatus("전문가 인증 정보(성명, 면허번호, 임상 연차, 소속 기관명)를 모두 입력해 주세요.");
      return;
    }
    if (profileInput.specialties.length === 0) {
      setStatus("최소 1개 이상의 주요 전문 분야를 선택해 주세요.");
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
      setNeedsEmailConfirm(true);
      setCooldownSec(60);
      setStatus(a.signupSuccessCheckEmail);
      return;
    }

    await upsertProfileAfterSignUp();
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
                  <span>{signupStep === 1 ? "Step 1. 계정 생성" : "Step 2. 전문가 인증 정보"}</span>
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
              ) : (
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
              )}

              <div className="mt-6 flex gap-2">
                {signupStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="h-11 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    이전
                  </button>
                ) : null}
                {signupStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setSignupStep(2)}
                    className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700"
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
