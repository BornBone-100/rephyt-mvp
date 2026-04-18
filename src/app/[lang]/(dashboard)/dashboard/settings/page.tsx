import { getDictionary } from "@/dictionaries/getDictionary";
import { SubscriptionSettings } from "@/components/SubscriptionSettings";

export default async function SettingsPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold text-blue-950">{dict.dashboard.settings.pageTitle}</h1>
      <SubscriptionSettings dict={dict} />
    </div>
  );
}
