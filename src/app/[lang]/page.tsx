import { redirect } from "next/navigation";

export default async function LangRootPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  redirect(`/${lang}/login`);
}
