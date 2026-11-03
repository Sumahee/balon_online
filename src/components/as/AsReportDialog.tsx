"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, RefreshCw, X } from "lucide-react";
import type { AsItem } from "@/types";
import { requestApi } from "@/lib/api-client";
import { asReportRangeError, buildAsReport, defaultAsReportRange, shiftReportDate } from "@/lib/as-report";
import { AsWeeklyReport } from "./AsWeeklyReport";
import styles from "./as-report.module.css";

export function AsReportDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [range, setRange] = useState(() => defaultAsReportRange());
  const [data, setData] = useState<{ items: AsItem[]; generatedAt: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const rangeError = asReportRangeError(range.start, range.end);
  const report = useMemo(() => data && !rangeError ? buildAsReport(data.items, range.start, range.end) : null, [data, range.start, range.end, rangeError]);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let active = true;
    requestApi<AsItem[]>("/api/posts?type=as").then(result => {
      if (!Array.isArray(result.data)) throw new Error("A/S 데이터를 확인할 수 없습니다.");
      if (!("isDb" in result) || result.isDb !== true) throw new Error("실제 A/S 저장 서버에 연결할 수 없습니다. 연결 후 다시 조회해 주세요.");
      if (active) setData({ items: result.data, generatedAt: new Date().toISOString() });
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "A/S 보고서를 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  function refresh() { setData(null); setError(""); setLoading(true); setRevision(v => v + 1); }
  function moveWeek(days: number) { if (!rangeError) setRange({ start: shiftReportDate(range.start, days), end: shiftReportDate(range.end, days) }); }

  return <>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="as-report-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
      <div className={styles.controls}>
        <div className={styles.titleRow}><h2 id="as-report-title">A/S 주간 보고서</h2><button type="button" onClick={onClose} aria-label="보고서 닫기" autoFocus><X size={20} /></button></div>
        <p className={styles.help}>접수일 기준으로 월요일~토요일을 주별로 묶습니다. 검색·상태 필터와 관계없이 선택 기간 전체를 집계합니다. 최대 366일까지 선택할 수 있습니다.</p>
        <div className={styles.fields}>
          <label>보고서 시작일<input type="date" value={range.start} onInput={e => { const start = e.currentTarget.value; setRange(current => ({ ...current, start })); }} /></label>
          <label>보고서 종료일<input type="date" value={range.end} onInput={e => { const end = e.currentTarget.value; setRange(current => ({ ...current, end })); }} /></label>
          <button type="button" className={styles.button} disabled={!!rangeError} onClick={() => moveWeek(-7)}>이전 주</button>
          <button type="button" className={styles.button} onClick={() => setRange(defaultAsReportRange())}>이번 주</button>
          <button type="button" className={styles.button} disabled={!!rangeError} onClick={() => moveWeek(7)}>다음 주</button>
          <button type="button" className={styles.button} disabled={loading} onClick={refresh}><RefreshCw size={15} />다시 조회</button>
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={loading || !!error || !report?.weeks.length || !report.summary.total} onClick={() => window.print()}><Printer size={15} />인쇄 · PDF 저장</button>
        </div>
        {(rangeError || error) && <p role="alert" className={styles.error}>{rangeError || error}</p>}
        <p role="status" className={styles.message}>{loading ? "최신 A/S 기록을 불러오는 중…" : report ? `${report.weeks.length}주 · 총 ${report.summary.total}건 (접수 ${report.summary.received} · 처리중 ${report.summary.processing} · 완료 ${report.summary.completed})${report.excludedSundays ? ` · 일요일 ${report.excludedSundays}건 제외` : ""}${report.undated ? ` · 전체 기록 중 접수일 확인 불가 ${report.undated}건 제외` : ""}` : "기간과 조회 상태를 확인해 주세요."}</p>
        {!loading && report && report.summary.total === 0 && <p className={styles.message}>선택 기간에 출력할 A/S 접수 기록이 없습니다.</p>}
      </div>
      <div className={styles.preview}>{!loading && !error && report && data && <AsWeeklyReport report={report} generatedAt={data.generatedAt} />}</div>
    </dialog>
    {!loading && !error && report && data && createPortal(<div className={styles.printRoot} id="as-weekly-report"><AsWeeklyReport report={report} generatedAt={data.generatedAt} /></div>, document.body)}
  </>;
}
