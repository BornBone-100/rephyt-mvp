import { createClient } from "@/utils/supabase/client";

export type PatientProgressPoint = {
  date: string; // YYYY-MM-DD
  vas: number; // 0~10
  note?: string;
};

type AssessmentRow = {
  pain_vas_mm?: number | null;
  pain_nrs?: number | null;
};

type SoapProgressRow = {
  created_at?: string | null;
  assessment?: string | null;
  assessments?: AssessmentRow | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function extractVasFromText(text: string | null | undefined): number | null {
  if (!text) return null;

  // 예: "VAS 7/10", "NRS 4", "pain 5"
  const patterns = [
    /(?:VAS|NRS|pain|통증)\s*[:=]?\s*(\d{1,2})(?:\s*\/\s*10)?/i,
    /(\d{1,2})\s*\/\s*10/,
  ];

  for (const re of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return clamp(value, 0, 10);
  }
  return null;
}

export async function getPatientProgress(patientId: string): Promise<PatientProgressPoint[]> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from("soap_notes" as never)
    .select("created_at, assessment, assessments(pain_vas_mm, pain_nrs)" as never)
    .eq("patient_id" as never, patientId)
    .order("created_at" as never, { ascending: true }) as unknown as Promise<{
      data: SoapProgressRow[] | null;
      error: { message: string } | null;
    }>);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const points: PatientProgressPoint[] = [];

  for (const row of rows) {
    const createdAt = row.created_at;
    if (!createdAt) continue;

    let vas: number | null = null;

    if (typeof row.assessments?.pain_nrs === "number") {
      vas = clamp(row.assessments.pain_nrs, 0, 10);
    } else if (typeof row.assessments?.pain_vas_mm === "number") {
      vas = clamp(Math.round(row.assessments.pain_vas_mm / 10), 0, 10);
    } else {
      vas = extractVasFromText(row.assessment);
    }

    if (vas == null) continue;

    points.push({
      date: createdAt.slice(0, 10),
      vas,
      note: row.assessment ?? undefined,
    });
  }

  return points;
}

