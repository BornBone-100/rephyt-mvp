"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

function ResetPasswordForm({ dict }: Props) {
  const a = dict.auth;
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string;
  const base = `/${lang}`;
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = !loading && password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8 || confirmPassword.length < 8 || password !== confirmPassword) {
      setMessage(a.resetPasswordMismatch);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(`${a.resetPasswordErrorPrefix}${error.message}`);
      return;
    }

    setMessage(a.resetPasswordSuccess);
    setPassword("");
    setConfirmPassword("");
    window.setTimeout(() => {
      router.replace(`${base}/login`);
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{a.resetTitle}</h1>
          <p className="mt-2 text-sm text-zinc-600">{a.resetSubtitle}</p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">{a.resetPasswordLabel}</span>
              <input
                type="password"
                value={password}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={a.resetPasswordPlaceholder}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">{a.resetPasswordConfirmLabel}</span>
              <input
                type="password"
                value={confirmPassword}
                minLength={8}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={a.resetPasswordConfirmPlaceholder}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-900/40 focus:ring-2 focus:ring-blue-900/10"
                required
              />
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-11 w-full rounded-xl bg-blue-900 text-sm font-medium text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? a.resetPasswordLoading : a.resetPasswordButton}
            </button>
          </form>

          {message ? (
            <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function ResetPasswordPageClient({ dict }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">{dict.auth.suspenseLoading}</div>
      }
    >
      <ResetPasswordForm dict={dict} />
    </Suspense>
  );
}
