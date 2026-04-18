"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";

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
  const [email, setEmail] = useState("—");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata as { full_name?: string } | undefined;
        const name =
          typeof meta?.full_name === "string" && meta.full_name.trim()
            ? meta.full_name.trim()
            : (user.email?.split("@")[0] ?? "—");
        setDisplayName(name);
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
        <p className="mb-2 text-gray-600">
          {s.nameLabel}: {displayName}
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
