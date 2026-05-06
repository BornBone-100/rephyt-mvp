/** `/api/ai-screening/analyze` 스텁이 반환하는 구조화 metrics (부위별 표시명·정상 구간은 화면 템플릿과 맞춤) */

export type StubMetricRow = {
  name: string;
  value: number;
  normal: string;
  unit: string;
};

const TABLE: Record<string, StubMetricRow[]> = {
  CERVICAL: [
    { name: "C-Curve 각도 (Cobb)", value: 26, normal: "20–35", unit: "deg" },
    { name: "추간판 높이 비율 (Disc Height)", value: 85, normal: "80 이상", unit: "%" },
  ],
  SHOULDER: [
    { name: "견봉하 공간 (Subacromial Space)", value: 6.2, normal: "9–10", unit: "mm" },
    { name: "극상근 건 두께 (Supraspinatus)", value: 4.8, normal: "4–6", unit: "mm" },
  ],
  ELBOW: [
    { name: "굴곡 ROM (Flexion)", value: 128, normal: "135–150", unit: "deg" },
    { name: "신전 잔여각 (Extension lag)", value: 4, normal: "0–5", unit: "deg" },
  ],
  WRIST: [
    { name: "수관절 배굴 각 (Palmar Flexion)", value: 68, normal: "60–80", unit: "deg" },
    { name: "요골 변위 지수 (Ulnar variance idx)", value: 0.35, normal: "0.0–0.5", unit: "idx" },
  ],
  HAND: [
    { name: "제2 MCP 굴곡 ROM", value: 88, normal: "85–95", unit: "deg" },
    { name: "핀치 그립력 지수 (Pinch)", value: 5.1, normal: "4.5 이상", unit: "kg" },
  ],
  LUMBAR: [
    { name: "추간판 돌출 정도 (Disc Protrusion)", value: 5.8, normal: "3 이하", unit: "mm" },
    { name: "척추관 유효 직경 (Canal Diameter)", value: 11.2, normal: "12 이상", unit: "mm" },
  ],
  HIP: [
    { name: "Center–edge 각 (CE angle)", value: 32, normal: "25–40", unit: "deg" },
    { name: "고관절 간격 (Joint space width)", value: 4.4, normal: "4–5", unit: "mm" },
  ],
  KNEE: [
    { name: "관절 간격 (Joint Space)", value: 3.2, normal: "4–5", unit: "mm" },
    { name: "인대 신호 강도 (Signal Intensity)", value: 1.2, normal: "Low", unit: "idx" },
  ],
  ANKLE: [
    { name: "발목 배굴 각 (Plantarflexion)", value: 14, normal: "40–55", unit: "deg" },
    { name: "전방 관절 간격 (AITFL)", value: 9.5, normal: "5–8", unit: "mm" },
  ],
  FOOT: [
    { name: "족저막 두께 (Plantar fascia)", value: 8, normal: "≤ 4", unit: "mm" },
    { name: "내측 종방 아치 각 (Navicular drop)", value: 72, normal: "< 10", unit: "mm" },
  ],
};

export function getAnalyzeStubStructuredMetrics(part: string): StubMetricRow[] {
  return TABLE[part] ?? TABLE.LUMBAR;
}
