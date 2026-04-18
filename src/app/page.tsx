import { redirect } from "next/navigation";

/** 루트 `/` → 기본 로케일 로그인 (필요 시 middleware로 언어 감지 가능) */
export default function RootPage() {
  redirect("/ko/login");
}
