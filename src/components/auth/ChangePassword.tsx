"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Copy = {
  securityTitle: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  passwordPlaceholder: string;
  passwordConfirmPlaceholder: string;
  passwordRuleHint: string;
  passwordMismatch: string;
  passwordUpdateButton: string;
  passwordUpdating: string;
  passwordUpdated: string;
  passwordUpdateFailedPrefix: string;
};

type Props = {
  copy: Copy;
};

export default function ChangePassword({ copy }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const isMinLength = password.length >= 8;
  const isMatch = password !== "" && password === confirmPassword;
  const canSubmit = isMinLength && isMatch && !loading;

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!isMinLength || !isMatch) {
      alert(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(`${copy.passwordUpdateFailedPrefix}${error.message}`);
    } else {
      setMessage(copy.passwordUpdated);
      setPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-blue-950">{copy.securityTitle}</h3>
      <form onSubmit={(e) => void handleUpdatePassword(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">{copy.newPasswordLabel}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            placeholder={copy.passwordPlaceholder}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">{copy.confirmPasswordLabel}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            placeholder={copy.passwordConfirmPlaceholder}
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl bg-blue-950 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {loading ? copy.passwordUpdating : copy.passwordUpdateButton}
        </button>
        {!isMatch && confirmPassword !== "" ? (
          <p className="text-xs font-medium text-rose-500">{copy.passwordMismatch}</p>
        ) : (
          <p className="text-xs text-zinc-400">{copy.passwordRuleHint}</p>
        )}
        {message ? <p className="mt-1 text-center text-sm font-medium text-emerald-600">{message}</p> : null}
      </form>
    </div>
  );
}
