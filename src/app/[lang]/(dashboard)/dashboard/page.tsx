import Link from "next/link";
import LockedFeatureCard from "@/components/dashboard/LockedFeatureCard";

function ActiveFeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <h3 className="mb-2 text-xl font-black tracking-tight text-slate-900">{title}</h3>
      <p className="text-sm font-medium text-slate-500">{description}</p>
      <div className="mt-4 h-32 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
        <div className="flex h-full items-end justify-between">
          <span className="text-xs font-bold text-indigo-700">ACTIVE</span>
          <span className="text-xs font-semibold text-indigo-500 group-hover:text-indigo-700">열기</span>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";

  const copy =
    locale === "en"
      ? {
          title: "Re:PhyT Dashboard",
          subtitle: "Daily report driven by precise data",
          activeTitle: "Patient Data Analysis",
          activeDescription: "Manage SOAP history and imaging workflows",
          lockedTitle: "Re:PhyT AI - Pre Screening",
          lockedSubtitle: "Global Body-Part Engine (v1.0)",
          lockedMessage:
            "Re:PhyT AI engine enhancement is in progress.\nA more precise analysis experience is coming soon.",
        }
      : {
          title: "Re:PhyT Dashboard",
          subtitle: "정교한 데이터로 시작하는 일일 리포트",
          activeTitle: "환자 데이터 분석",
          activeDescription: "기존 SOAP 기록 및 이미지 관리",
          lockedTitle: "Re:PhyT AI - 사전 스크리닝",
          lockedSubtitle: "Global Body-Part Engine (v1.0)",
          lockedMessage:
            "현재 Re:PhyT AI 엔진 고도화 작업 중입니다.\n더 정교한 분석을 위해 곧 찾아뵙겠습니다!",
        };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <header className="space-y-1">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">
          Re:PhyT <span className="text-indigo-600">Dashboard</span>
        </h1>
        <p className="font-bold text-slate-500">{copy.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ActiveFeatureCard
          title={copy.activeTitle}
          description={copy.activeDescription}
          href={`/${locale}/dashboard/patients`}
        />
        <LockedFeatureCard title={copy.lockedTitle} subtitle={copy.lockedSubtitle} message={copy.lockedMessage} />
      </div>
    </div>
  );
}
