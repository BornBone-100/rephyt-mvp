import { NextRequest, NextResponse } from "next/server";
import { getDicomPreset, DICOM_VIEW_PRESETS } from "@/lib/dicom/view-presets";

/**
 * GET — 정규화된 DICOM 슬라이스 PNG/JPEG 바이너리를 내려주는 진입점 (실무에서는 pydicom 등 연동).
 *
 * 쿼리: slice (0-based), mode (DICOM_VIEW_PRESETS 키), name (표시용 파일명, 선택)
 *
 * 현재: 서버리스에서 업로드 세션 없이 동작하는 **SVG 플레이스홀더**를 반환합니다.
 * 실제 픽셀은 `DICOM_RENDER_SERVICE_URL` 로 프록시하거나 Python 마이크로서비스에서 image/png 로 응답하도록 교체하세요.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sliceRaw = searchParams.get("slice");
  const slice = Math.max(0, parseInt(sliceRaw ?? "0", 10) || 0);
  const modeKey = searchParams.get("mode") ?? "LUMBAR_SOFT";
  const fileName = searchParams.get("name") ?? "";

  const upstream = process.env.DICOM_RENDER_SERVICE_URL?.trim();
  if (upstream) {
    const u = new URL(upstream);
    u.searchParams.set("slice", String(slice));
    u.searchParams.set("mode", modeKey);
    if (fileName) u.searchParams.set("name", fileName);
    try {
      const r = await fetch(u.toString(), { method: "GET" });
      const buf = await r.arrayBuffer();
      const ct = r.headers.get("content-type") ?? "image/png";
      return new NextResponse(buf, {
        status: r.ok ? 200 : 502,
        headers: {
          "Content-Type": ct,
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("[dicom/render] upstream", e);
      return NextResponse.json({ error: "dicom_upstream_failed" }, { status: 502 });
    }
  }

  const preset = getDicomPreset(modeKey) ?? DICOM_VIEW_PRESETS.LUMBAR_SOFT;

  const safeName = fileName.replace(/[<>&'"]/g, "").slice(0, 80);
  const label = `${preset.label} · W ${preset.windowWidth} / L ${preset.windowCenter}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <rect x="40" y="40" width="560" height="560" fill="none" stroke="#334155" stroke-width="2" rx="16"/>
  <text x="320" y="280" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="14" font-weight="700">DICOM 슬라이스 플레이스홀더</text>
  <text x="320" y="310" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="12">${slice + 1}</text>
  <text x="320" y="340" text-anchor="middle" fill="#818cf8" font-family="system-ui,sans-serif" font-size="11">${label}</text>
  <text x="320" y="370" text-anchor="middle" fill="#475569" font-family="system-ui,sans-serif" font-size="10">${safeName ? safeName : "파일명 미전달"}</text>
  <text x="320" y="420" text-anchor="middle" fill="#475569" font-family="system-ui,sans-serif" font-size="10">pydicom·렌더 서버 연결 시 실제 픽셀로 대체</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
