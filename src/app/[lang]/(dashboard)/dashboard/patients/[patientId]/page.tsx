import { getDictionary } from "@/dictionaries/getDictionary";
import { PatientDetailClient } from "./patient-detail-client";

export default async function PatientDetailPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);

  return <PatientDetailClient dict={dict} />;
}
