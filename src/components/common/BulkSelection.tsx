"use client";

import { useState } from "react";

export function useBulkSelection(ids: string[], remove: (id: string) => Promise<void>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const visible = ids.filter(id => selected.has(id));
  const toggle = (id: string) => setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected(prev => { const next = new Set(prev); const all = ids.length > 0 && ids.every(id => prev.has(id)); for (const id of ids) { if (all) next.delete(id); else next.add(id); } return next; });
  const deleteSelected = async () => {
    if (deleting || !visible.length || !confirm(`선택한 ${visible.length}건을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    setMessage("");
    let failures = 0;
    // Sequential deletes also keep comment photo indexes stable in the shared record.
    for (const id of visible) {
      try { await remove(id); setSelected(prev => { const next = new Set(prev); next.delete(id); return next; }); }
      catch { failures++; }
    }
    setMessage(failures ? `${failures}건을 삭제하지 못했습니다. 선택된 항목을 다시 삭제해주세요.` : `${visible.length}건을 삭제했습니다.`);
    setDeleting(false);
  };
  return { selected, deleting, message, visible, toggle, toggleAll, deleteSelected, allSelected: ids.length > 0 && visible.length === ids.length };
}

export function BulkSelectionBar({ selection, disabled = false }: { selection: ReturnType<typeof useBulkSelection>; disabled?: boolean }) {
  return <div className="flex flex-wrap items-center gap-3 text-sm">
    <label className="flex items-center gap-2"><input type="checkbox" aria-label="현재 목록 전체 선택" checked={selection.allSelected} onChange={selection.toggleAll} disabled={selection.deleting} />현재 목록 전체 선택</label>
    <span>{selection.visible.length}건 선택</span>
    <button type="button" onClick={() => void selection.deleteSelected()} disabled={disabled || selection.deleting || !selection.visible.length} className="px-3 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-40">{selection.deleting ? "삭제 중..." : "선택 삭제"}</button>
    {selection.message && <span role="status">{selection.message}</span>}
  </div>;
}
