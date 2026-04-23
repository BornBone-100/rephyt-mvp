"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";
import ChangePassword from "@/components/auth/ChangePassword";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type ProfileRow = {
  plan_tier: string | null;
  billing_key: string | null;
  next_billing_date: string | null;
};

function planLabel(tier: string | null, s: Dictionary["dashboard"]["settings"]): string {
  const t = (tier ?? "basic").toLowerCase();
  if (t === "pro") return s.planPro;
  if (t === "trial") return s.planTrial;
  if (t === "enterprise") return s.planEnterprise;
  if (t === "canceled") return s.planCanceled;
  return s.planBasic;
}

export function SettingsPageClient({ dict }: Props) {
  const s = dict.dashboard.settings;
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  const base = `/${lang}`;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("—");
  const [editableName, setEditableName] = useState("");
  const [email, setEmail] = useState("—");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
        const name =
          typeof meta?.full_name === "string" && meta.full_name.trim()
            ? meta.full_name.trim()
            : typeof meta?.name === "string" && meta.name.trim()
              ? meta.name.trim()
            : (user.email?.split("@")[0] ?? "—");
        setDisplayName(name);
        setEditableName(name);
        setEmail(user.email ?? "—");

        const { data } = await supabase
          .from("profiles")
          .select("plan_tier, billing_key, next_billing_date")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(data as ProfileRow | null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const tier = profile?.plan_tier ?? null;
  const billingKey = profile?.billing_key ?? null;

  const canCancel = useMemo(() => {
    const t = (tier ?? "basic").toLowerCase();
    if (t === "canceled") return false;
    if (["trial", "pro", "enterprise"].includes(t)) return true;
    return !!billingKey;
  }, [tier, billingKey]);

  const planLine = s.planInUse.replace("{plan}", planLabel(tier, s));

  const nextBillingDisplay = useMemo(() => {
    const raw = profile?.next_billing_date;
    if (!raw) return s.nextBillingNone;
    const d = new Date(raw + (raw.includes("T") ? "" : "T00:00:00"));
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile?.next_billing_date, lang, s.nextBillingNone]);

  const handleCancel = async () => {
    if (!window.confirm(s.cancelConfirmPro)) return;

    setIsCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const result = (await res.json()) as { success?: boolean; message?: string };

      if (res.ok && result.success) {
        alert(s.cancelSuccessFree);
        router.push(`${base}/dashboard`);
        router.refresh();
        await load();
      } else {
        alert(`${s.alertErrorPrefix}${result.message ?? res.statusText}`);
      }
    } catch {
      alert(s.serverCommError);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSaveName = async () => {
    const nextName = editableName.trim();
    if (!nextName) {
      alert(lang === "en" ? "Please enter your name." : "이름을 입력해 주세요.");
      return;
    }
    setIsSavingName(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert(lang === "en" ? "Please log in again." : "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      const authRes = await supabase.auth.updateUser({
        data: {
          full_name: nextName,
          name: nextName,
        },
      });
      if (authRes.error) {
        alert(`${s.alertErrorPrefix}${authRes.error.message}`);
        return;
      }

      const { error: profileError } = await (supabase as any).from("profiles").upsert(
        {
          id: user.id,
          name: nextName,
          metadata: { name: nextName },
        } as any,
        { onConflict: "id" },
      );
      if (profileError) {
        alert(`${s.alertErrorPrefix}${profileError.message}`);
        return;
      }

      setDisplayName(nextName);
      alert(lang === "en" ? "Name updated successfully." : "이름이 성공적으로 변경되었습니다.");
    } catch {
      alert(s.serverCommError);
    } finally {
      setIsSavingName(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-zinc-500">{s.loading}</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-2xl font-bold text-blue-950">{s.accountHeading}</h1>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-900">
          {s.profileHeading}
        </h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-zinc-700">{s.nameLabel}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder={lang === "en" ? "Enter your name" : "이름을 입력하세요"}
            />
            <button
              type="button"
              onClick={() => void handleSaveName()}
              disabled={isSavingName}
              className="h-10 shrink-0 rounded-lg bg-blue-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingName ? (lang === "en" ? "Saving..." : "저장 중...") : (lang === "en" ? "Save" : "이름 저장")}
            </button>
          </div>
        </div>
        <p className="mb-2 text-xs text-zinc-500">
          {lang === "en" ? `Current display name: ${displayName}` : `현재 표시 이름: ${displayName}`}
        </p>
        <p className="text-gray-600">
          {s.emailLabel}: {email}
        </p>
      </div>

      <div className="mb-12 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 border-b border-zinc-100 pb-2 text-lg font-semibold text-zinc-900">
          {s.subscriptionTitle}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-blue-950">{planLine}</p>
            <p className="mt-1 text-sm text-gray-500">
              {s.nextBillingLabel}: {nextBillingDisplay}
            </p>
          </div>
          <Link
            href={`${base}/pricing`}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-900"
          >
            {s.changePaymentButton}
          </Link>
        </div>
      </div>

      <div className="mb-12 rounded-lg border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm">
        <p className="mb-4 text-sm text-zinc-500">{s.securityDescription}</p>
        <ChangePassword
          copy={{
            securityTitle: s.securityTitle,
            newPasswordLabel: s.newPasswordLabel,
            confirmPasswordLabel: s.confirmPasswordLabel,
            passwordPlaceholder: s.passwordPlaceholder,
            passwordConfirmPlaceholder: s.passwordConfirmPlaceholder,
            passwordRuleHint: s.passwordRuleHint,
            passwordMismatch: s.passwordMismatch,
            passwordUpdateButton: s.passwordUpdateButton,
            passwordUpdating: s.passwordUpdating,
            passwordUpdated: s.passwordUpdated,
            passwordUpdateFailedPrefix: s.passwordUpdateFailedPrefix,
          }}
        />
      </div>

      <div className="mt-16 border-t border-gray-200 pt-8">
        <h3 className="mb-2 font-bold text-red-500">{s.dangerTitle}</h3>
        <p className="mb-4 text-sm text-gray-500">{s.dangerDescription}</p>
        {canCancel ? (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={isCanceling}
            className="text-sm text-gray-400 underline transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCanceling ? s.processingShort : s.unsubscribeText}
          </button>
        ) : (
          <p className="text-sm text-zinc-400">{s.noActiveSubscription}</p>
        )}
      </div>
    </div>
  );
}
