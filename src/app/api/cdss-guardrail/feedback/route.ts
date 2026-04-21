import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FeedbackType = "true_positive" | "false_positive" | "false_negative";

type FeedbackBody = {
  feedbackType?: FeedbackType;
  detectedConditionId?: string;
  matchedAliases?: string[];
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAliasDelta(type: FeedbackType) {
  if (type === "true_positive") return 0.05;
  if (type === "false_positive") return -0.1;
  return -0.05;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackBody;
    const feedbackType = body.feedbackType;
    const detectedConditionId = (body.detectedConditionId ?? "unknown").trim();
    const matchedAliases = Array.isArray(body.matchedAliases) ? body.matchedAliases : [];

    if (!feedbackType || !["true_positive", "false_positive", "false_negative"].includes(feedbackType)) {
      return NextResponse.json({ error: "Invalid feedbackType" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true, stored: false });
    }

    await supabase.from("cdss_guardrail_feedback").insert({
      feedback_type: feedbackType,
      detected_condition_id: detectedConditionId,
      matched_aliases: matchedAliases,
    });

    const delta = getAliasDelta(feedbackType);
    for (const alias of matchedAliases) {
      const normalized = alias.toLowerCase();
      const { data: existing } = await supabase
        .from("cdss_guardrail_alias_tuning")
        .select("alias, weight_delta")
        .eq("alias", normalized)
        .maybeSingle();
      const current = typeof existing?.weight_delta === "number" ? existing.weight_delta : 0;
      const next = Math.max(-0.75, Math.min(1.5, current + delta));
      await supabase.from("cdss_guardrail_alias_tuning").upsert({
        alias: normalized,
        weight_delta: next,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("cdss feedback route error:", error);
    return NextResponse.json({ error: "Feedback processing failed" }, { status: 500 });
  }
}
