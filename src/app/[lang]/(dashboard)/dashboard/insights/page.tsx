import InsightsDashboardClient from "./insights-dashboard-client";

export default async function ClinicalInsightsPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";

  return (
    <div className="p-6 md:p-8">
      <InsightsDashboardClient lang={locale} />
    </div>
  );
}
