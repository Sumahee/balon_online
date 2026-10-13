"use client";

import { useEffect, useRef } from "react";

// A same-URL entry makes the phone Back button close the overlay first.
export function useModalBack(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const marker = crypto.randomUUID();
    let owned = false;
    const frame = requestAnimationFrame(() => {
      window.history.pushState({ ...window.history.state, baronModal: marker }, "", window.location.href);
      owned = true;
    });
    const back = () => {
      if (!owned) return;
      owned = false;
      closeRef.current();
    };
    window.addEventListener("popstate", back);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", back);
      if (owned && window.history.state?.baronModal === marker) {
        owned = false;
        window.history.back();
      }
    };
  }, [open]);
}
