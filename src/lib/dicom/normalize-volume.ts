export type DicomSliceCoord = { x: number; y: number };

export type DicomVolumePayload = {
  totalSlices: number;
  slices: DicomSliceCoord[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * 비전 API의 `dicomVolume` 필드를 슬라이스별 히트맵 좌표(0–100%)로 정규화합니다.
 */
export function normalizeVisionDicomVolume(
  raw: unknown,
  fallbackXY: { x: number; y: number },
): DicomVolumePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { totalSlices?: unknown; slices?: unknown };
  const tsRaw = o.totalSlices;
  const ts = typeof tsRaw === "number" && Number.isFinite(tsRaw) ? Math.floor(tsRaw) : 0;
  if (ts < 1 || ts > 512) return null;

  const list = Array.isArray(o.slices) ? o.slices : null;

  const slices: DicomSliceCoord[] = Array.from({ length: ts }, (_, i) => {
    const item = list?.[i];
    if (item && typeof item === "object") {
      const p = item as { x?: unknown; y?: unknown };
      const x = typeof p.x === "number" && Number.isFinite(p.x) ? clamp(p.x, 0, 100) : fallbackXY.x;
      const y = typeof p.y === "number" && Number.isFinite(p.y) ? clamp(p.y, 0, 100) : fallbackXY.y;
      return { x, y };
    }
    return { ...fallbackXY };
  });

  return { totalSlices: ts, slices };
}
