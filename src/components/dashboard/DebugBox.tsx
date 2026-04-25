"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { rephytProfileSyncFromRow } from "@/lib/rephyt/rephyt-profile-sync";

type JsonRecord = Record<string, unknown>;

function asRecord(v: unknown): JsonRecord | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as JsonRecord;
  return null;
}

function buildUserSyncSnapshot(profile: JsonRecord | null) {
  const p = profile;
  const meta = asRecord(p?.metadata);
  const sync = rephytProfileSyncFromRow(p);
  return {
    is_master: sync.isMaster ? "YES" : "NO",
    current_plan: sync.currentPlan,
    is_active: sync.isActive,
    plan_tier: p?.plan_tier ?? "—",
    plan_type: p?.plan_type ?? "—",
    subscription_plan: p?.subscription_plan ?? meta?.subscription_plan ?? "—",
    years_of_experience: sync.yearsOfExperience || 0,
    save_count: p?.monthly_save_count ?? meta?.monthly_save_count ?? "—",
    last_sync: p?.updated_at ?? p?.last_synced_at ?? "—",
  };
}

function buildDataStructureCheck(latest: JsonRecord | null) {
  if (!latest) {
    return {
      check_column_1: "N/A (no row)",
      check_column_2: "N/A (no row)",
      note: "community_posts may be empty or RLS may hide rows.",
    };
  }
  const content = asRecord(latest.content);
  const evalByColumn = latest.evaluation_area != null && String(latest.evaluation_area).length > 0;
  const evalInContent = Boolean(
    content &&
      (("evaluation_area" in content && content.evaluation_area != null) ||
        ("diagnosis_area" in content && content.diagnosis_area != null)),
  );
  const check1 = evalByColumn
    ? "OK (evaluation_area column)"
    : evalInContent
      ? "OK (evaluation / diagnosis in content JSON)"
      : "MISSING";

  const careByColumn = latest.care_guide != null && String(latest.care_guide).length > 0;
  const careInContent = Boolean(content && "care_guide" in content && content.care_guide != null);
  const check2 = careByColumn
    ? "OK (care_guide column)"
    : careInContent
      ? "OK (care_guide in content JSON)"
      : "MISSING";

  return {
    check_column_1: check1,
    check_column_2: check2,
    clinical_category: latest.clinical_category ?? "—",
    image_url: latest.image_url != null ? "set" : "—",
    report_id: latest.report_id ?? "—",
    raw_data_check: latest,
  };
}

export function RePhyTDebugBox({ userId }: { userId: string }) {
  const [syncData, setSyncData] = useState<{
    profile: JsonRecord | null;
    latestPost: JsonRecord | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setProfileError(null);
    setPostError(null);
    setSyncData(null);

    const supabase = createClient();

    const { data: profile, error: pError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (pError) setProfileError(pError.message);
    const { data: post, error: postErr } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (postErr) setPostError(postErr.message);

    if (pError && postErr) {
      setError(pError.message || postErr.message || "데이터를 찾을 수 없음");
      return;
    }

    setSyncData({
      profile: profile as JsonRecord | null,
      latestPost: post as JsonRecord | null,
    });
  }, [userId]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="mt-10 rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-6 font-mono text-[10px] shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="font-bold uppercase tracking-widest text-zinc-400">Re:PhyT Sync Inspector v1.0</span>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
        >
          Refresh
        </button>
      </div>

      {profileError ? (
        <div className="mb-2 rounded border border-amber-900/50 bg-amber-950/20 p-2 text-amber-400">
          [profiles] {profileError}
        </div>
      ) : null}
      {postError ? (
        <div className="mb-2 rounded border border-amber-900/50 bg-amber-950/20 p-2 text-amber-400">
          [community_posts] {postError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded bg-red-900/20 p-2 text-red-400">⚠️ Error: {error}</div>
      ) : syncData ? (
        <div className="grid grid-cols-1 gap-6 text-zinc-300 md:grid-cols-2">
          <section>
            <h5 className="mb-2 font-black text-indigo-400 underline">[USER_SYNC]</h5>
            <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              {JSON.stringify(buildUserSyncSnapshot(syncData.profile), null, 2)}
            </pre>
            {syncData.profile ? (
              <p className="mt-1 text-[9px] text-zinc-500">Full profile row (types may lag DB):</p>
            ) : null}
            {syncData.profile ? (
              <pre className="mt-1 max-h-40 overflow-auto rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-2 text-[9px] text-zinc-500">
                {JSON.stringify(syncData.profile, null, 2)}
              </pre>
            ) : null}
          </section>

          <section>
            <h5 className="mb-2 font-black text-indigo-400 underline">[DATA_STRUCTURE]</h5>
            <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              {JSON.stringify(buildDataStructureCheck(syncData.latestPost), null, 2)}
            </pre>
          </section>
        </div>
      ) : (
        <div className="px-2 italic text-zinc-600">데이터를 정직하게 불러오는 중...</div>
      )}

      <div className="mt-4 border-t border-zinc-800 pt-2 text-[9px] italic text-zinc-500">
        &quot;Data is honest. If it&apos;s MISSING, check your SQL columns and generated types
        (src/types/supabase-generated.ts).&quot;
      </div>
    </div>
  );
}
