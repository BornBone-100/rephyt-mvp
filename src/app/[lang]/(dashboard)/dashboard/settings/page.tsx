import { getDictionary } from "@/dictionaries/getDictionary";
import { SettingsPageClient } from "./settings-page-client";

export default async function SettingsPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <SettingsPageClient dict={dict} />;
}
