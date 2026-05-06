/**
 * 비전 분석 API(JSON) 계약 — FastAPI 등 백엔드와 동일 스키마 유지.
 *
 * @example
 * ```json
 * {
 *   "status": "success",
 *   "analysis": {
 *     "part": "LUMBAR",
 *     "finding": "…",
 *     "confidence": 98.4,
 *     "coords": { "x": 50, "y": 65 },
 *     "metrics": [
 *       { "name": "추간판 돌출", "value": 5.8, "normal": "3.0mm 이하", "unit": "mm" }
 *     ],
 *     "expert_opinion": "…"
 *   }
 * }
 * ```
 *
 * 선택 확장(평탄화 후 프론트에서 동일 처리): `correlation_score`, `pixel_spacing`, `pixel_distance`, `dicom_volume`
 */

export type VisionMetricRow = {
  name: string;
  value: number | string;
  normal: string;
  unit: string;
};

/** 프론트 `buildAnalysisFromVisionApi` 에 넘기는 평탄화 페이로드 */
export type VisionAnalyzeFlatPayload = {
  part?: string;
  finding?: string;
  confidence?: number;
  confidenceMetrics?: {
    score?: number;
    grade?: string;
    sensitivity?: number;
  } | null;
  isCalibrated?: boolean | null;
  coords?: { x?: number; y?: number };
  /** 구조화 계측 행 (부위 템플릿 행과 인덱스·이름으로 매칭) */
  metricsDetailed?: VisionMetricRow[] | null;
  /** 레거시: 문자열 배열만 있는 경우 */
  metricValues?: string[] | null;
  metrics?: string[] | null;
  expertOpinion?: string | null;
  correlationScore?: string | null;
  pixelDistance?: number | null;
  pixelSpacing?: number | null;
  /** `normalizeVisionDicomVolume` 에 넘길 수 있도록 totalSlices 기준으로 통일 */
  dicomVolume?: { totalSlices?: number; slices?: { x?: number; y?: number }[] } | null;
  error?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function readString(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function readNumber(o: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function parseMetricRows(raw: unknown): VisionMetricRow[] | null {
  if (!Array.isArray(raw)) return null;
  const out: VisionMetricRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = typeof item.name === "string" ? item.name : "";
    const normal = typeof item.normal === "string" ? item.normal : "";
    const unit = typeof item.unit === "string" ? item.unit : "";
    const valRaw = item.value;
    const value =
      typeof valRaw === "number" && Number.isFinite(valRaw)
        ? valRaw
        : typeof valRaw === "string"
          ? valRaw
          : "";
    if (!name) continue;
    out.push({ name, value, normal, unit });
  }
  return out.length ? out : null;
}

function flattenDicomVolume(
  raw: unknown,
): VisionAnalyzeFlatPayload["dicomVolume"] | undefined {
  if (!isRecord(raw)) return undefined;
  const ts = readNumber(raw, "totalSlices", "total_slices");
  if (ts == null || ts < 1) return undefined;
  const slices = Array.isArray(raw.slices) ? (raw.slices as { x?: number; y?: number }[]) : undefined;
  return { totalSlices: Math.floor(ts), slices };
}

/**
 * 래핑(`status` + `analysis`) 또는 레거시 평탄 JSON 모두 수용 후 평탄 페이로드로 통일합니다.
 */
export function normalizeVisionAnalyzeResponse(raw: unknown):
  | { ok: true; payload: VisionAnalyzeFlatPayload }
  | { ok: false; error: string; code?: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "유효하지 않은 응답 형식입니다.", code: "invalid_json_shape" };
  }

  const status = readString(raw, "status");
  const topError = readString(raw, "error", "detail", "message");

  const nested = raw.analysis;
  const source: Record<string, unknown> =
    isRecord(nested) && !Array.isArray(nested) ? (nested as Record<string, unknown>) : raw;

  if (status === "error" || topError) {
    return {
      ok: false,
      error: topError ?? "비전 분석이 오류 상태로 반환되었습니다.",
      code: readString(raw, "error") ?? "vision_error",
    };
  }

  if (status != null && status !== "" && status !== "success") {
    return {
      ok: false,
      error:
        readString(raw, "message") ??
        `비전 분석 status가 success가 아닙니다. (${status})`,
      code: "vision_status_not_success",
    };
  }

  const metricsDetailed = parseMetricRows(source.metrics);

  const correlationRaw =
    readString(source, "correlation_score", "correlationScore") ??
    readString(raw, "correlation_score", "correlationScore");
  const correlationNum =
    readNumber(source, "correlation_score", "correlationScore") ??
    readNumber(raw, "correlation_score", "correlationScore");
  const correlationScore =
    correlationRaw ?? (correlationNum != null ? String(correlationNum) : undefined);

  const pixelDistance =
    readNumber(source, "pixel_distance", "pixelDistance") ??
    readNumber(raw, "pixel_distance", "pixelDistance") ??
    null;
  const pixelSpacing =
    readNumber(source, "pixel_spacing", "pixelSpacing") ??
    readNumber(raw, "pixel_spacing", "pixelSpacing") ??
    null;

  const dicomVolRaw = source.dicom_volume ?? source.dicomVolume ?? raw.dicom_volume ?? raw.dicomVolume;

  const legacyMetricStrings = Array.isArray(source.metricValues)
    ? (source.metricValues as unknown[]).filter((x): x is string => typeof x === "string")
    : Array.isArray(raw.metricValues)
      ? (raw.metricValues as unknown[]).filter((x): x is string => typeof x === "string")
      : null;

  const legacyMetricsAlt = Array.isArray(source.metrics)
    ? (source.metrics as unknown[]).every((x) => typeof x === "string")
      ? (source.metrics as string[])
      : null
    : Array.isArray(raw.metrics)
      ? (raw.metrics as unknown[]).every((x) => typeof x === "string")
        ? (raw.metrics as string[])
        : null
      : null;

  const payload: VisionAnalyzeFlatPayload = {
    part: readString(source, "part"),
    finding: readString(source, "finding"),
    confidence: readNumber(source, "confidence"),
    confidenceMetrics: isRecord(source.confidence_metrics)
      ? {
          score: readNumber(source.confidence_metrics as Record<string, unknown>, "score"),
          grade: readString(source.confidence_metrics as Record<string, unknown>, "grade"),
          sensitivity: readNumber(source.confidence_metrics as Record<string, unknown>, "sensitivity"),
        }
      : isRecord(source.confidenceMetrics)
        ? {
            score: readNumber(source.confidenceMetrics as Record<string, unknown>, "score"),
            grade: readString(source.confidenceMetrics as Record<string, unknown>, "grade"),
            sensitivity: readNumber(source.confidenceMetrics as Record<string, unknown>, "sensitivity"),
          }
        : null,
    isCalibrated:
      typeof source.is_calibrated === "boolean"
        ? source.is_calibrated
        : typeof source.isCalibrated === "boolean"
          ? source.isCalibrated
          : null,
    coords: isRecord(source.coords) ? (source.coords as { x?: number; y?: number }) : undefined,
    metricsDetailed,
    metricValues: legacyMetricStrings?.length ? legacyMetricStrings : null,
    metrics: legacyMetricsAlt?.length ? legacyMetricsAlt : null,
    expertOpinion: readString(source, "expert_opinion", "expertOpinion"),
    correlationScore: correlationScore ?? null,
    pixelDistance,
    pixelSpacing,
    dicomVolume: dicomVolRaw != null ? flattenDicomVolume(dicomVolRaw) : null,
    error: topError,
  };

  return { ok: true, payload };
}
