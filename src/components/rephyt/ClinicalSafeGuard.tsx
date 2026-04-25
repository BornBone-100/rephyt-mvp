/**
 * 법적 방어: 분석 결과물 하단 필수 Disclaimer
 */
export function ClinicalSafeGuard() {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
      <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
        본 도구는 의사의 진단을 대체할 수 없는 보조 도구입니다. 임상 판단 및 치료 결정은 반드시 면허 의료인의 지도 하에 이루어져야 합니다.
      </p>
    </div>
  );
}
