import { getDictionary } from "@/dictionaries/getDictionary";
import Script from "next/script";
import { PricingClient } from "./pricing-client";

export default async function PricingPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return (
    <>
      <Script src="https://web.nicepay.co.kr/v3/v3.js" strategy="beforeInteractive" />
      <PricingClient dict={dict} lang={locale} />
    </>
  );
}
