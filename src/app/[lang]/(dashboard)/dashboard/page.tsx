import Link from "next/link";
import { getDictionary } from "@/dictionaries/getDictionary";

export default async function DashboardPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  const base = `/${locale}`;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-950">{dict.dashboard.title}</h1>
      <p className="text-gray-600 mt-2">{dict.dashboard.welcome}</p>

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
