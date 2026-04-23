/**
 * AI 임상 스크리닝 분석 엔드포인트 (Freemium 게이트 후 CDSS 가드레일과 동일 처리)
 */
import { POST as cdssGuardrailPost } from "@/app/api/cdss-guardrail/route";

export async function POST(req: Request) {
  return cdssGuardrailPost(req);
}
