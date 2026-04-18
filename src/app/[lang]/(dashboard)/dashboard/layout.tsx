import Link from "next/link";
import { getDictionary } from "@/dictionaries/getDictionary";

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
    <div className="flex min-h-screen flex-col bg-zinc-50">
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
  );
}
