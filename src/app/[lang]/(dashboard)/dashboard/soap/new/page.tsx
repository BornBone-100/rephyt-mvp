import { Suspense } from "react";
import { getDictionary } from "@/dictionaries/getDictionary";
import { SoapNewPageClient } from "./soap-new-page-client";

export default async function AdvancedSoapPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center font-bold text-slate-500">로딩 중…</div>}>
      <SoapNewPageClient dict={dict} locale={locale} />
    </Suspense>
  );
}
