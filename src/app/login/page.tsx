import { redirect } from "next/navigation";

/** `/login` 단일 경로는 `[lang]`에 `lang=login`으로 잡혀 404가 나므로, 로케일 경로로 고정한다. */
export default function LoginAliasPage() {
  redirect("/ko/login");
}
