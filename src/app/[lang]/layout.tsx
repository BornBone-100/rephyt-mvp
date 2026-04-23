import Link from "next/link";
import { notFound } from "next/navigation";
import { SonnerToaster } from "@/components/SonnerToaster";

const LOCALES = ["ko", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!LOCALES.includes(lang as AppLocale)) {
    notFound();
  }

  const base = `/${lang}`;

  return (
    <>
      <SonnerToaster />
      <main className="flex-grow">{children}</main>

      <footer className="bg-zinc-50 border-t border-zinc-200 py-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-3">
              <div className="text-xl font-black text-blue-950 tracking-tighter">Re:PhyT AI</div>
              <p className="text-sm text-zinc-500 font-medium">
                데이터로 증명하는 정교한 물리치료 차팅 솔루션
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
              <div className="flex gap-2">
                <span className="text-zinc-400 text-xs font-bold w-20">상호명</span>
                <span className="text-zinc-600 text-xs font-medium">Re:PhyT (리피트)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400 text-xs font-bold w-20">대표자명</span>
                <span className="text-zinc-600 text-xs font-medium">김성준</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400 text-xs font-bold w-20">사업자번호</span>
                <span className="text-zinc-600 text-xs font-medium font-mono text-blue-600">494-37-01613</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-400 text-xs font-bold w-20">문의번호</span>
                <span className="text-zinc-600 text-xs font-medium font-mono">010-5900-6834</span>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <span className="text-zinc-400 text-xs font-bold w-20">주소</span>
                <span className="text-zinc-600 text-xs font-medium">
                  경상남도 창원시 마산합포구 현동 9길 13, 103동 503호
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">
              © 2026 Re:PhyT AI Labs. All rights reserved.
            </p>
            <div className="flex gap-6 text-[11px] font-bold text-zinc-400">
              <Link href={`${base}/pricing`} className="hover:text-zinc-900 transition">
                서비스 요금표
              </Link>
              <Link href={`${base}/terms`} className="hover:text-zinc-900 transition">
                이용약관
              </Link>
              <Link
                href={`${base}/terms?tab=privacy`}
                className="hover:text-zinc-900 transition underline underline-offset-4"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
