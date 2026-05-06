import { NextRequest, NextResponse } from "next/server";
import { getAnalyzeStubStructuredMetrics } from "@/lib/ai-screening/analyze-stub-metrics";

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/dicom",
  "application/octet-stream",
  "",
]);

const BODY_PART_KEYS = new Set([
  "CERVICAL",
  "SHOULDER",
  "ELBOW",
  "WRIST",
  "HAND",
  "LUMBAR",
  "HIP",
  "KNEE",
  "ANKLE",
  "FOOT",
]);

function isAllowedBodyPart(s: string): boolean {
  return BODY_PART_KEYS.has(s);
}

function clampSliceCoord(n: number): number {
  return Math.min(96, Math.max(4, Math.round(n)));
}

/** 업스트림 FastAPI URL. `AI_SCREENING_VISION_URL=` 빈 문자열이면 스텁만 사용. */
function resolveVisionUpstream(): string | undefined {
  const raw = process.env.AI_SCREENING_VISION_URL;
  if (raw !== undefined) {
    const t = raw.trim();
    return t === "" ? undefined : t;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000/api/ai-screening/analyze";
  }
  return undefined;
}

/**
 * POST multipart/form-data
 * - image: File (권장)
 * - imageUrl: 업로드된 원격 URL (대용량 파일 우회 시)
 * - bodyPartHint: 스크리닝 부위 힌트 (선택, 스텁·폴백에 사용)
 * - patientId: 차트 귀속용 (선택, 현재 스텁은 미사용)
 *
 * 업스트림: `resolveVisionUpstream()` — 설정된 `AI_SCREENING_VISION_URL` 우선, 없으면 개발 모드에서만 `127.0.0.1:8000` FastAPI 시도.
 * `AI_SCREENING_VISION_URL=` (빈 값)이면 스텁만 사용합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "multipart_required" }, { status: 415 });
    }

    const formData = await req.formData();
    const image = formData.get("image");
    const imageUrl = String(formData.get("imageUrl") || "").trim();
    const imageName = String(formData.get("imageName") || "").trim();

    if (!image && !imageUrl) {
      return NextResponse.json({ error: "image_required" }, { status: 400 });
    }

    let file: File | null = null;
    if (image && typeof image !== "string") {
      file = image as File;
      if (file.size <= 0 || file.size > MAX_BYTES) {
        return NextResponse.json({ error: "image_size_invalid" }, { status: 400 });
      }

      const mime = (file.type || "").toLowerCase();
      if (!ALLOWED_MIME.has(mime)) {
        return NextResponse.json({ error: "image_type_not_supported" }, { status: 400 });
      }
    }

    let devUpstreamFallback = false;

    const upstream = resolveVisionUpstream();
    if (upstream) {
      const forward = new FormData();
      for (const [key, value] of formData.entries()) {
        forward.append(key, value);
      }
      try {
        const upstreamRes = await fetch(upstream, { method: "POST", body: forward });
        const text = await upstreamRes.text();
        let json: unknown;
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          return NextResponse.json({ error: "upstream_invalid_json" }, { status: 502 });
        }
        return NextResponse.json(json, { status: upstreamRes.ok ? 200 : 502 });
      } catch (err) {
        console.error("[ai-screening/analyze] upstream unreachable:", upstream, err);
        if (process.env.NODE_ENV !== "development") {
          return NextResponse.json({ error: "upstream_unreachable" }, { status: 503 });
        }
        console.warn("[ai-screening/analyze] development: FastAPI 미기동 → 스텁 폴백");
        devUpstreamFallback = true;
      }
    }

    const hint = String(formData.get("bodyPartHint") || "LUMBAR");
    const part = isAllowedBodyPart(hint) ? hint : "LUMBAR";

    /** 실제 비전 모델 미연결 시: 파이프라인·UI 검증용 스텁 (부위 힌트 반영) */
    const stubCoords: Record<string, { x: number; y: number }> = {
      CERVICAL: { x: 50, y: 22 },
      SHOULDER: { x: 46, y: 38 },
      ELBOW: { x: 44, y: 44 },
      WRIST: { x: 42, y: 48 },
      HAND: { x: 48, y: 52 },
      LUMBAR: { x: 50, y: 58 },
      HIP: { x: 48, y: 62 },
      KNEE: { x: 50, y: 68 },
      ANKLE: { x: 50, y: 78 },
      FOOT: { x: 50, y: 88 },
    };

    const radiometricSnake: Record<string, number> = {};
    if (part === "SHOULDER") {
      radiometricSnake.pixel_distance = 62;
      radiometricSnake.pixel_spacing = 0.1;
    } else if (part === "LUMBAR") {
      radiometricSnake.pixel_distance = 42;
      radiometricSnake.pixel_spacing = 0.14;
    }

    const nameForType = (file?.name ?? imageName ?? "").toLowerCase();
    const isDcm = nameForType.endsWith(".dcm");
    const baseCoord = stubCoords[part] ?? { x: 50, y: 50 };
    const dicomVolume = isDcm
      ? {
          totalSlices: 32,
          slices: Array.from({ length: 32 }, (_, i) => ({
            x: clampSliceCoord(baseCoord.x + (i % 5) - 2),
            y: clampSliceCoord(baseCoord.y + Math.floor(i / 6) - 3),
          })),
        }
      : undefined;

    const metrics = getAnalyzeStubStructuredMetrics(part);

    return NextResponse.json({
      status: "success",
      analysis: {
        part,
        confidence: 96.4,
        coords: baseCoord,
        finding: devUpstreamFallback
          ? "개발 모드: 로컬 비전 서버(예: 127.0.0.1:8000)에 연결되지 않아 스텁 데이터를 표시합니다. backend에서 uvicorn을 실행한 뒤 다시 분석하면 실제 응답이 반영됩니다."
          : "스텁 응답: 실제 비전 API가 연결되면 이 문장이 모델 출력으로 대체됩니다. 현재는 업로드·엔드포인트 검증용입니다.",
        metrics,
        expert_opinion:
          "스텁 전문가 코멘트입니다. 실제 서비스에서는 모델·임상 규칙 엔진 출력으로 대체됩니다.",
        correlation_score: 94.2,
        ...radiometricSnake,
        ...(dicomVolume
          ? {
              dicom_volume: {
                total_slices: dicomVolume.totalSlices,
                slices: dicomVolume.slices,
              },
            }
          : {}),
      },
    });
  } catch (e) {
    console.error("[ai-screening/analyze]", e);
    return NextResponse.json({ error: "analyze_failed" }, { status: 500 });
  }
}
