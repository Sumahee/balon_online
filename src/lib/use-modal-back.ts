"use client";
import { useEffect, useRef } from "react";
type Layer = { marker: string; owned: boolean; close: () => boolean | void };
const layers: Layer[] = [];
let suppressedPops = 0;
function handleBack() {
  if (suppressedPops) { suppressedPops--; return; }
  const layer = layers.at(-1);
  if (!layer?.owned) return;
  if (layer.close() === false) {
    window.history.pushState({ ...window.history.state, baronModal: layer.marker }, "", window.location.href);
  } else layer.owned = false;
}
// Only the top overlay handles Back; rejecting a close restores its entry.
export function useModalBack(open: boolean, onClose: () => boolean | void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const layer: Layer = { marker: crypto.randomUUID(), owned: false, close: () => closeRef.current() };
    if (!layers.length) { suppressedPops = 0; window.addEventListener("popstate", handleBack); }
    layers.push(layer);
    const frame = requestAnimationFrame(() => {
      window.history.pushState({ ...window.history.state, baronModal: layer.marker }, "", window.location.href);
      layer.owned = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      const index = layers.indexOf(layer);
      if (index >= 0) layers.splice(index, 1);
      if (layer.owned && window.history.state?.baronModal === layer.marker) {
        layer.owned = false;
        if (layers.length) suppressedPops++;
        window.history.back();
      }
      if (!layers.length) window.removeEventListener("popstate", handleBack);
    };
  }, [open]);
}
