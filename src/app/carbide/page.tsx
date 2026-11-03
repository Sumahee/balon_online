"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDot, Plus, Pencil, Search, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { requestApi } from "@/lib/api-client";
import { getToday } from "@/lib/date";
import { CARBIDE_KINDS, CARBIDE_STATUSES, CARBIDE_TYPES, CARBIDE_MATERIALS, CARBIDE_OPTIONS, CARBIDE_PAYMENTS, carbideCosts, emptyCarbideValues, validateCarbideValues, validCarbideDate, type CarbideValues, type CarbideRecord, type CarbideList } from "@/lib/carbide";

const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const primary = `${button} !border-blue-600 !bg-blue-600 !text-white hover:!bg-blue-700`;
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const message = (error: unknown) => error instanceof Error ? error.message : "요청에 실패했습니다. 다시 시도해 주세요.";
const text = (value?: string) => value || "—";
const spec = (item: CarbideValues) => [item.diameter && `외경 ${item.diameter}mm`, item.kerf && `절단폭 ${item.kerf}mm`, item.bore && `내경/샹크 ${item.bore}mm`, item.teeth && `${item.teeth}날`, item.spec].filter(Boolean).join(" · ");
const PAGE_SIZE = 25;

export default function CarbidePage() {
  const [filters, setFilters] = useState({ q: "", from: "", to: "", kind: "", status: "" });
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<CarbideList | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<{ entry?: CarbideRecord } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true); setError(""); setData(null);
      return requestApi<CarbideList>(`/api/carbide?${applied}&offset=${page * PAGE_SIZE}`);
    }).then(result => { if (active && result) { setData(result.data!); setHasMore(!!result.hasMore); } })
      .catch(cause => { if (active) setError(message(cause)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, page, revision]);
  function search(event: React.FormEvent) {
    event.preventDefault();
    if ((filters.from && !validCarbideDate(filters.from)) || (filters.to && !validCarbideDate(filters.to)) || (filters.from && filters.to && filters.from > filters.to)) { setFilterError("조회 시작일과 종료일을 확인해 주세요."); return; }
    setFilterError(""); setPage(0); setApplied(new URLSearchParams(filters).toString()); setRevision(v => v + 1);
  }
  return <div className="space-y-5">
    <PageHeader title="초경 관리" description="날물의 연마·구입·수리 기록과 비용을 관리합니다. 같은 날물은 관리번호를 동일하게 입력해 이력을 찾아보세요." actions={<button type="button" className="action-primary" onClick={() => setEditor({})}><Plus size={16} />기록 등록</button>} />
    {notice && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{notice}</p>}
    <form onSubmit={search} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3"><label className="min-w-48 flex-1"><span className="sr-only">초경 기록 검색</span><input className={input} maxLength={200} value={filters.q} onChange={e => setFilters(current => ({ ...current, q: e.target.value }))} placeholder="날물명, 관리번호, 업체, 설비, 규격, 메모 검색" /></label>
        <label><span className="sr-only">작업 구분</span><select className={input} value={filters.kind} onChange={e => setFilters(current => ({ ...current, kind: e.target.value }))}><option value="">모든 구분</option>{CARBIDE_KINDS.map(kind => <option key={kind}>{kind}</option>)}</select></label>
        <label><span className="sr-only">진행 상태</span><select className={input} value={filters.status} onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}><option value="">모든 상태</option>{CARBIDE_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label></div>
      <div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-xs font-semibold text-slate-600">기록일 시작<input aria-label="조회 시작일" type="date" className={`${input} block`} value={filters.from} onInput={e => { const from = e.currentTarget.value; setFilters(current => ({ ...current, from })); }} /></label><label className="space-y-1 text-xs font-semibold text-slate-600">기록일 종료<input aria-label="조회 종료일" type="date" className={`${input} block`} value={filters.to} onInput={e => { const to = e.currentTarget.value; setFilters(current => ({ ...current, to })); }} /></label>
        <button className={primary} disabled={loading}><Search size={15} />조회</button><button type="button" className={button} disabled={loading} onClick={() => { setFilters({ q: "", from: "", to: "", kind: "", status: "" }); setApplied(""); setPage(0); setFilterError(""); setRevision(v => v + 1); }}>전체 보기</button><button type="button" className={button} disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} />새로고침</button></div>
      {filterError && <p role="alert" className="text-sm text-red-700">{filterError}</p>}
    </form>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" className={`${button} ml-3`} onClick={() => setRevision(v => v + 1)}>다시 조회</button></div>}
    {data && <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["조회 기록", `${data.count}건`], ["기록 금액 · 취소 제외", money(data.summary.amount)], ["완료 금액", money(data.summary.completedAmount)], ["의뢰·진행중", `${data.summary.openCount}건`]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-bold tabular-nums text-slate-900">{value}</p></div>)}</div>
      <p className="text-xs text-slate-500">집계는 현재 조회 조건의 전체 기록 기준입니다. 금액은 입력한 기본비·팁 작업비·배송비·기타비·부가세의 합계이며, 수량은 현재 재고를 의미하지 않습니다.</p>
    </>}
    {loading && <p role="status" className="p-10 text-center text-sm text-slate-500">초경 기록을 불러오는 중…</p>}
    {!loading && data && data.items.length === 0 && <div className="rounded-xl border border-dashed p-12 text-center text-slate-500"><CircleDot className="mx-auto mb-3" size={30} /><p>조회된 초경 기록이 없습니다.</p><button type="button" className={`${button} mt-4`} onClick={() => setEditor({})}>첫 기록 등록</button></div>}
    <div className="space-y-3">{data?.items.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-md px-2 py-1 font-bold ${item.kind === "구입" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"}`}>{item.kind}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{item.status}</span><span className="text-slate-500">{item.date} · {item.quantity}개</span></div><h2 className="mt-3 break-words text-lg font-bold text-slate-900">{item.toolName}</h2><p className="mt-1 break-words text-xs text-slate-500">{[item.toolCode && `관리번호 ${item.toolCode}`, item.toolType, item.brandModel, item.machine].filter(Boolean).join(" · ")}</p></div><div className="flex items-center gap-3"><strong className="tabular-nums text-slate-900">{money(item.total)}</strong><button type="button" className={button} onClick={() => { setEditor({ entry: item }); setNotice(""); }} aria-label={`${item.toolName} 수정`}><Pencil size={14} />수정</button></div></div>
      {spec(item) && <p className="mt-3 break-words text-sm text-slate-700">{spec(item)}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{item.options.map(option => <span key={option} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">{option}{(option === "팁수리" || option === "팁교체") && item.tipCount > 0 ? ` · 총 ${item.tipCount}개` : ""}</span>)}</div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>업체 {text(item.provider)}</span><span>입고 예정 {text(item.expectedDate)}</span><span>완료·입고 {text(item.receivedDate)}</span><span>지급 {item.payment}</span></div>
      <details className="mt-4 border-t border-slate-100 pt-3 text-sm"><summary className="cursor-pointer font-semibold text-slate-700">상세 내역 · 비용 · 메모</summary><div className="mt-3 space-y-3"><dl className="grid gap-3 text-xs sm:grid-cols-3">{[["날물 재질", item.material], ["업체 담당자", text(item.contact)], ["업체 연락처", text(item.phone)], ["명세서·전표번호", text(item.documentNo)], ["등록자", item.author], ["최종 수정자", item.updatedBy]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-800">{value}</dd></div>)}</dl><p className="rounded-lg bg-slate-50 p-3 text-xs leading-6">기본비 {money(item.unitPrice)} × {item.quantity}개 = {money(carbideCosts(item).base)}<br />팁 작업비 {money(item.tipUnitPrice)} × 총 {item.tipCount}개 = {money(carbideCosts(item).tips)}<br />배송비 {money(item.shippingCost)} · 기타비 {money(item.otherCost)} · 부가세 {money(item.vat)}<br /><b>합계 {money(item.total)}</b></p><p className="whitespace-pre-wrap break-words text-sm leading-6">{item.memo || "등록된 메모가 없습니다."}</p><p className="text-xs text-slate-400">등록 {new Date(item.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 수정 {new Date(item.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 수정 {item.revision}차</p></div></details>
    </article>)}</div>
    {data && data.count > 0 && <div className="flex items-center justify-center gap-4"><button type="button" className={button} disabled={page === 0 || loading} onClick={() => setPage(v => v - 1)}>이전</button><span className="text-sm text-slate-500">{page + 1} / {Math.max(1, Math.ceil(data.count / PAGE_SIZE))} 페이지</span><button type="button" className={button} disabled={!hasMore || loading} onClick={() => setPage(v => v + 1)}>다음</button></div>}
    {editor && <CarbideEditor entry={editor.entry} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); setPage(0); setNotice(`${saved.toolName} ${saved.kind} 기록이 서버에 저장되었습니다.`); setRevision(v => v + 1); }} />}
  </div>;
}

type Draft = { [K in Exclude<keyof CarbideValues, "options">]: string } & { options: string[] };
function draftOf(value: CarbideValues): Draft { return Object.fromEntries(Object.entries(value).filter(([key]) => key in emptyCarbideValues()).map(([key, value]) => [key, key === "options" ? [...value] : value === null ? "" : String(value)])) as Draft; }

function CarbideEditor({ entry, onClose, onSaved }: { entry?: CarbideRecord; onClose: () => void; onSaved: (value: CarbideRecord) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [id] = useState(() => entry?.id || crypto.randomUUID());
  const [draft, setDraft] = useState(() => draftOf(entry || emptyCarbideValues()));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", before); return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function change(key: keyof Draft, value: string | string[]) { setDirty(true); setDraft(current => ({ ...current, [key]: value })); }
  function close() { if (!busy && (!dirty || window.confirm("저장하지 않은 입력 내용을 취소할까요?"))) onClose(); }
  let total: number | null = null;
  try { total = carbideCosts({ quantity: Number(draft.quantity), unitPrice: Number(draft.unitPrice), tipCount: Number(draft.tipCount), tipUnitPrice: Number(draft.tipUnitPrice), shippingCost: Number(draft.shippingCost), otherCost: Number(draft.otherCost), vat: Number(draft.vat) }).total; } catch { /* Validation below retains all entered fields. */ }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const value = validateCarbideValues(draft);
      const result = await requestApi<CarbideRecord>("/api/carbide", { method: entry ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, id, ...(entry ? { revision: entry.revision } : {}) }) });
      onSaved(result.data!);
    } catch (cause) { setError(message(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  function field(key: Exclude<keyof Draft, "options">, label: string, type = "text", required = false, maxLength = 150) {
    return <label className="block space-y-1.5 text-xs font-semibold text-slate-600" key={key}>{label}{required && <span className="text-red-600"> *</span>}<input className={input} type={type} value={draft[key]} required={required} maxLength={maxLength} min={type === "number" ? 0 : undefined} step={type === "number" && ["diameter", "kerf", "bore"].includes(key) ? "any" : type === "number" ? 1 : undefined} onInput={event => change(key, event.currentTarget.value)} /></label>;
  }
  function select(key: Exclude<keyof Draft, "options">, label: string, values: readonly string[]) {
    return <label className="block space-y-1.5 text-xs font-semibold text-slate-600">{label}<select className={input} value={draft[key]} onChange={e => { change(key, e.target.value); if (key === "status" && e.target.value === "완료" && !draft.receivedDate) change("receivedDate", getToday()); }}>{values.map(value => <option key={value}>{value}</option>)}</select></label>;
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="carbide-editor-title" className="m-auto max-h-[94dvh] w-[calc(100%-24px)] max-w-4xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 backdrop:bg-slate-950/60">
    <form onSubmit={save}><header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-5"><div><h2 id="carbide-editor-title" className="text-lg font-bold">{entry ? "초경 기록 수정" : "초경 기록 등록"}</h2><p className="mt-1 text-xs text-slate-500">필수 항목과 필요한 옵션만 입력하세요. 잘못된 기록은 상태를 ‘취소’로 남길 수 있습니다.</p></div><button type="button" disabled={busy} onClick={close} aria-label="초경 기록 닫기" className="rounded-lg p-2"><X size={20} /></button></header>
      <fieldset disabled={busy} className="space-y-6 p-5 disabled:opacity-60 sm:p-6">
        <section className="space-y-3"><h3 className="font-bold">기본 기록</h3><div className="grid gap-4 sm:grid-cols-3">{field("date", "기록일 (의뢰·구입일)", "date", true)}{select("kind", "구분", CARBIDE_KINDS)}{select("status", "진행 상태", CARBIDE_STATUSES)}</div><div className="grid gap-4 sm:grid-cols-2">{field("toolName", "날물명", "text", true, 100)}{field("toolCode", "관리번호", "text", false, 80)}{select("toolType", "날물 종류", CARBIDE_TYPES)}{field("quantity", "날물 수량 (개)", "number", true)}</div><p className="text-xs text-slate-500">같은 날물을 재연마할 때 관리번호를 그대로 사용하면 검색으로 이력을 모아볼 수 있습니다.</p></section>
        <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold">날물 사양 · 사용 설비 (선택)</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{select("material", "날물 재질", CARBIDE_MATERIALS)}{field("brandModel", "제조사·모델")}{field("diameter", "외경 D (mm)", "number")}{field("kerf", "절단폭·날 두께 B (mm)", "number")}{field("bore", "내경·샹크경 d (mm)", "number")}{field("teeth", "날수 Z (개)", "number")}{field("spec", "추가 규격·용도", "text", false, 300)}{field("machine", "사용 설비·보관 위치")}</div></details>
        <section className="space-y-3"><h3 className="font-bold">작업 옵션</h3><div className="flex flex-wrap gap-2">{CARBIDE_OPTIONS.map(option => <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${draft.options.includes(option) ? "border-blue-400 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}><input type="checkbox" checked={draft.options.includes(option)} onChange={e => change("options", e.target.checked ? [...draft.options, option] : draft.options.filter(value => value !== option))} />{option}</label>)}</div></section>
        <section className="space-y-3"><h3 className="font-bold">업체 · 일정</h3><div className="grid gap-4 sm:grid-cols-3">{field("provider", "거래 업체 (연마·구입처)")}{field("contact", "업체 담당자", "text", false, 80)}{field("phone", "업체 연락처", "tel", false, 80)}{field("expectedDate", "입고 예정일", "date")}{field("receivedDate", "완료·입고일", "date", draft.status === "완료")}{select("payment", "지급 상태", CARBIDE_PAYMENTS)}</div></section>
        <section className="space-y-3"><h3 className="font-bold">비용 (원)</h3><div className="grid gap-4 sm:grid-cols-3">{field("unitPrice", "기본 단가 · 날물 1개당", "number")}{field("tipCount", "전체 팁 작업 개수", "number")}{field("tipUnitPrice", "팁 1개당 추가 금액", "number")}{field("shippingCost", "배송비", "number")}{field("otherCost", "기타 작업비", "number")}{field("vat", "부가세 · 직접 입력", "number")}</div><p className="text-xs leading-6 text-slate-500">기본 단가 × 날물 수량 + 팁 단가 × 전체 팁 개수 + 배송비 + 기타비 + 부가세. 기본 단가에 팁 작업비가 포함됐다면 팁 추가 금액은 0원으로 입력하세요. 부가세는 명세서 기준으로 직접 입력합니다.</p><div className="flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white"><span className="text-sm">기록 합계</span><strong className="text-xl tabular-nums">{total === null ? "금액 확인 필요" : money(total)}</strong></div>{field("documentNo", "명세서·전표번호", "text", false, 100)}</section>
        <label className="block space-y-2 text-sm font-bold">작업 내용 · 파손 부위 · 메모<textarea className={`${input} min-h-28 resize-y font-normal leading-6`} maxLength={6000} value={draft.memo} onChange={e => change("memo", e.target.value)} placeholder="마모·파손 상태, 의뢰 내용, 작업 결과, 다음 점검 참고사항 등을 남겨 주세요." /></label>
      </fieldset>
      <footer className="sticky bottom-0 space-y-3 border-t bg-white p-5">{error && <p role="alert" className="whitespace-pre-wrap text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={close}>취소</button><button className={primary} disabled={busy} aria-busy={busy}>{busy ? "저장 중…" : "서버에 저장"}</button></div></footer>
    </form>
  </dialog>;
}
