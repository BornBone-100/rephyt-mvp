import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type LogRequest = {
  userId: string;
  patientId: string;
  activityType: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown> | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<LogRequest>;

    const userId = String(body.userId ?? "").trim();
    const patientId = String(body.patientId ?? "").trim();
    const activityType = String(body.activityType ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : null;

    if (!userId || !patientId || !activityType || !title) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 500 });
    }

    const row = {
      user_id: userId,
      patient_id: patientId,
      activity_type: activityType,
      title,
      description,
      metadata,
    };

    const res = await supabase.from("patient_activities").insert(row as never);
    if (res.error) {
      await supabase.from("user_logs").insert({ ...row, error: res.error.message } as never);
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 },
    );
  }
}

