import { NextResponse } from "next/server";

/**
 * 카드 직접 입력 폼 → 빌링키 발급 스텁 (PCI: PAN/CVC 로깅 금지).
 * 실제 연동 시 나이스페이 빌링 등록 API + profiles.billing_key 저장으로 교체.
 */
export async function handleBillingStubPost(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const cardNo = String(body.cardNo ?? "").replace(/\D/g, "");
    const expYear = String(body.expYear ?? "").trim();
    const expMonth = String(body.expMonth ?? "").trim();
    const idNo = String(body.idNo ?? "").trim();
    const cardPw = String(body.cardPw ?? "").trim();

    if (!cardNo || cardNo.length < 14 || cardNo.length > 16) {
      return NextResponse.json({ success: false, message: "카드 번호를 확인해 주세요." }, { status: 400 });
    }
    if (!expYear || !expMonth || expYear.length !== 2 || expMonth.length !== 2) {
      return NextResponse.json({ success: false, message: "유효기간을 확인해 주세요." }, { status: 400 });
    }
    if (!idNo || !cardPw) {
      return NextResponse.json({ success: false, message: "본인 정보와 카드 비밀번호를 입력해 주세요." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "빌링 등록 서버 로직이 아직 연결되지 않았습니다. 나이스페이 빌링 등록 API 연동 후 profiles.billing_key 저장을 구현해 주세요.",
      },
      { status: 501 },
    );
  } catch {
    return NextResponse.json({ success: false, message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
  }
}
