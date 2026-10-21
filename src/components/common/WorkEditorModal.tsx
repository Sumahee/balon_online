"use client";

import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getToday } from "@/lib/date";
import { createWorkDraft,prepareWorkDraft,type WorkDraft } from "@/lib/work-form";
import { generateWorkTitle } from "@/lib/work-title";
import { POST_COLORS, BOARD_COLORS, drawingColorCode } from "@/lib/drawing-colors";
import { ClientInfo,WorkItem } from "@/types";
import { X } from "lucide-react";
import { useEffect,useRef,useState,type ReactNode } from "react";
import { UnifiedBoardEditor } from "./UnifiedBoardEditor";
import { DrawingUploadBlock } from "./DrawingUploadBlock";
import { isDrawingAttachment, replaceAttachmentGroup } from "@/lib/drawing-attachments";
import { isCalendarVisible } from "@/lib/calendar-visibility";

import { useModalBack } from "@/lib/use-modal-back";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function ColorSelect({ label, kind, value, onChange }: { label: string; kind: "post" | "board"; value: string; onChange: (value: string) => void }) {
  const colors = kind === "post" ? POST_COLORS : BOARD_COLORS;
  const code = drawingColorCode(value, kind);
  const known = colors.some(([id]) => id === code);
  const [custom, setCustom] = useState(!known);
  return <div className="space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>
    <select aria-label={label} className={inputClass} value={custom || !known ? "CUSTOM" : code} onChange={event => {
      const next = event.target.value;
      setCustom(next === "CUSTOM");
      onChange(next === "CUSTOM" ? "" : colors.find(([id]) => id === next)![1]);
    }}>
      {colors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      <option value="CUSTOM">직접 입력</option>
    </select>
    {(custom || !known) && <input aria-label={label + " 직접 입력"} className={inputClass} value={value} placeholder="컬러명 입력" onChange={event => onChange(event.target.value)} />}
  </div>;
}

export function WorkEditorModal({ item, initialDate, onClose }: { item?: WorkItem; initialDate?: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { addWorkItem, updateWorkItem } = useData();
  const [initial] = useState(() => createWorkDraft(item, getToday(), user?.name || "", initialDate));
  const [draft, setDraft] = useState(initial);
  const [teams, setTeams] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [bodyUploading, setUploading] = useState(false);
  const [drawingUploading, setDrawingUploading] = useState(false);
  const uploading = bodyUploading || drawingUploading;
  const [error, setError] = useState("");
  const [autoTitle, setAutoTitle] = useState(!item);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lock = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const closeRef = useRef<() => boolean>(() => false);
  closeRef.current = () => {
    if (lock.current || uploading) return false;
    if (dirty) { setConfirmDiscard(true); return false; }
    onClose();
    return true;
  };
  useModalBack(true, () => closeRef.current());
  useEffect(() => {
    let active = true;
    fetch("/api/clients").then(res => res.json()).then(data => { if (active && Array.isArray(data.clients)) setClients(data.clients); }).catch(() => {});
    fetch("/api/users", { headers: token ? { Authorization: "Bearer " + token } : {} }).then(res => res.json()).then(data => { if (active) setTeams([...new Set<string>([...(data.staff || []).map((staff: {name: string}) => staff.name), ...(data.installationTeams || [])])]); }).catch(() => {});
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === "Tab") {
        const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex="0"], summary') ?? [])].filter(el => el.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => { active = false; document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", key, true); previous?.focus(); };
  }, []);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty || saving || uploading) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty, saving, uploading]);
  function change<K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) {
    setDraft(prev => { const next = { ...prev, [key]: value }; if (autoTitle && (key === "clientName" || key === "siteAddress")) next.title = generateWorkTitle(next.clientName, next.siteAddress || ""); return next; });
  }
  const text = (key: "clientName" | "siteAddress" | "installationTeam" | "ceilingHeight" | "siteContactPhone" | "postColor" | "boardColor", required = false, list?: string) => <input className={inputClass} value={draft[key] ?? ""} required={required} list={list} onChange={e => change(key, e.target.value)} />;
  function select<K extends keyof WorkDraft>(key: K, options: readonly string[]) {
    return <select className={inputClass} value={String(draft[key] ?? "")} onChange={e => change(key, e.target.value as WorkDraft[K])}>{options.map(value => <option key={value}>{value}</option>)}</select>;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || uploading) return;
    setError("");
    try {
      const payload = prepareWorkDraft(draft);
      lock.current = true; setSaving(true);
      if (item) await updateWorkItem(item.id, payload); else await addWorkItem(payload);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요."); }
    finally { lock.current = false; setSaving(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-0 sm:p-5">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={item ? "업무 수정" : "새 업무 등록"} className="flex h-[100dvh] w-full flex-col bg-white shadow-xl outline-none sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-bold">{item ? "업무 수정" : "새 업무 등록"}</h2><p className="mt-1 text-xs text-slate-500">등록자: {item ? draft.createdBy || "기존 기록 없음" : user?.name || "로그인 확인 필요"}</p></div><button type="button" aria-label="업무 양식 닫기" onClick={() => closeRef.current()} disabled={saving || uploading} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
      {confirmDiscard && <div role="alertdialog" aria-label="저장하지 않은 변경" className="shrink-0 border-b border-amber-200 bg-amber-50 px-5 py-4"><p className="text-sm font-semibold text-amber-950">저장하지 않은 변경이 있습니다. 변경을 버리고 닫으시겠습니까?</p><div className="mt-3 flex gap-2"><button type="button" autoFocus onClick={() => setConfirmDiscard(false)} className="rounded-lg border bg-white px-3 py-2 text-sm">계속 작성</button><button type="button" onClick={onClose} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">변경 버리고 닫기</button></div></div>}
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto"><fieldset disabled={saving || confirmDiscard} className="min-w-0 space-y-4 px-5 py-4 disabled:opacity-70">

            <Field label="제목"><input placeholder="업체명을 입력하면 자동으로 채워집니다" className={inputClass} value={draft.title} onChange={e => { setAutoTitle(false); change("title", e.target.value); }} /></Field>
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="업체명 *">{text("clientName", true, "work-editor-clients")}</Field>
            <datalist id="work-editor-clients">{clients.map(client => <option key={client.id} value={client.name} />)}</datalist>
            <Field label="업무종류"><select aria-label="업무종류" className={inputClass} value={draft.cardType === "도면" ? "도면" : draft.cardType === "자재리스트" ? "자재리스트" : "기타"} onChange={e => { const cardType = e.target.value as WorkDraft["cardType"]; setDraft(prev => ({...prev, cardType, category: cardType === "도면" ? "제작" : cardType === "자재리스트" ? "납품" : "기타", deadlineType: cardType === "도면" ? "시공일" : cardType === "자재리스트" ? "발송일" : "요청일"})); }}><option value="도면">도면작업</option><option value="자재리스트">자재발주</option><option value="기타">기타</option></select></Field>
            <Field label="일정"><div className="flex gap-2"><select aria-label="일정 종류" className={inputClass + " max-w-28"} value={draft.deadlineType === "배송일" ? "발송일" : draft.deadlineType} onChange={e => change("deadlineType", e.target.value as WorkDraft["deadlineType"])}>{[...new Set([draft.cardType === "도면" ? "시공일" : draft.cardType === "자재리스트" ? "발송일" : "요청일", "요청일", draft.deadlineType === "배송일" ? "발송일" : draft.deadlineType])].map(value => <option key={value}>{value}</option>)}</select><input aria-label="예정일" type="date" className={inputClass} required value={draft.deliveryDate} onChange={e => change("deliveryDate", e.target.value)} /></div></Field>
            <Field label="시공팀">{text("installationTeam", false, "work-editor-teams")}</Field>
            <datalist id="work-editor-teams">{teams.map(team => <option key={team} value={team} />)}</datalist>
          </section>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-slate-50 px-3 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={isCalendarVisible(draft)} onChange={e => change("calendarVisible", e.target.checked)} />달력 등록</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={!!draft.confirmationPending} onChange={e => change("confirmationPending", e.target.checked)} />컨펌중</label>
          </div>
          <section className="space-y-2"><h3 className="text-sm font-bold">발주정보 · 이미지</h3><UnifiedBoardEditor minRows={3} placeholder="발주 내용을 적거나 이미지·파일을 붙여넣으세요." description={draft.description ?? ""} onChangeDescription={value => change("description", value)} attachments={draft.attachments.filter(attachment => !isDrawingAttachment(attachment))} onChangeAttachments={value => setDraft(prev => ({ ...prev, attachments: replaceAttachmentGroup(prev.attachments, value, false) }))} onUploadingChange={setUploading} readOnly={saving || drawingUploading} /></section>
          <div className="pt-4"><DrawingUploadBlock attachments={draft.attachments} onChange={value => setDraft(prev => ({ ...prev, attachments: replaceAttachmentGroup(prev.attachments, value, true) }))} onUploadingChange={setDrawingUploading} readOnly={saving || bodyUploading} /></div>
          {draft.cardType === "도면" && <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-bold text-slate-800">제작사양</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="제품 유형">{select("drawingType", ["천정형", "에보라", "옴니버스", "기타"])}</Field>
            <Field label="천정고 (mm)"><input className={inputClass} type="number" min="1" step="any" value={draft.ceilingHeight ?? ""} onChange={e => change("ceilingHeight", e.target.value)} placeholder="예: 2400" /></Field>
            <Field label="현장 주소">{text("siteAddress")}</Field><Field label="현장 연락처">{text("siteContactPhone")}</Field>
            <ColorSelect label="포스트바 컬러" kind="post" value={draft.postColor ?? "미정"} onChange={value => change("postColor", value)} />
            <ColorSelect label="합판 컬러" kind="board" value={draft.boardColor ?? "미정"} onChange={value => change("boardColor", value)} />
          </div></details>}
          <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-bold text-slate-800">자재 발주 품목{draft.materialOrders?.length ? " · " + draft.materialOrders.length + "개" : ""}</summary><div className="mt-3"><MaterialOrderManager deferredSave orders={draft.materialOrders ?? []} onChange={value => change("materialOrders", value)} /></div></details>
          <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-bold text-slate-800">추가 설정</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="우선순위">{select("priority", ["보통", "낮음", "높음", "긴급"])}</Field><Field label="진행 상태">{select("status", ["대기", "오피스", "공장", "준비완료", "시공완료"])}</Field>
          </div></details>
        </fieldset></div>
        <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:rounded-b-2xl">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex items-center justify-between gap-3"><span role="status" className="text-xs text-slate-500">{uploading ? "첨부 처리 중…" : saving ? "저장 중…" : dirty ? "저장하지 않은 변경" : ""}</span><div className="flex gap-2"><button type="button" disabled={saving || uploading} onClick={() => closeRef.current()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">취소</button><button type="submit" disabled={saving || uploading} aria-busy={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "저장 중…" : item ? "저장" : "등록"}</button></div></div></footer>
      </form>
    </div>
  </div>;
}
