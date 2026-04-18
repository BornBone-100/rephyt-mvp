"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { getDictionary } from "@/dictionaries/getDictionary";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  dict: Dictionary;
};

type ProfileRow = {
  plan_tier: string | null;
  billing_key: string | null;
};

function planLabel(tier: string | null, s: Dictionary["dashboard"]["settings"]): string {
  const t = (tier ?? "basic").toLowerCase();
  if (t === "pro") return s.planPro;
  if (t === "trial") return s.planTrial;
  if (t === "enterprise") return s.planEnterprise;
  if (t === "canceled") return s.planCanceled;
  return s.planBasic;
}

export function SubscriptionSettings({ dict }: Props) {
  const s = dict.dashboard.settings;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setProfile(null);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("plan_tier, billing_key")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as ProfileRow | null);
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
    if (billingKey) return true;
    return false;
  }, [tier, billingKey]);

  const currentPlanName = planLabel(tier, s);
  const planParts = s.currentPlan.split("{plan}");

  const handleCancelSubscription = async () => {
    if (!userId) return;
    if (!window.confirm(s.cancelConfirm)) return;

    setIsCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const result = (await res.json()) as { success?: boolean; message?: string };

      if (result.success) {
        alert(s.cancelSuccess);
        await load();
        router.refresh();
      } else {
        alert(result.message ?? s.cancelFailed);
      }
    } catch {
      alert(s.cancelError);
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">{s.loading}</div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
      <h3 className="text-lg font-bold text-zinc-900">{s.subscriptionTitle}</h3>
      <p className="mt-2 text-sm text-zinc-600">
        {planParts[0]}
        <span className="font-bold text-blue-950">{currentPlanName}</span>
        {planParts[1] ?? ""}
      </p>

      {canCancel ? (
        <button
          type="button"
          onClick={() => void handleCancelSubscription()}
          disabled={isCanceling}
          className="mt-4 text-sm text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCanceling ? s.canceling : s.cancelButton}
        </button>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">{s.noActiveSubscription}</p>
      )}
    </div>
  );
}
