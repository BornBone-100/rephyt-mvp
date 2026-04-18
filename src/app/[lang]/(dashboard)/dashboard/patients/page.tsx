import { getDictionary } from "@/dictionaries/getDictionary";
import { PatientsListClient } from "./patients-list-client";

export default async function PatientsListPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <PatientsListClient dict={dict} />;
}
