"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
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

  const nextPath = `/${lang}/dashboard/patients`;

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

    router.replace(nextPath);
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

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{a.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{a.subtitle}</p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">{a.emailLabel}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={a.emailPlaceholder}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">{a.passwordLabel}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={a.passwordPlaceholder}
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
              {loading === "signin" ? a.loginLoading : a.loginBtn}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={loading !== null || cooldownSec > 0}
              className="h-11 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "signup"
                ? a.signupLoading
                : cooldownSec > 0
                  ? a.signupCooldown.replace("{seconds}", String(cooldownSec))
                  : a.signupBtn}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void sendResetPasswordEmail()}
            disabled={resetLoading || loading !== null}
            className="mt-3 text-sm font-medium text-blue-900 underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetLoading ? a.resetSending : a.forgotPassword}
          </button>

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
