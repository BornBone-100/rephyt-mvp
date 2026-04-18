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

  return <SoapNewPageClient dict={dict} />;
}
