"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export default function PushProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const isSecureContext = window.location.protocol === "https:" || window.location.hostname === "localhost";

    if ("serviceWorker" in navigator && isSecureContext) {
      window.addEventListener("load", function () {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("✅ Re:PhyT Service Worker 등록 성공:", registration.scope);
          })
          .catch((err) => {
            console.error("❌ Service Worker 등록 실패:", err);
          });
      });
    }
  }, []);

  return <>{children}</>;
}
