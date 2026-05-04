import { redirect } from "next/navigation";

/** `/reset-password` → `[lang]=reset-password` 오매칭 방지 */
export default function ResetPasswordAliasPage() {
  redirect("/ko/reset-password");
}
