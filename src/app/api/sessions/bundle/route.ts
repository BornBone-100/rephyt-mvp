// @ts-ignore
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessionBundleInputSchema } from "@/features/sessions/schema";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = sessionBundleInputSchema.parse(json);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("upsert_session_bundle", {
      p_patient_id: input.patientId,

      p_started_at: input.session?.startedAt,
      p_ended_at: input.session?.endedAt ?? null,
      p_location: input.session?.location ?? null,
      p_status: input.session?.status ?? null,
      p_session_no: input.session?.sessionNo ?? null,

      p_subjective: input.soap?.subjective ?? null,
      p_adl_limitations: input.soap?.adlLimitations ?? null,
      p_assessment: input.soap?.assessment ?? null,
      p_plan: input.soap?.plan ?? null,
      p_ai_generated_note: input.soap?.aiGeneratedNote ?? null,
      p_ai_model: input.soap?.aiModel ?? null,
      p_ai_prompt_version: input.soap?.aiPromptVersion ?? null,
      p_is_final: input.soap?.isFinal ?? false,

      p_create_assessment: input.assessment?.enabled ?? true,
      p_assessed_at: input.assessment?.assessedAt,
      p_rom: input.assessment?.rom ?? null,
      p_mmt: input.assessment?.mmt ?? null,
      p_special_tests: input.assessment?.specialTests ?? null,
      p_pain_vas_mm: input.assessment?.painVasMm ?? null,
      p_pain_nrs: input.assessment?.painNrs ?? null,

      p_breathing_score: input.assessment?.breathingScore ?? null,
      p_breathing_notes: input.assessment?.breathingNotes ?? null,
      p_centering_score: input.assessment?.centeringScore ?? null,
      p_centering_notes: input.assessment?.centeringNotes ?? null,
      p_ribcage_placement_score: input.assessment?.ribcagePlacementScore ?? null,
      p_ribcage_placement_notes: input.assessment?.ribcagePlacementNotes ?? null,
      p_shoulder_girdle_org_score:
        input.assessment?.shoulderGirdleOrgScore ?? null,
      p_shoulder_girdle_org_notes:
        input.assessment?.shoulderGirdleOrgNotes ?? null,
      p_head_neck_placement_score:
        input.assessment?.headNeckPlacementScore ?? null,
      p_head_neck_placement_notes:
        input.assessment?.headNeckPlacementNotes ?? null,

      p_extra: (input.assessment?.extra ?? {}) as unknown,
    });

    if (error) {
      return NextResponse.json(
        { error: "RPC_FAILED", message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, result: data?.[0] ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "INVALID_REQUEST", message },
      { status: 400 },
    );
  }
}

