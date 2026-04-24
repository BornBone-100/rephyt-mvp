"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

const STORAGE_KEY = "rephyt_pending_profile_bootstrap";

export type PendingProfileBootstrapPayload = {
  sms_session_token: string;
  phone_number: string;
  name: string;
  license_no: string;
  experience_years: string;
  hospital_name: string;
  specialties: string[];
  blog_url: string;
  bio: string;
  slogan: string;
};

export function readPendingProfileBootstrap(): PendingProfileBootstrapPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingProfileBootstrapPayload;
  } catch {
    return null;
  }
}

export function writePendingProfileBootstrap(payload: PendingProfileBootstrapPayload) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPendingProfileBootstrap() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * 이메일 인증 후 세션이 생겼을 때, 로컬에 보관한 프로필+휴대폰 인증 정보를 서버로 동기화합니다.
 */
export function PendingSignupProfileSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const pending = readPendingProfileBootstrap();
      if (!pending?.sms_session_token || !pending.phone_number) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch("/api/profile/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(pending),
      });

      if (res.ok) {
        clearPendingProfileBootstrap();
      }
    })();
  }, []);

  return null;
}
