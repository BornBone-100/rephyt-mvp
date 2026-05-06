/**
 * 픽셀 거리 × Pixel Spacing(mm/px) → 임상 참고 mm 및 스크리닝 심각도 표현.
 * DICOM (0028,0030) 등에서 나온 spacing을 서버가 내려줄 때 `pixelSpacingMm`으로 전달한다.
 */

export type RadiometricSeverityLevel = "normal" | "moderate" | "serious";

export type RadiometricResult = {
  targetLabel: string;
  valueMm: number;
  severity: RadiometricSeverityLevel;
  severityLabelKo: string;
  deviationText: string;
  normalRangeText: string;
  /** 눈금 바 위 마커 위치 (0–100) */
  rulerPositionPct: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 견봉하 공간: 좁을수록 스크리닝 관점 부담 경향이 커질 수 있음(참고). */
function shoulderSubacromial(pixelDistance: number, pixelSpacingMm: number): RadiometricResult {
  const valueMm = Math.round(pixelDistance * pixelSpacingMm * 10) / 10;
  const normalMin = 9.0;
  const normalMax = 10.0;

  let severity: RadiometricSeverityLevel;
  let severityLabelKo: string;
  if (valueMm < 7.0) {
    severity = "serious";
    severityLabelKo = "집중 관찰";
  } else if (valueMm < normalMin) {
    severity = "moderate";
    severityLabelKo = "주의";
  } else {
    severity = "normal";
    severityLabelKo = "참고 구간 내";
  }

  let deviationText: string;
  if (valueMm < normalMin) {
    deviationText = `정상 참고 하한(${normalMin} mm) 대비 약 ${(normalMin - valueMm).toFixed(1)} mm 좁게 관측된 경향입니다. (스크리닝·물리치료 평가 참고)`;
  } else if (valueMm > normalMax) {
    deviationText = `정상 참고 상한(${normalMax} mm) 대비 약 ${(valueMm - normalMax).toFixed(1)} mm 넓게 관측되었습니다. (개인 변이·촬영 각도 영향 가능)`;
  } else {
    deviationText = `참고 정상 구간(${normalMin}–${normalMax} mm) 안에서 분포합니다.`;
  }

  const normalRangeText = `참고 정상 구간 ${normalMin}–${normalMax} mm (견봉하 공간)`;
  const rulerPositionPct = clamp((valueMm / 14) * 100, 0, 100);

  return {
    targetLabel: "견봉하 공간 (Subacromial Space)",
    valueMm,
    severity,
    severityLabelKo,
    deviationText,
    normalRangeText,
    rulerPositionPct,
  };
}

/** 디스크 돌출 등 선분 기반 계측: 값이 클수록 스크리닝 관점 부담 경향(참고). */
function lumbarDiscMetric(pixelDistance: number, pixelSpacingMm: number): RadiometricResult {
  const valueMm = Math.round(pixelDistance * pixelSpacingMm * 10) / 10;
  const normalMax = 3.0;

  let severity: RadiometricSeverityLevel;
  let severityLabelKo: string;
  if (valueMm > 5.0) {
    severity = "serious";
    severityLabelKo = "집중 관찰";
  } else if (valueMm > normalMax) {
    severity = "moderate";
    severityLabelKo = "주의";
  } else {
    severity = "normal";
    severityLabelKo = "참고 구간 내";
  }

  let deviationText: string;
  if (valueMm > normalMax) {
    deviationText = `참고 상한(${normalMax} mm) 대비 약 ${(valueMm - normalMax).toFixed(1)} mm 더 길게 관측된 경향입니다. (단일 이미지·해상도 한계로 과해석 금지)`;
  } else {
    deviationText = `참고 상한(${normalMax} mm) 대비 완만한 범위로 분포합니다.`;
  }

  const normalRangeText = `참고 상한 약 ${normalMax} mm 이하 (디스크 돌출 관련 선분 계측 예시)`;
  const rulerPositionPct = clamp((valueMm / 8) * 100, 0, 100);

  return {
    targetLabel: "디스크 돌출 관련 선분 (예시 계측)",
    valueMm,
    severity,
    severityLabelKo,
    deviationText,
    normalRangeText,
    rulerPositionPct,
  };
}

/**
 * @param partKey BodyPartKey 문자열
 * @param pixelDistance 이미지 상에서의 픽셀 거리(서버 세그멘테이션·키포인트 등)
 * @param pixelSpacingMm 픽셀 1개당 mm (DICOM Pixel Spacing 평균 등)
 */
export function computeRadiometricDisplay(
  partKey: string,
  pixelDistance: number,
  pixelSpacingMm: number,
): RadiometricResult | null {
  if (!Number.isFinite(pixelDistance) || !Number.isFinite(pixelSpacingMm) || pixelSpacingMm <= 0) {
    return null;
  }

  switch (partKey) {
    case "SHOULDER":
      return shoulderSubacromial(pixelDistance, pixelSpacingMm);
    case "LUMBAR":
      return lumbarDiscMetric(pixelDistance, pixelSpacingMm);
    default:
      return null;
  }
}
