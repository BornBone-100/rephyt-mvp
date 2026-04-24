import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ welcomeName?: string }>;
}>) {
  const { lang } = await params;
  const { welcomeName } = await searchParams;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const welcomeQuery = welcomeName ? `?welcomeName=${encodeURIComponent(welcomeName)}` : "";
  redirect(`/${locale}/dashboard/patients${welcomeQuery}`);
}
