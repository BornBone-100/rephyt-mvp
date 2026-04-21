import { getDictionary } from "@/dictionaries/getDictionary";
import { PricingClient } from "./pricing-client";

export default async function PricingPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <PricingClient dict={dict} lang={locale} />;
}
