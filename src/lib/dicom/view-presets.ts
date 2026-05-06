/**
 * DICOM 윈도잉(Window Width / Window Center) 참고 프리셋.
 * 실제 렌더는 pydicom·VTK 등 백엔드에서 동일 WW/WC를 적용해야 함.
 */

export const DICOM_VIEW_PRESETS = {
  LUMBAR_BONE: { windowWidth: 2000, windowCenter: 500, label: "Bone Window" },
  LUMBAR_SOFT: { windowWidth: 400, windowCenter: 50, label: "Soft Tissue (Disc)" },
  SHOULDER_TENDON: { windowWidth: 600, windowCenter: 70, label: "Tendon Detail" },
} as const;

export type DicomWindowPresetKey = keyof typeof DICOM_VIEW_PRESETS;

export function getDicomPreset(key: string): (typeof DICOM_VIEW_PRESETS)[DicomWindowPresetKey] | undefined {
  return DICOM_VIEW_PRESETS[key as DicomWindowPresetKey];
}

/** 부위 힌트로 초기 프리셋 선택 */
export function defaultDicomPresetForPart(partKey: string): DicomWindowPresetKey {
  if (partKey === "SHOULDER") return "SHOULDER_TENDON";
  if (partKey === "LUMBAR") return "LUMBAR_SOFT";
  return "LUMBAR_BONE";
}
