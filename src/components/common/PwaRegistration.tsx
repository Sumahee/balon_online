"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let lastCheck = Date.now();
    const update = () => {
      if (!registration || Date.now() - lastCheck < 60 * 60 * 1000) return;
      lastCheck = Date.now();
      void registration.update().catch(() => {});
    };
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(value => {
      if (active) registration = value;
    }).catch(error => console.warn("웹앱 오프라인 안내를 준비하지 못했습니다.", error));
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => {
      active = false;
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
    };
  }, []);
  return null;
}
