"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      
      // 1. 병원 문(앱)을 열고 들어온 사람의 신분증(세션)을 확인합니다.
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 2. 이미 로그인한 원장님이라면? -> 귀찮게 묻지 않고 바로 환자 목록으로 튕겨줍니다! (replace 사용)
        router.replace("/dashboard/patients");
      } else {
        // 3. 로그인이 안 된 외부인이라면? -> 가차 없이 로그인 화면으로 강제 이동!
        router.replace("/login");
      }
    };

    checkUser();
  }, [router]);

  // 안내 데스크가 0.1초 만에 판단을 내리는 동안 잠깐 보여줄 로딩 화면입니다.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 mb-4"></div>
      <div className="text-sm font-bold text-zinc-500 animate-pulse">
        보안 인증을 확인하는 중입니다... (로그인 화면으로 이동합니다)
      </div>
    </div>
  );
}