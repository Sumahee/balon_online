"use client";

import React, { useState } from "react";
import { MaterialOrderItem } from "@/types";
import { getMaterialSummary } from "@/lib/materialUtils";
import { Plus, Trash2, Box, X } from "lucide-react";
import { readMaterialHistory, writeMaterialHistory } from "@/lib/material-history";
import { cn } from "@/lib/utils";

interface MaterialOrderManagerProps {
  orders: MaterialOrderItem[];
  onChange: (updatedOrders: MaterialOrderItem[]) => void | Promise<void>;
  title?: string;
  readOnly?: boolean;
  deferredSave?: boolean;
  autoFocusInput?: boolean;
}

export function MaterialOrderManager({
  orders,
  onChange,
  title = "자재 발주 리스트",
  readOnly = false,
  autoFocusInput = false,
}: MaterialOrderManagerProps) {
  const [history, setHistory] = useState<string[]>([]);
  React.useEffect(() => { setHistory(readMaterialHistory()); }, []);
  const [newItemName, setNewItemName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = React.useRef(false);
  const summary = getMaterialSummary(orders);

  const saveOrders = async (updated: MaterialOrderItem[]) => {
    if (savingRef.current || readOnly) return false;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try { await onChange(updated); return true; }
    catch { setError("자재 발주를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요."); return false; }
    finally { savingRef.current = false; setSaving(false); }
  };

  const handleAddItem = async (nameToAdd?: string) => {
    const targetName = (nameToAdd || newItemName).trim();
    if (!targetName) return;

    // Check if already exists to avoid exact duplicates if needed, or just append
    const newItem: MaterialOrderItem = {
      id: `mo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: targetName,
      isOrdered: false,
    };

    if (await saveOrders([...orders, newItem])) {
      setHistory(writeMaterialHistory(targetName));
      if (!nameToAdd) setNewItemName("");
    }
  };

  const handleToggleOrdered = (id: string) => {
    const updated = orders.map((item) =>
      item.id === id ? { ...item, isOrdered: !item.isOrdered } : item
    );
    void saveOrders(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = orders.filter((item) => item.id !== id);
    void saveOrders(updated);
  };

  return (
    <fieldset disabled={saving} aria-busy={saving} className="min-w-0 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saving && <p role="status" className="text-xs text-slate-500">자재 발주 저장 중…</p>}
      {/* Header & Status Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-amber-600" />
          <h4 className="text-xs font-bold text-slate-900">{title}</h4>
          {orders.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                summary.isAllOrdered
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
              )}
            >
              {summary.isAllOrdered
                ? `✅ 발주완료 (${summary.completed}/${summary.total})`
                : `⚠️ 발주필요 (${summary.completed}/${summary.total} 완료)`}
            </span>
          )}
        </div>

      </div>

      {/* Material Items Checklist */}
      {orders.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {orders.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 text-xs font-medium",
                item.isOrdered
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-white border-rose-200 text-slate-900 shadow-2xs"
              )}
            >
              <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item.isOrdered}
                  onChange={() => !readOnly && handleToggleOrdered(item.id)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 accent-emerald-600"
                />
                <span
                  className={cn(
                    "truncate font-bold text-xs",
                    item.isOrdered && "line-through text-slate-400"
                  )}
                >
                  {item.name}
                </span>
              </label>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  onClick={() => !readOnly && handleToggleOrdered(item.id)}
                  className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition select-none",
                    item.isOrdered
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-500 text-white hover:bg-rose-600"
                  )}
                >
                  {item.isOrdered ? "✅ 발주완료" : "⚠️ 미발주 (클릭시 완료)"}
                </span>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                    title="품목 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Material Item Input & Preset Chips */}
      {!readOnly && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              aria-label="새 발주 품목"
              autoFocus={autoFocusInput}
              placeholder="새 발주 품목 입력 (예: 18T PET 합판 10장, 강화유리 2장)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              className="min-w-0 flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>품목 추가</span>
            </button>
          </div>

          {history.length > 0 && <div className="flex flex-wrap gap-1.5" aria-label="이전에 입력한 품목">{history.map(name => <span key={name} className="inline-flex max-w-full items-center rounded-lg border border-slate-200 bg-white text-xs"><button type="button" onClick={() => setNewItemName(name)} className="truncate px-2 py-1.5 text-slate-700 hover:text-blue-700">{name}</button><button type="button" aria-label={name + " 입력 기록 삭제"} onClick={() => setHistory(writeMaterialHistory(name, true))} className="shrink-0 p-1.5 text-slate-400 hover:text-red-600"><X className="h-3 w-3" /></button></span>)}</div>}
        </div>
      )}
    </fieldset>
  );
}
