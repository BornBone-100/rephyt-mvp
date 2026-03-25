import { redirect } from "next/navigation";

export default function RootPage() {
  // 주소창에 그냥 접속하면 바로 /login으로 보내버립니다.
  redirect("/login");
}
