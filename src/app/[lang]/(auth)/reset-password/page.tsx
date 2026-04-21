import { getDictionary } from "@/dictionaries/getDictionary";
import { ResetPasswordPageClient } from "./reset-password-page-client";

export default async function ResetPasswordPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <ResetPasswordPageClient dict={dict} />;
}
