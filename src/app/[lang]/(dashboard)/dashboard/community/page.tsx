import { getDictionary } from "@/dictionaries/getDictionary";
import { CommunityFeedClient } from "./community-feed-client";

export default async function CommunityFeedPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return (
    <div className="p-4 pb-8 md:p-8">
      <h1 className="mb-4 text-2xl font-bold text-blue-950">{dict.dashboard.community.pageTitle}</h1>
      <CommunityFeedClient dict={dict} lang={locale} />
    </div>
  );
}
