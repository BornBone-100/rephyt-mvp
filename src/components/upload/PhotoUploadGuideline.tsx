"use client";

import { useId, useState } from "react";

const NAVY = "#001A3D" as const;

const COPY = {
  ko: {
    title: "임상 사진 업로드 보안 가이드",
    bullets: [
      {
        lead: "얼굴 및 식별 표식 차단:",
        text: "얼굴, 문신 등 특정인을 유추할 수 있는 모든 정보는 모자이크 처리가 필수입니다.",
      },
      {
        lead: "데이터 비식별화:",
        text: "성함, 등록번호 등이 포함된 차트나 명찰이 사진에 노출되지 않도록 주의하십시오.",
      },
      {
        lead: "환자 동의 준수:",
        text: "개인정보 보호법에 의거, 사진 활용에 대한 환자의 사전 동의를 득한 경우에만 업로드가 가능합니다.",
      },
    ],
    consent: "위 주의사항을 확인하였으며, 이에 동의합니다.",
  },
  en: {
    title: "Clinical photo upload security notice",
    bullets: [
      {
        lead: "Block faces & identifiers:",
        text: "Mosaic or remove anything that could identify a person, including the face and distinctive tattoos.",
      },
      {
        lead: "De-identify data:",
        text: "Do not let charts, name tags, or registration numbers appear in the frame.",
      },
      {
        lead: "Patient consent:",
        text: "Upload only when you have prior consent for use of the image, in line with applicable privacy law.",
      },
    ],
    consent: "I have read the above and agree.",
  },
} as const;

export type PhotoUploadGuidelineProps = {
  className?: string;
  /** 제어 모드: 없으면 내부 state */
  consent?: boolean;
  onConsentChange?: (value: boolean) => void;
  locale?: "ko" | "en";
};

export function PhotoUploadGuideline({
  className = "",
  consent: controlledConsent,
  onConsentChange,
  locale = "ko",
}: PhotoUploadGuidelineProps) {
  const reactId = useId();
  const checkboxId = `privacy-check-${reactId.replace(/:/g, "")}`;
  const [internal, setInternal] = useState(false);
  const isControlled = typeof controlledConsent === "boolean";
  const checked = isControlled ? controlledConsent : internal;
  const t = COPY[locale === "en" ? "en" : "ko"];

  return (
    <div
      className={`mb-6 rounded-2xl border border-slate-200 border-l-4 bg-slate-50 p-5 shadow-sm ${className}`}
      style={{ borderLeftColor: NAVY }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-amber-500" aria-hidden>
          ⚠️
        </span>
        <h4
          className="text-sm font-bold uppercase tracking-tight"
          style={{ color: NAVY }}
        >
          {t.title}
        </h4>
      </div>

      <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600">
        {t.bullets.map((row) => (
          <li key={row.lead} className="flex gap-2">
            <span className="shrink-0 font-bold" style={{ color: NAVY }}>
              •
            </span>
            <span>
              <strong className="text-slate-800">{row.lead}</strong> {row.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => {
            const v = e.target.checked;
            onConsentChange?.(v);
            if (!isControlled) setInternal(v);
          }}
          className="h-4 w-4 rounded border-slate-300 accent-[#001A3D] focus:ring-2 focus:ring-[#001A3D] focus:ring-offset-0"
        />
        <label htmlFor={checkboxId} className="cursor-pointer text-[11px] font-medium text-slate-500">
          {t.consent}
        </label>
      </div>
    </div>
  );
}

/** 게시(이미지 URL 포함) 직전 등에서 동의 여부를 확인할 때 사용 */
export function getPhotoUploadGuidelineConsentMessage(locale: "ko" | "en") {
  return locale === "en" ? "Please confirm the photo upload guidelines." : "임상 사진 업로드 주의사항에 동의해 주세요.";
}
