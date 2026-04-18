import { getDictionary } from "@/dictionaries/getDictionary";
import { LoginPageClient } from "./login-page-client";

export default async function LoginPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <LoginPageClient dict={dict} />;
}
