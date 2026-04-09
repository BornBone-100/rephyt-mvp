import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    id: "basic",
    name: "Basic",
    audience: "주니어 물리치료사",
    price: "₩0",
    period: "/ 월",
    highlight: false,
    features: [
      "월 환자 등록 30명 제한",
      "기본 SOAP 차트 작성",
      "기초 평가 툴 제공",
    ],
    cta: "무료로 시작하기",
    ctaVariant: "muted" as const,
  },
  {
    id: "pro",
    name: "Pro",
    audience: "실장급 및 전문 물리치료사",
    price: "₩9,900",
    period: "/ 월",
    highlight: true,
    features: [
      "환자 등록 무제한",
      "AI 임상 추론 SOAP 무제한",
      "원클릭 PDF 다운로드",
      "프리미엄 ROM/MMT 정밀 분석",
    ],
    cta: "Pro 요금제로 업그레이드",
    ctaVariant: "primary" as const,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "재활 센터 및 병원 원장님",
    price: "₩99,000",
    period: "/ 월",
    priceNote: "또는 도입 문의",
    highlight: false,
    features: [
      "센터 내 물리치료사 무제한 계정 연동",
      "마스터 대시보드 및 전체 환자 통계",
      "맞춤형 EMR 연동 지원",
    ],
    cta: "도입 문의하기",
    ctaVariant: "outline" as const,
  },
];

function FeatureRow({ text }: { text: string }) {
  return (
    <li className="flex gap-3 text-[15px] leading-snug text-zinc-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
        <Check className="h-3 w-3 stroke-[2.5]" aria-hidden />
      </span>
      <span className="font-medium tracking-tight">{text}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-5 py-12 md:px-10 md:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 text-center">
          <Link
            href="/dashboard/patients"
            className="inline-flex text-sm font-semibold text-zinc-400 transition hover:text-zinc-700"
          >
            ← 환자 목록으로
          </Link>
        </div>

        <header className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-950/50">
            Re:PhyT Pricing
          </p>
          <h1 className="text-balance text-3xl font-black tracking-tight text-blue-950 md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            업무는 가볍게,
            <br className="sm:hidden" />
            <span className="sm:ml-2">진료는 깊이 있게.</span>
          </h1>
          <p className="mt-5 text-pretty text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
            팀 규모와 임상 깊이에 맞는 요금제를 선택하세요.
            <br className="hidden sm:block" />
            언제든 업그레이드할 수 있습니다.
          </p>
        </header>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:items-center lg:gap-6">
          {plans.map((plan) => {
            const isPro = plan.highlight;

            const cardInner = (
              <div
                className={[
                  "flex h-full flex-col rounded-3xl border bg-white p-8 shadow-sm transition-shadow md:p-9",
                  isPro
                    ? "border-2 border-blue-500 shadow-lg shadow-blue-950/10 ring-1 ring-blue-500/20"
                    : "border border-zinc-200/80",
                ].join(" ")}
              >
                <div className="mb-6 flex min-h-[4.5rem] flex-col items-center justify-center gap-1 border-b border-zinc-100 pb-6 text-center">
                  <h2 className="text-xl font-black tracking-tight text-blue-950">{plan.name}</h2>
                  <p className="text-sm font-medium text-zinc-500">{plan.audience}</p>
                </div>

                <div className="mb-8 text-center">
                  <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1">
                    <span className="text-3xl font-black tracking-tight text-blue-950 md:text-[2rem]">
                      {plan.price}
                    </span>
                    <span className="text-base font-semibold text-zinc-400">{plan.period}</span>
                  </div>
                  {"priceNote" in plan && plan.priceNote ? (
                    <p className="mt-2 text-xs font-semibold text-zinc-400">{plan.priceNote}</p>
                  ) : null}
                </div>

                <ul className="mb-10 flex flex-1 flex-col gap-4">
                  {plan.features.map((f) => (
                    <FeatureRow key={f} text={f} />
                  ))}
                </ul>

                {plan.ctaVariant === "muted" && (
                  <button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-zinc-100 text-sm font-bold text-zinc-700 transition hover:bg-zinc-200 active:scale-[0.99]"
                  >
                    {plan.cta}
                  </button>
                )}
                {plan.ctaVariant === "primary" && (
                  <button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-blue-950 text-sm font-bold text-white shadow-md transition hover:bg-blue-900 active:scale-[0.99]"
                  >
                    {plan.cta}
                  </button>
                )}
                {plan.ctaVariant === "outline" && (
                  <button
                    type="button"
                    className="h-12 w-full rounded-2xl border-2 border-blue-950 bg-transparent text-sm font-bold text-blue-950 transition hover:bg-blue-950/5 active:scale-[0.99]"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            );

            if (isPro) {
              return (
                <div
                  key={plan.id}
                  className="relative z-10 w-full origin-center lg:-my-6 lg:scale-[1.06]"
                >
                  <div className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 sm:-top-4">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-orange-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                      BEST
                    </span>
                  </div>
                  {cardInner}
                </div>
              );
            }

            return (
              <div key={plan.id} className="flex w-full">
                {cardInner}
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-14 max-w-lg text-center text-xs font-medium leading-relaxed text-zinc-400 md:mt-16">
          표시된 금액은 부가세 별도일 수 있습니다. 결제·약관은 정식 출시 시 안내드립니다.
        </p>
      </div>
    </div>
  );
}
