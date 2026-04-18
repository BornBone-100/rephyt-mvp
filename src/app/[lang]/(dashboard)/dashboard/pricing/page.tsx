import { redirect } from "next/navigation";

export default async function DashboardPricingRedirectPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  redirect(`/${lang}/pricing`);
}
