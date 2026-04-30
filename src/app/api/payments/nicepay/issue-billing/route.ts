import { handleBillingStubPost } from "@/lib/nicepay/handle-billing-stub-post";

/** @see handleBillingStubPost — 빌링키 발급 연동 시 여기 또는 공통 핸들러에서 구현 */
export async function POST(request: Request) {
  return handleBillingStubPost(request);
}
