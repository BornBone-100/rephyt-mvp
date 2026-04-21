import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import SOAPExportButton from "@/components/SOAPExportButton";

function sanitizeFileNameSegment(raw: string): string {
  return raw.replace(/[/\\?%*:|"<>]/g, "_").trim() || "chart";
}

function formatChartDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export default async function SoapDetailPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string; id: string }>;
}>) {
  const { lang, id } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const base = `/${locale}`;

  const supabase = await createClient();
  const { data: note, error: noteError } = await supabase
    .from("soap_notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (noteError || !note) {
    notFound();
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", note.patient_id)
    .maybeSingle();

  const patientName = patient?.name?.trim() || (locale === "en" ? "Unknown" : "이름 없음");
  const pdfBaseName = sanitizeFileNameSegment(`RePhyT_Chart_${patientName}`);
  const dateLabel = formatChartDate(note.created_at, locale);

  const copy =
    locale === "en"
      ? {
          back: "← Back to patient",
          title: "Clinical record detail",
          chartTitle: "Re:PhyT Professional Chart",
          date: "Date",
          patient: "Patient",
          joint: "Region",
          vas: "VAS",
          subjective: "Subjective",
          objective: "Objective",
          assessment: "Assessment",
          plan: "Plan",
          footer: "Certified by Re:PhyT AI Clinical System",
        }
      : {
          back: "← 환자 차트로",
          title: "진료 기록 상세",
          chartTitle: "Re:PhyT Professional Chart",
          date: "일시",
          patient: "환자",
          joint: "진단 부위",
          vas: "VAS",
          subjective: "Subjective",
          objective: "Objective",
          assessment: "Assessment",
          plan: "Plan",
          footer: "Certified by Re:PhyT AI Clinical System",
        };

  return (
    <div className="min-h-screen bg-zinc-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`${base}/dashboard/patients/${note.patient_id}`}
          className="mb-6 inline-flex text-sm font-semibold text-blue-950 hover:underline"
        >
          {copy.back}
        </Link>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">{copy.title}</h1>
          <SOAPExportButton
            fileName={pdfBaseName}
            payload={{
              patient: {
                patientId: note.patient_id,
                name: patientName,
                visitDate: note.created_at,
              },
              soap: {
                subjective: note.subjective?.trim() || "",
                objective: note.objective?.trim() || "",
                assessment: note.assessment?.trim() || "",
                plan: note.plan?.trim() || "",
              },
              title: "Re:PhyT Pro Global Chart",
            }}
          />
        </div>

        <div
          id="soap-paper"
          className="min-h-[297mm] rounded-none bg-white p-8 shadow-lg sm:p-12 md:rounded-sm"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-blue-950 pb-4 sm:flex-row sm:items-start">
            <h2 className="text-xl font-black text-blue-950">{copy.chartTitle}</h2>
            <div className="text-right text-sm text-zinc-500">
              <p>
                {copy.date}: {dateLabel}
              </p>
              <p>
                {copy.patient}: {patientName}
              </p>
              {note.joint ? (
                <p>
                  {copy.joint}: {note.joint.toUpperCase()}
                </p>
              ) : null}
              {note.pain_scale != null ? (
                <p>
                  {copy.vas}: {note.pain_scale}/10
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="mb-3 border-l-4 border-blue-950 pl-3 text-lg font-bold text-zinc-900">
                {copy.subjective}
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-700">
                {note.subjective?.trim() || "—"}
              </p>
            </section>
            <section>
              <h3 className="mb-3 border-l-4 border-blue-950 pl-3 text-lg font-bold text-zinc-900">
                {copy.objective}
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-700">
                {note.objective?.trim() || "—"}
              </p>
            </section>
            <section>
              <h3 className="mb-3 border-l-4 border-blue-950 pl-3 text-lg font-bold text-zinc-900">
                {copy.assessment}
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-700">
                {note.assessment?.trim() || "—"}
              </p>
            </section>
            <section>
              <h3 className="mb-3 border-l-4 border-blue-950 pl-3 text-lg font-bold text-zinc-900">
                {copy.plan}
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-700">
                {note.plan?.trim() || "—"}
              </p>
            </section>
          </div>

          <div className="mt-20 border-t pt-8 text-center">
            <p className="text-sm text-zinc-400">{copy.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
