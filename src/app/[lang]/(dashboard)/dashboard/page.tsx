import Link from "next/link";
import { getDictionary } from "@/dictionaries/getDictionary";

export default async function DashboardPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ welcomeName?: string }>;
}>) {
  const { lang } = await params;
  const { welcomeName } = await searchParams;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  const base = `/${locale}`;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-950">{dict.dashboard.title}</h1>
      <p className="text-gray-600 mt-2">{dict.dashboard.welcome}</p>
      {welcomeName ? (
        <p className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
          {welcomeName} 원장님, 환영합니다! 이제 정직한 데이터의 힘을 경험해 보세요.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href={`${base}/dashboard/soap/new`}
          className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900"
        >
          {dict.dashboard.newChart}
        </Link>
        <Link
          href={`${base}/dashboard/patients`}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
        >
          {dict.dashboard.patientList}
        </Link>
        <Link
          href={`${base}/dashboard/community`}
          className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-900 transition hover:bg-green-100"
        >
          {dict.dashboard.communityNav}
        </Link>
      </div>
    </div>
  );
}
