import { createClient } from "@/utils/supabase/server";
import ClinicalLibraryClient from "./clinical-library-client";

type LibraryRow = {
  id: string;
  category: string | null;
  title: string | null;
  content_md: string | null;
  image_url: string | null;
  tags: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export default async function ClinicalLibraryPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: LibraryRow[] = [];

  const { data, error } = await (supabase as any)
    .from("clinical_library")
    .select("id, category, title, content_md, image_url, tags, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (!error && Array.isArray(data)) {
    items = data as LibraryRow[];
  }

  return (
    <div className="p-4 pb-8 md:p-8">
      <ClinicalLibraryClient lang={locale} userId={user?.id ?? null} items={items} />
    </div>
  );
}
