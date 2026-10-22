"use client";

import { useEffect, useState } from "react";
import { HardDrive, RefreshCw } from "lucide-react";
import { requestApi } from "@/lib/api-client";

type Usage = { totalBytes: number; objectCount: number; checkedAt: string; warningBytes: number; overWarning: boolean };
function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function StorageUsage({ saving }: { saving: boolean }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const load = async () => {
      if (running || saving) return;
      running = true;
      setBusy(true);
      try {
        const response = await requestApi<Usage>("/api/storage-usage", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
        if (!response.data) throw new Error("저장 용량 응답이 없습니다.");
        if (!controller.signal.aborted) { setUsage(response.data); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("용량 조회 실패 · 다시 확인해주세요.");
      } finally {
        running = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [saving, refresh]);

  return <section aria-label="전체 저장 용량" className={`rounded-2xl border px-4 py-3 ${usage?.overWarning ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <HardDrive className="h-5 w-5 text-slate-500" aria-hidden="true" />
      <span className="text-sm font-semibold text-slate-700">전체 저장 용량</span>
      <span aria-live="polite" className="text-lg font-bold tabular-nums text-slate-900">{usage ? formatBytes(usage.totalBytes) : busy ? "확인 중…" : "확인 필요"}</span>
      <span className="text-xs text-slate-500">{usage ? `파일 ${usage.objectCount.toLocaleString()}개 · ` : ""}8 GB 초과 시 알림</span>
      <button type="button" disabled={busy || saving} onClick={() => setRefresh(value => value + 1)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label="저장 용량 새로고침"><RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />새로고침</button>
    </div>
    {usage && <p className="mt-1 text-xs text-slate-500">R2 버킷 전체 · 마지막 확인 {new Date(usage.checkedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}{error ? " · 이전 조회값" : ""}</p>}
    {usage?.overWarning && <p role="alert" className="mt-2 text-sm font-semibold text-amber-800">저장 용량이 8 GB를 초과했습니다. 불필요한 파일을 확인해주세요.</p>}
    {error && <p role="status" className="mt-2 text-xs text-red-700">{error}</p>}
  </section>;
}
