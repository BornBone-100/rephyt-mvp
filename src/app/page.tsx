import { redirect } from "next/navigation";

export default function RootPage() {
  // 로딩창도 띄우지 않고, 접속하자마자 0.001초 만에 로그인 화면으로 강제 이동시킵니다!
  redirect("/login");
}