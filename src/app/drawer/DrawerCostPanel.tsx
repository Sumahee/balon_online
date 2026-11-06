"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawerCalcResult } from "@/types";
import { requestApi } from "@/lib/api-client";
import { calculateDrawer } from "@/lib/drawerEngine";
import { calculateDrawerCost, DRAWER_COMPONENTS, DRAWER_SHEETS, emptyDrawerPrices, type DrawerPriceBook, type DrawerPrices } from "@/lib/drawer-pricing";

const won = (value: number | null) => value === null ? "단가 미입력" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원`;
const button = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";

export function useDrawerPriceBook() {
  const [book, setBook] = useState<DrawerPriceBook | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    requestApi<DrawerPriceBook>("/api/drawer-prices")
      .then(response => { if (active) { setBook(response.data!); setError(""); } })
      .catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  return { book, setBook, error, loading, reload: () => { setLoading(true); setError(""); setRefresh(v => v + 1); } };
}

export function drawerCostText(result: DrawerCalcResult, book: DrawerPriceBook | null) {
  if (!book) return ["[자재 원가] 저장된 단가 조회 전"];
  const cost = calculateDrawerCost(result, book.prices);
  if (!cost) return ["[자재 원가] 580 기준 바닥형 3단에서만 지원"];
  return ["[자재 원가 · 저장 단가 기준]", ...cost.lines.map(line => `${line.name}: ${line.count}${line.unit} × ${won(line.unitPrice)} = ${won(line.amount)}`),
    `총 자재비: ${won(cost.total)} / 서랍장 개당: ${won(cost.perCabinet)}`,
    `잔재+톱날 손실: ${cost.remainingArea.toFixed(3)}m² (개당 ${cost.remainingAreaPerCabinet.toFixed(3)}m²)`,
    "레일 본체·손잡이·인건비·가공비·배송비·별도 부가세 제외. 미입력 단가가 있으면 합계 미확정."];
}

export default function DrawerCostPanel({ result, pricing }: { result: DrawerCalcResult; pricing: ReturnType<typeof useDrawerPriceBook> }) {
  const { book, loading, error, reload, setBook } = pricing;
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<DrawerPrices>(emptyDrawerPrices);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const cost = useMemo(() => calculateDrawerCost(result, book?.prices ?? emptyDrawerPrices()), [result, book]);
  const comparison = useMemo(() => {
    if (!cost) return [];
    return [...new Set([1, 2, 5, 10, cost.quantity])].sort((a, b) => a - b).map(quantity => {
      const calc = calculateDrawer({ ...result.input, cabinetQuantity: quantity });
      return { sheets: calc.totalSheetsAllMaterials, ...calculateDrawerCost(calc, book?.prices ?? emptyDrawerPrices())! };
    });
  }, [result, book, cost]);
  function open() {
    if (!book) return;
    setDraft({ ...book.prices }); setRevision(book.revision); setSaveError(""); setNotice(""); dialog.current?.showModal();
  }
  function close() {
    if (saving) return;
    if (JSON.stringify(draft) !== JSON.stringify(book?.prices) && !window.confirm("수정한 단가를 저장하지 않고 닫을까요?")) return;
    dialog.current?.close();
  }
  async function save() {
    if (saving) return;
    setSaving(true); setSaveError("");
    try {
      const response = await requestApi<DrawerPriceBook>("/api/drawer-prices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prices: draft, revision }) });
      setBook(response.data!); dialog.current?.close(); setNotice("단가를 저장하고 원가를 다시 계산했습니다.");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "단가를 저장하지 못했습니다."); }
    finally { setSaving(false); }
  }
  async function reloadDraft() {
    if (!window.confirm("입력한 단가 대신 서버의 최신 단가를 불러올까요?")) return;
    setSaving(true); setSaveError("");
    try {
      const response = await requestApi<DrawerPriceBook>("/api/drawer-prices");
      setBook(response.data!); setDraft({ ...response.data!.prices }); setRevision(response.data!.revision);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "단가를 불러오지 못했습니다."); }
    finally { setSaving(false); }
  }
  const priceInput = (id: string, name: string, unit: string) => <label className="flex items-center justify-end gap-1">
    <input aria-label={`${name} ${unit}당 단가`} type="number" min="0" max="100000000" step="0.01" value={draft[id] ?? ""} placeholder="미입력" onChange={e => setDraft(current => ({ ...current, [id]: e.target.value === "" ? null : Number(e.target.value) }))} className="w-24 rounded border border-slate-300 px-2 py-2 text-right sm:w-28" /><span className="text-xs text-slate-500">원/{unit}</span>
  </label>;
  return <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">제작 수량별 자재 원가</h3><p className="mt-1 text-xs text-slate-500">검토표 기준 부품 16종 + 18T·15T·5T 원장</p></div><button className={button} onClick={open} disabled={loading || !book || !!error}>부품·자재 단가 관리</button></div>
    {loading && <p role="status" className="text-sm text-slate-500">저장된 단가를 불러오는 중…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-700">{error}<button className={button} onClick={reload} disabled={loading}>다시 불러오기</button></div>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {!cost ? <p className="text-sm text-amber-800">이번 부품 수량·원가 기준은 바닥형 3단입니다. 다른 유형·단수는 기존 재단 계산을 유지하며 원가 합계를 표시하지 않습니다.</p> : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['제작 수량', `${cost.quantity}개`], ['합판 원장', `${result.totalSheetsAllMaterials}장`], ['부품 총수량', `${cost.hardwareCount}개`], ['서랍장 개당 자재비', book ? won(cost.perCabinet) : '단가 조회 필요']].map(([label, value]) => <div key={label} className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-lg font-bold text-blue-950">{value}</p></div>)}
      </div>
      {book && <>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm"><b>총 자재비 {won(cost.total)}</b><span>합판 {won(cost.lines.some(l => l.unit === "장" && l.amount === null) ? null : cost.materialTotal)}</span><span>부품 {won(cost.lines.some(l => l.unit === "개" && l.amount === null) ? null : cost.hardwareTotal)}</span></div>
        {cost.missing.length > 0 && <p className="text-xs text-amber-800">단가 미입력 {cost.missing.length}종 · 입력된 항목의 부분 합계 {won(cost.knownTotal)}. 모든 단가를 입력해야 총액·개당 금액이 확정됩니다. 무료 항목은 0을 입력하세요.</p>}
      </>}
      <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-right text-sm"><caption className="mb-2 text-left font-semibold">함께 재단할 때의 수량별 비교</caption><thead className="bg-slate-50"><tr><th className="p-2">제작 수량</th><th className="p-2">원장</th><th className="p-2">잔재+톱날 손실</th><th className="p-2">개당 손실</th><th className="p-2">개당 자재비</th></tr></thead><tbody>{comparison.map(row => <tr key={row.quantity} className={row.quantity === cost.quantity ? "border-t bg-blue-50 font-semibold" : "border-t border-slate-100"}><td className="p-2">{row.quantity}개</td><td className="p-2">{row.sheets}장</td><td className="p-2">{row.remainingArea.toFixed(3)}m²</td><td className="p-2">{row.remainingAreaPerCabinet.toFixed(3)}m²</td><td className="p-2">{book ? won(row.perCabinet) : "조회 필요"}</td></tr>)}</tbody></table></div>
      <details><summary className="cursor-pointer text-sm font-semibold">항목별 수량·단가·금액 보기</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[450px] text-right text-xs"><thead className="bg-slate-50"><tr><th className="p-2 text-left">품목</th><th className="p-2">총수량</th><th className="p-2">단가</th><th className="p-2">금액</th></tr></thead><tbody>{cost.lines.map(line => <tr key={line.id} className="border-t border-slate-100"><td className="p-2 text-left">{line.name}</td><td className="p-2">{line.count}{line.unit}</td><td className="p-2">{book ? won(line.unitPrice) : "조회 필요"}</td><td className="p-2">{book ? won(line.amount) : "조회 필요"}</td></tr>)}</tbody></table></div></details>
      <p className="text-xs leading-5 text-slate-500">원장 1,220×2,440mm, 톱날 여유 4mm 기준으로 전체 수량을 함께 재배치합니다. 합판비는 필요한 원장 구매 장수 기준이며, 잔재+톱날 손실에는 재사용 가능한 조각과 절단 손실이 함께 포함됩니다. 여러 개 제작 시 개당 잔여 면적을 비교하세요. 배치는 예상치이며 최소 장수를 보장하지 않습니다.</p>
      <p className="text-xs text-amber-800">표에 없는 레일 본체(서랍장당 3조)·손잡이·인건비·가공비·배송비·별도 부가세는 금액에서 제외됩니다.</p>
    </>}
    <dialog ref={dialog} aria-labelledby="drawer-prices-title" onCancel={e => { e.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(760px,94vw)] overflow-y-auto rounded-2xl p-0 shadow-2xl backdrop:bg-black/40">
      <form onSubmit={e => { e.preventDefault(); void save(); }} className="p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="drawer-prices-title" className="text-lg font-bold">부품·자재 단가 관리</h2><button type="button" className={button} onClick={close} disabled={saving}>닫기</button></div>
        <p className="mb-4 text-sm text-slate-600">표의 16개 품목을 그대로 관리합니다. 부품은 1개당, 합판은 원장 1장당 금액을 입력하세요. 빈칸은 미입력, 0은 무료입니다. 저장한 단가는 직원들이 함께 사용합니다.</p>
        {saveError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="mb-2 text-left font-bold">부품 단가 · 580 3단 1개 기준</caption><thead className="bg-slate-50 text-left"><tr><th className="p-2">품목</th><th className="hidden p-2 sm:table-cell">수량</th><th className="p-2 text-right">단가</th></tr></thead><tbody>{DRAWER_COMPONENTS.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="p-2">{item.name}<span className="mt-1 block text-xs text-slate-500 sm:hidden">기준 {item.count}개</span></td><td className="hidden p-2 sm:table-cell">{item.count}개</td><td className="p-2">{priceInput(item.id, item.name, "개")}</td></tr>)}</tbody></table></div>
          <div><h3 className="mb-2 font-bold">합판 원장 단가 · 1,220×2,440mm</h3>{DRAWER_SHEETS.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm"><span>{item.name}</span>{priceInput(item.id, item.name, "장")}</div>)}</div>
        </fieldset>
        <div className="sticky bottom-0 mt-5 flex flex-wrap justify-end gap-2 border-t bg-white py-3"><button type="button" className={button} onClick={reloadDraft} disabled={saving}>최신 단가 다시 불러오기</button><button type="submit" className={`${button} !border-blue-600 !bg-blue-600 !text-white`} disabled={saving}>{saving ? "저장 중…" : "단가 저장"}</button></div>
      </form>
    </dialog>
  </section>;
}
