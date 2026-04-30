"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    goPay?: (form: HTMLFormElement) => void;
  }
}

export default function NicepayV3Billing() {
  const moid = useMemo(() => `bill_${Date.now()}`, []);
  const returnUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/payments/nicepay/bill-callback`
    : "";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://web.nicepay.co.kr/v3/webstd/js/nicepay-3.0.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    const form = document.forms.namedItem("nicepayForm") as HTMLFormElement | null;

    if (!form) {
      alert("결제 폼을 찾을 수 없습니다.");
      return;
    }

    if (window.goPay) {
      window.goPay(form);
    } else {
      alert("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div>
      <form
        name="nicepayForm"
        method="post"
        action="/api/payments/nicepay/bill-callback"
        style={{ display: "none" }}
      >
        <input type="hidden" name="PayMethod" value="BILL" />
        <input type="hidden" name="MID" value="nicepay00m" />
        <input type="hidden" name="GoodsName" value="Re:PhyT 정기구독" />
        <input type="hidden" name="Amt" value="1004" />
        <input type="hidden" name="BuyerName" value="성준" />
        <input type="hidden" name="BuyerEmail" value="test@rephyt.com" />
        <input type="hidden" name="BuyerTel" value="01012345678" />
        <input type="hidden" name="Moid" value={moid} />
        <input type="hidden" name="ReturnURL" value={returnUrl} />
        <input type="hidden" name="CharSet" value="utf-8" />
        <input type="hidden" name="EdiDate" value="20260428171619" />
        <input type="hidden" name="SignData" value="서버에서_생성한_해시값" />
      </form>

      <button
        onClick={handlePayment}
        className="px-6 py-3 bg-blue-600 text-white rounded-md font-bold"
      >
        정기구독 카드 등록하기
      </button>
    </div>
  );
}
