"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

declare global {
  interface Window {
    nicepayStart?: (authData: Record<string, string>) => void;
  }
}

const NICEPAY_SDK_URL = "https://pg-sdk.nicepay.co.kr/v1/js/nicepay.js";

type PricingDict = {
  pricing: {
    title: string;
    price: string;
    features: string[];
    button: string;
  };
};

type Props = {
  dict: PricingDict;
  lang: "ko" | "en";
};

export function PricingClient({ dict, lang }: Props) {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const currentLang = params.lang === "en" || params.lang === "ko" ? params.lang : lang;
  const base = `/${currentLang}`;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [finalAmount] = useState(5900);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKoPayLoading, setIsKoPayLoading] = useState(false);
  const supabase = createClient();
  const envMid = process.env.NEXT_PUBLIC_NICEPAY_MID?.trim();
  const niceMid = envMid || "nictest00m";

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    void getUser();
  }, [supabase]);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const loadNicepayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.nicepayStart) {
        resolve(true);
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${NICEPAY_SDK_URL}"]`,
      );
      if (existing) {
        // 이미 로드된 스크립트라면 즉시 성공 처리
        if (window.nicepayStart) {
          resolve(true);
          return;
        }
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = NICEPAY_SDK_URL;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

  const waitForNicepay = async () => {
    const loaded = await loadNicepayScript();
    if (!loaded) return false;

    if (window.nicepayStart) return true;

    return new Promise<boolean>((resolve) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.nicepayStart) {
          window.clearInterval(timer);
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= 5000) {
          window.clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  };

  const handleSubscribe = async () => {
    const user = await getUser();

    if (!user) {
      router.push(`${base}/login`);
      return;
    }

    const userEmail = user.email ?? "";
    const nextUserId = user.id;
    const buyerName =
      typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : userEmail.split("@")[0] || "Re:PhyT User";
    setUserId(nextUserId);

    if (currentLang === "ko") {
      setIsKoPayLoading(true);
      if (!envMid) {
        console.warn("NEXT_PUBLIC_NICEPAY_MID is missing. Falling back to test MID(nictest00m).");
      }
      const ready = await waitForNicepay();
      if (!ready || !window.nicepayStart) {
        setIsKoPayLoading(false);
        alert("결제 모듈을 불러올 수 없습니다. 네트워크 설정을 확인해 주세요.");
        return;
      }

      const orderId = `rephyt_${Date.now()}`;
      const amount = "15000";
      const returnUrl = `${window.location.origin}/api/payments/nicepay/callback`;
      const signRes = await fetch("/api/payments/nicepay/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount,
          goodsName: "Re:PhyT Pro 구독",
          userId: nextUserId,
          buyerName,
          buyerEmail: userEmail,
          returnUrl,
          mid: niceMid,
        }),
      });
      const signData = (await signRes.json()) as {
        success?: boolean;
        message?: string;
        authData?: Record<string, string>;
      };
      if (!signRes.ok || !signData.success || !signData.authData) {
        setIsKoPayLoading(false);
        alert(signData.message ?? "나이스페이 결제 준비에 실패했습니다.");
        return;
      }

      window.nicepayStart(signData.authData);
      setIsKoPayLoading(false);
      return;
    }

    const checkoutUrl = `https://rephyt.lemonsqueezy.com/checkout/buy/fe0a7082-3aa9-4a17-bbd2-c9cee85ae282?checkout[email]=${encodeURIComponent(userEmail)}&checkout[custom][user_id]=${encodeURIComponent(nextUserId)}`;

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const submitBillingInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const requestData = {
      cardNumber: formData.get("cardNumber") as string,
      expMonth: formData.get("expMonth") as string,
      expYear: formData.get("expYear") as string,
      cardPw: formData.get("cardPw") as string,
      idNo: formData.get("idNo") as string,
      userId: userId,
      amount: finalAmount,
    };

    try {
      const res = await fetch("/api/billing/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const result = await res.json();

      if (result.success) {
        alert("🎉 카드 등록 완료! 이틀 동안 Re:PhyT Pro를 마음껏 경험해 보세요.");
        setIsModalOpen(false);
        window.location.href = `${base}/dashboard/soap/new`;
      } else {
        alert(`등록 실패: ${result.message}`);
      }
    } catch {
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const plans = useMemo(
    () => [
      {
        id: "free" as const,
        name: "Free (무료체험)",
        priceFull: null as string | null,
        price: "0",
        description:
          "Re:PhyT의 핵심 기능을 체험해볼 수 있는 베이직 플랜입니다. 개인 물리치료사 분들의 간단한 차트 관리에 적합합니다.",
        features: ["환자 5명 등록 가능", "기본 SOAP 차트 생성", "처치 로그(P-노트) 10건"],
        button: "지금 시작하기",
        color: "bg-zinc-100 text-zinc-600",
      },
      {
        id: "pro" as const,
        name: dict.pricing.title,
        priceFull: dict.pricing.price,
        price: "",
        description:
          currentLang === "en"
            ? "Unlimited AI for busy clinicians and clinics. Billed monthly."
            : "환자 데이터가 많은 프리랜서 및 병원 치료사에게 최적화된 무제한 AI 솔루션입니다. (1개월 단위 정기결제)",
        features: dict.pricing.features,
        button: dict.pricing.button,
        color: "bg-orange-500 text-white shadow-orange-200",
      },
      {
        id: "premium" as const,
        name: "Premium (기관용)",
        priceFull: null as string | null,
        price: "99,000",
        description:
          "다수의 치료사가 함께 근무하는 병원/센터 단위에 적합한 엔터프라이즈 맞춤형 관리 솔루션입니다.",
        features: ["Pro의 모든 기능", "다수 계정 연동 (원장+선생님)", "병원 로고 커스텀", "우선 고객 지원"],
        button: "도입 문의",
        color: "bg-blue-950 text-white shadow-blue-200",
      },
    ],
    [dict, currentLang],
  );

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-blue-950 tracking-tight">서비스 요금제 안내</h1>
          <p className="text-zinc-500 font-medium text-lg">Re:PhyT AI와 함께 물리치료의 질을 높이세요.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[2.5rem] p-10 border shadow-sm flex flex-col justify-between hover:shadow-xl transition duration-300 ${
                plan.id === "pro"
                  ? "border-2 border-blue-950 bg-white"
                  : "bg-white border border-zinc-200"
              }`}
            >
              <div>
                <h3 className="text-xl font-black text-zinc-800 mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mb-6 min-h-[3rem]">{plan.description}</p>

                <div className="mb-8">
                  {plan.priceFull ? (
                    <p className="text-3xl md:text-4xl font-black text-blue-950">{plan.priceFull}</p>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-blue-950">₩{plan.price}</span>
                      <span className="text-zinc-400 font-bold ml-1">/ 월</span>
                    </>
                  )}
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-600 font-medium text-sm">
                      <span className="text-orange-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={plan.id === "pro" ? () => void handleSubscribe() : undefined}
                disabled={plan.id === "pro" && isKoPayLoading}
                className={`w-full h-14 rounded-2xl font-black text-lg transition shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${plan.color}`}
              >
                {plan.id === "pro" && isKoPayLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    결제창 준비 중...
                  </span>
                ) : (
                  plan.button
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 text-left bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <h4 className="text-zinc-800 text-sm font-bold mb-4">결제 및 환불 안내 (전자상거래법 기준)</h4>
          <ul className="text-zinc-500 text-xs leading-relaxed space-y-2 list-disc pl-4">
            <li>
              <strong>상품 설명:</strong> 본 상품은 물리치료사를 위한 AI 기반 환자 관리 및 SOAP 차트 자동화 웹 서비스
              이용권(디지털 콘텐츠)입니다.
            </li>
            <li>
              <strong>정기 결제:</strong> Pro 요금제는 1개월 단위의 정기구독 상품으로, 매월 결제일에 등록하신 신용카드로
              자동 청구됩니다.
            </li>
            <li>
              <strong>구독 해지:</strong> 마이페이지 내 [구독 관리]에서 언제든지 수수료 없이 해지하실 수 있으며, 해지 시
              다음 결제일부터 청구되지 않습니다.
            </li>
            <li>
              <strong>환불 정책:</strong> 결제 후 7일 이내에 유료 서비스를 이용하지 않은 경우 전액 환불이 가능합니다. 단,
              기능 사용 이력이 있는 경우 해당 월 환불은 불가합니다.
            </li>
          </ul>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-blue-950">카드 등록 (무료 체험)</h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              <span className="font-bold text-blue-900">이 단계에서는 결제 금액이 청구되지 않습니다.</span> 카드만
              안전하게 등록되며, 이틀간 Pro 기능을 무료로 이용할 수 있습니다.
            </p>
            <form onSubmit={submitBillingInfo} className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">신용카드 번호</label>
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="숫자만 입력해주세요 (16자리)"
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">유효기간 (MM)</label>
                  <input
                    type="text"
                    name="expMonth"
                    placeholder="월 (예: 09)"
                    maxLength={2}
                    required
                    className="w-full p-3 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">유효기간 (YY)</label>
                  <input
                    type="text"
                    name="expYear"
                    placeholder="년 (예: 25)"
                    maxLength={2}
                    required
                    className="w-full p-3 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카드 비밀번호 앞 2자리</label>
                <input
                  type="password"
                  name="cardPw"
                  placeholder="**"
                  maxLength={2}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">생년월일 (또는 사업자번호)</label>
                <input
                  type="text"
                  name="idNo"
                  placeholder="생년월일 6자리 또는 사업자번호 10자리"
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">개인카드는 생년월일 6자리, 법인카드는 사업자등록번호 10자리</p>
              </div>

              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-red-500 font-bold leading-snug">
                  💡 2일간 무료 체험 후, 3일째 되는 날 월 5,900원이 결제됩니다.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 p-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-[2] py-3 rounded-xl text-white font-bold transition-colors ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-950 hover:bg-blue-900"
                    }`}
                  >
                    {isSubmitting ? "카드 확인 중..." : "지금 무료로 시작하기"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
