"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// 기존의 LoginPage 전체를 LoginForm 이라는 이름으로 살짝 바꿉니다.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"signin" | "signup" | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  // 로그인 성공 후 첫 화면으로 이동
  const nextPath = "/";

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setTimeout(() => setCooldownSec((prev) => prev - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownSec]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
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
      const msg = error.message || "로그인에 실패했습니다.";
      if (msg.toLowerCase().includes("email not confirmed")) {
        setNeedsEmailConfirm(true);
        setStatus(
          "이메일 인증이 완료되지 않았습니다. 받은 편지함에서 인증 링크를 누른 뒤 다시 로그인해 주세요.",
        );
      } else {
        setStatus(msg);
      }
      return;
    }
    router.replace(nextPath);
  };

  const signUp = async () => {
    if (loading !== null || cooldownSec > 0) return;
    setStatus(null);
    setNeedsEmailConfirm(false);
    setLoading("signup");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/callback` : undefined,
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
      setStatus("회원가입이 완료되었습니다. 이메일 인증 링크를 확인해 주세요.");
      return;
    }

    router.replace(nextPath);
  };

  const resendConfirmation = async () => {
    if (loading !== null || cooldownSec > 0) return;
    if (!email) {
      setStatus("인증 메일을 재전송하려면 이메일을 입력해 주세요.");
      return;
    }
    setLoading("signup");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/callback` : undefined,
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
    setStatus("인증 메일을 다시 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.");
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Re:PhyT 로그인</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Re:PhyT - 전문가용 하이엔드 차트 시스템
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
              />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={signIn}
              className="h-11 rounded-xl bg-blue-900 text-sm font-medium text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "signin" ? "로그인 중..." : "로그인"}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={loading !== null || cooldownSec > 0}
              className="h-11 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "signup"
                ? "가입 중..."
                : cooldownSec > 0
                  ? `회원가입 대기 (${cooldownSec}s)`
                  : "회원가입"}
            </button>
          </div>

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
                ? "재전송 중..."
                : cooldownSec > 0
                  ? `재전송 대기 (${cooldownSec}s)`
                  : "인증 메일 다시 보내기"}
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}

// 여기서 Suspense 보호막으로 폼 전체를 감싸서 내보냅니다.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
