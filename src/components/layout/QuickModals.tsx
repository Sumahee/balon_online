"use client";

import { AsIntakeFields } from "@/components/as/AsIntakeFields";
import { WorkEditorModal } from "@/components/common/WorkEditorModal";
import { useData } from "@/context/DataContext";
import { getToday } from "@/lib/date";
import { Priority } from "@/types";
import { Building,Calendar,MapPin,Wrench,X } from "lucide-react";
import React,{ useState } from "react";


export function QuickModals() {
  const { quickModalType, setQuickModalType, addAsItem, isSaving } = useData();
  // AS form state
  const [asForm, setAsForm] = useState<{
    installer: string;
    receivedDate: string;
    asDate: string;
    serviceType?: "유상" | "무상";
    paidReason?: "고객과실" | "기간만료" | "";
    clientName: string;
    constructDate: string;
    siteAddress: string;
    reason: string;
    technician: string;
    contactPhone: string;
    priority: Priority;
  }>({
    installer: "",
    receivedDate: "",
    asDate: "",
    serviceType: undefined,
    paidReason: "",
    clientName: "",
    constructDate: "",
    siteAddress: "",
    reason: "",
    technician: "",
    contactPhone: "010-",
    priority: "긴급",
  });

  if (!quickModalType) return null;

  if (quickModalType === "work") return <WorkEditorModal onClose={() => setQuickModalType(null)} />;

  const handleAsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      if (!asForm.clientName.trim() || !asForm.siteAddress.trim() || !asForm.reason.trim()) {
        alert("업체명, 현장주소, A/S 사유를 모두 입력해 주세요.");
        return;
      }

      await addAsItem({
        type: "as",
        clientName: asForm.clientName,
        constructDate: asForm.constructDate,
        installer: asForm.installer,
        receivedDate: asForm.receivedDate || getToday(),
        asDate: asForm.asDate,
        serviceType: asForm.serviceType,
        paidReason: asForm.paidReason,
        siteAddress: asForm.siteAddress,
        reason: asForm.reason,
        resultStatus: "접수",
        resolutionDetails: "A/S 접수 완료. 담당자 확인 중.",
        technician: asForm.technician,
        contactPhone: asForm.contactPhone,
        priority: asForm.priority,
      });

      setAsForm({
        installer: "",
        receivedDate: "",
        asDate: "",
        serviceType: undefined,
    paidReason: "",
        clientName: "",
        constructDate: "",
        siteAddress: "",
        reason: "",
        technician: "",
        contactPhone: "010-",
        priority: "긴급",
      });
      setQuickModalType(null);
    } catch {
      // DataContext displays the error; leave the form open for retry.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg text-white ${
                "bg-rose-600"
              }`}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                신규 A/S 접수
              </h2>
              <p className="text-xs text-slate-500">
                시공 현장 A/S 접수 내역을 등록합니다.
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuickModalType(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: AS Form */}
        {quickModalType === "as" && (
          <form onSubmit={handleAsSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  업체명 / 의뢰인 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="예: (주)디자인에이치"
                    value={asForm.clientName}
                    onChange={(e) => setAsForm({ ...asForm, clientName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">최초 시공일</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={asForm.constructDate}
                    aria-label="최초 시공일"
                    onChange={(e) => setAsForm({ ...asForm, constructDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                현장 주소 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="예: 서울시 서초구 반포동 104동 1201호"
                  value={asForm.siteAddress}
                  onChange={(e) => setAsForm({ ...asForm, siteAddress: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                A/S 발생 사유 <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="예: 주방 아일랜드 서랍 2단 언더레일 댐핑 유격 및 처짐 발생..."
                value={asForm.reason}
                onChange={(e) => setAsForm({ ...asForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <AsIntakeFields value={{...asForm, receivedDate: asForm.receivedDate || getToday()}} onChange={patch=>setAsForm({...asForm,...patch})} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">우선 대응도</label>
                <select
                  value={asForm.priority}
                  onChange={(e) => setAsForm({ ...asForm, priority: e.target.value as Priority })}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                >
                  <option value="긴급">긴급 대응</option>
                  <option value="높음">높음</option>
                  <option value="보통">보통</option>
                  <option value="낮음">낮음</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">A/S 처리 담당기사</label>
                <input
                  type="text"
                  value={asForm.technician}
                  aria-label="A/S 처리 담당기사"
                  onChange={(e) => setAsForm({ ...asForm, technician: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">현장 연락처</label>
                <input
                  type="text"
                  value={asForm.contactPhone}
                  onChange={(e) => setAsForm({ ...asForm, contactPhone: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickModalType(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit" disabled={isSaving} aria-busy={isSaving}
                className="px-5 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                A/S 즉시 접수하기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
