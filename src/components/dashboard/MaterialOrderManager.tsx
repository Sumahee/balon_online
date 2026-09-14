"use client";

import React, { useState } from "react";
import { MaterialOrderItem } from "@/types";
import { getMaterialSummary } from "@/lib/materialUtils";
import { CheckCircle2, AlertTriangle, Plus, Trash2, Box, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialOrderManagerProps {
  orders: MaterialOrderItem[];
  onChange: (updatedOrders: MaterialOrderItem[]) => void;
  title?: string;
  readOnly?: boolean;
}

const COMMON_PRESETS = [
  "18T PET 합판",
  "15T LPM 보드",
  "19T 원목 무늬목",
  "5T 강화유리",
  "언더레일 댐핑",
  "1mm ABS 엣지",
  "블룸 댐핑 힌지",
  "알루미늄 프레임",
];

export function MaterialOrderManager({
  orders,
  onChange,
  title = "자재 발주 리스트",
  readOnly = false,
}: MaterialOrderManagerProps) {
  const [newItemName, setNewItemName] = useState("");
  const summary = getMaterialSummary(orders);

  const handleAddItem = (nameToAdd?: string) => {
    const targetName = (nameToAdd || newItemName).trim();
    if (!targetName) return;

    // Check if already exists to avoid exact duplicates if needed, or just append
    const newItem: MaterialOrderItem = {
      id: `mo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: targetName,
      isOrdered: false,
    };

    onChange([...orders, newItem]);
    if (!nameToAdd) setNewItemName("");
  };

  const handleToggleOrdered = (id: string) => {
    const updated = orders.map((item) =>
      item.id === id ? { ...item, isOrdered: !item.isOrdered } : item
    );
    onChange(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = orders.filter((item) => item.id !== id);
    onChange(updated);
  };

  return (
    <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
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

        <span className="text-[10px] text-slate-500">
          품목별 체크박스를 눌러 발주완료 / 미발주 상태를 즉시 전환하세요.
        </span>
      </div>

      {/* Material Items Checklist */}
      {orders.length === 0 ? (
        <div className="p-3 text-center text-xs text-slate-400 italic bg-white/70 rounded-xl border border-dashed border-slate-200">
          등록된 발주 필요 자재가 없습니다. 아래에서 품목을 입력하거나 추천 자재 버튼을 눌러 추가하세요.
        </div>
      ) : (
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
              placeholder="새 발주 품목 입력 (예: 18T PET 합판 10장, 강화유리 2장)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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

          {/* Preset Recommendation Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> 빠른 입력:
            </span>
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddItem(preset)}
                className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-900 rounded-lg transition cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
