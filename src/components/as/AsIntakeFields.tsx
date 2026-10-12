"use client";
import type { AsItem } from "@/types";

type Intake = Pick<AsItem, "installer" | "receivedDate" | "asDate" | "serviceType" | "paidReason">;
export function AsIntakeFields({ value, onChange }: { value: Intake; onChange: (patch: Partial<Intake>) => void }) {
  const inputClass = "mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white";
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
    <label>최초 시공자<input type="text" value={value.installer ?? ""} placeholder="시공자 이름" onChange={e=>onChange({installer:e.target.value})} className={inputClass} /></label>
    <label>A/S 접수일<input type="date" required value={value.receivedDate ?? ""} onChange={e=>onChange({receivedDate:e.target.value})} className={inputClass} /></label>
    <label>A/S 처리 예정일<input type="date" value={value.asDate ?? ""} onChange={e=>onChange({asDate:e.target.value})} className={inputClass} /><span className="mt-1 block font-normal text-slate-500">미정이면 비워두세요.</span></label>
    <label>A/S 구분<select required value={value.serviceType ?? ""} onChange={e=>onChange({serviceType:e.target.value as AsItem["serviceType"],paidReason:""})} className={inputClass}><option value="" disabled>선택해주세요</option><option value="무상">무상 A/S</option><option value="유상">유상 A/S</option></select></label>
    {value.serviceType === "유상" && <label>유상 사유<select required value={value.paidReason ?? ""} onChange={e=>onChange({paidReason:e.target.value as AsItem["paidReason"]})} className={inputClass}><option value="" disabled>선택해주세요</option><option value="고객과실">고객과실</option><option value="기간만료">기간만료</option></select></label>}
  </div>;
}
