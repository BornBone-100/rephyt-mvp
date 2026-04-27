import Link from "next/link";
import { getDictionary } from "@/dictionaries/getDictionary";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { PendingSignupProfileSync } from "@/components/dashboard/pending-signup-profile-sync";

export default async function DashboardSectionLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <DashboardSidebar
        base={base}
        labels={{
          core: "CORE",
          patients: dict.dashboard.patientList,
          newSoap: dict.dashboard.newChart,
          insights: "INSIGHTS",
          analytics: locale === "en" ? "Clinical Analytics" : "임상 분석 통계",
          library: locale === "en" ? "Clinical Library" : "임상 자료실",
          communityGroup: "COMMUNITY",
          community: dict.dashboard.communityNav,
          activity: locale === "en" ? "My Activity" : "내 활동 내역",
          system: "SYSTEM",
          settings: dict.dashboard.settingsNav,
          help: locale === "en" ? "Help Center" : "지원 센터",
        }}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <PendingSignupProfileSync />
        <div className="flex-1">{children}</div>

        <div className="mt-auto border-t border-zinc-200 bg-zinc-50/80 px-6 py-4 backdrop-blur-sm">
          <Link
            href={`${base}/dashboard/settings`}
            className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-blue-950"
          >
            <span aria-hidden>⚙️</span>
            {dict.dashboard.settingsFooterLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
