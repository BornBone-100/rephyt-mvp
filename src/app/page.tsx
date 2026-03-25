import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증이 없으면 로그인으로 보냅니다.
  if (!user) redirect("/login");

  // 인증이 있으면 기존 대시보드 UI를 보여줍니다.
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        대시보드
      </h1>
      <p className="mt-2 text-zinc-600">
        여기서 환자 목록, SOAP 생성 히스토리, 템플릿 등을 연결하면 됩니다.
      </p>
    </main>
  );
}
