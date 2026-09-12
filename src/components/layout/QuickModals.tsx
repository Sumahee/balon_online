"use client";

import React, { useState } from "react";
import { X, Plus, Wrench, Calendar, MapPin, Building, User, FileText } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Priority, WorkItem, CardType, DeadlineType } from "@/types";

export function QuickModals() {
  const { quickModalType, setQuickModalType, addWorkItem, addAsItem } = useData();

  // Work form state
  const [workForm, setWorkForm] = useState<{
    title: string;
    clientName: string;
    cardType: CardType;
    deadlineType: DeadlineType;
    deliveryDate: string;
    category: WorkItem["category"];
    assignee: string;
    priority: Priority;
    startDate: string;
    dueDate: string;
    notes: string;
    description: string;
  }>({
    title: "",
    clientName: "",
    cardType: "도면",
    deadlineType: "시공일",
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    category: "제작",
    assignee: "김진우 실장",
    priority: "보통",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    notes: "",
    description: "",
  });

  // AS form state
  const [asForm, setAsForm] = useState<{
    clientName: string;
    constructDate: string;
    siteAddress: string;
    reason: string;
    technician: string;
    contactPhone: string;
    priority: Priority;
  }>({
    clientName: "",
    constructDate: new Date().toISOString().split("T")[0],
    siteAddress: "",
    reason: "",
    technician: "박성훈 반장",
    contactPhone: "010-",
    priority: "긴급",
  });

  if (!quickModalType) return null;

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workForm.title.trim()) return;

    await addWorkItem({
      type: "work",
      title: workForm.title,
      clientName: workForm.clientName || "(주)바론 협력사",
      cardType: workForm.cardType,
      deadlineType: workForm.deadlineType,
      deliveryDate: workForm.deliveryDate || workForm.dueDate,
      category: workForm.category,
      assignee: workForm.assignee,
      priority: workForm.priority,
      status: "대기",
      progress: 0,
      startDate: workForm.startDate,
      dueDate: workForm.dueDate,
      notes: workForm.notes,
      description: workForm.description,
      attachments: [],
    });

    setWorkForm({
      title: "",
      clientName: "",
      cardType: "도면",
      deadlineType: "시공일",
      deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      category: "제작",
      assignee: "김진우 실장",
      priority: "보통",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      notes: "",
      description: "",
    });
    setQuickModalType(null);
  };

  const handleAsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asForm.clientName.trim() || !asForm.siteAddress.trim() || !asForm.reason.trim()) {
      alert("업체명, 현장주소, A/S 사유를 모두 입력해 주세요.");
      return;
    }

    await addAsItem({
      type: "as",
      clientName: asForm.clientName,
      constructDate: asForm.constructDate,
      siteAddress: asForm.siteAddress,
      reason: asForm.reason,
      resultStatus: "접수",
      resolutionDetails: "A/S 접수 완료. 담당자 확인 중.",
      technician: asForm.technician,
      contactPhone: asForm.contactPhone,
      priority: asForm.priority,
    });

    setAsForm({
      clientName: "",
      constructDate: new Date().toISOString().split("T")[0],
      siteAddress: "",
      reason: "",
      technician: "박성훈 반장",
      contactPhone: "010-",
      priority: "긴급",
    });
    setQuickModalType(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg text-white ${
                quickModalType === "work" ? "bg-blue-600" : "bg-rose-600"
              }`}
            >
              {quickModalType === "work" ? <Plus className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {quickModalType === "work" ? "새 업무 등록 (Work Task)" : "신규 A/S 긴급 접수 (A/S Request)"}
              </h2>
              <p className="text-xs text-slate-500">
                {quickModalType === "work"
                  ? "등록 즉시 메인 대시보드 간트차트 및 칸반 보드에 연동됩니다."
                  : "시공 현장 하자 접수 내역을 파이프라인에 등록합니다."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuickModalType(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Work Form */}
        {quickModalType === "work" && (
          <form onSubmit={handleWorkSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                업체명 / 의뢰사 <span className="text-blue-600">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="예: (주)디자인에이치"
                  value={workForm.clientName}
                  onChange={(e) => setWorkForm({ ...workForm, clientName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  카드 타입 (종류) <span className="text-indigo-600">*</span>
                </label>
                <select
                  value={workForm.cardType}
                  onChange={(e) =>
                    setWorkForm({ ...workForm, cardType: e.target.value as CardType })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                >
                  <option value="도면">도면 (Drawing)</option>
                  <option value="자재리스트">자재리스트 (Materials)</option>
                  <option value="견적">견적 (Estimate)</option>
                  <option value="기타">기타 (Etc)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  마감 기준 및 날짜 <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={workForm.deadlineType}
                    onChange={(e) =>
                      setWorkForm({ ...workForm, deadlineType: e.target.value as DeadlineType })
                    }
                    className="w-24 px-2 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  >
                    <option value="시공일">시공일</option>
                    <option value="배송일">배송일</option>
                    <option value="요청일">요청일</option>
                  </select>
                  <input
                    type="date"
                    required
                    value={workForm.deliveryDate}
                    onChange={(e) => setWorkForm({ ...workForm, deliveryDate: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                프로젝트 / 업무명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 반포 래미안 104동 주방 아일랜드 제작"
                value={workForm.title}
                onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">업무 구분</label>
                <select
                  value={workForm.category}
                  onChange={(e) =>
                    setWorkForm({ ...workForm, category: e.target.value as WorkItem["category"] })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="제작">제작 (Manufacturing)</option>
                  <option value="실측">실측 (Measuring)</option>
                  <option value="시공">시공 (Installation)</option>
                  <option value="설계">설계 (CAD/Design)</option>
                  <option value="납품">납품 (Delivery)</option>
                  <option value="기타">기타 (Etc)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">담당자</label>
                <input
                  type="text"
                  required
                  value={workForm.assignee}
                  onChange={(e) => setWorkForm({ ...workForm, assignee: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">우선순위</label>
                <select
                  value={workForm.priority}
                  onChange={(e) =>
                    setWorkForm({ ...workForm, priority: e.target.value as Priority })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="긴급">긴급 (Urgent)</option>
                  <option value="높음">높음 (High)</option>
                  <option value="보통">보통 (Normal)</option>
                  <option value="낮음">낮음 (Low)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={workForm.startDate}
                  onChange={(e) => setWorkForm({ ...workForm, startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">마감일</label>
                <input
                  type="date"
                  value={workForm.dueDate}
                  onChange={(e) => setWorkForm({ ...workForm, dueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">작업 메모 / 비고</label>
              <textarea
                rows={3}
                placeholder="특이사항, 하드웨어 사양, 세부 지시사항 입력..."
                value={workForm.notes}
                onChange={(e) => setWorkForm({ ...workForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                업무 등록하기
              </button>
            </div>
          </form>
        )}

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
                <label className="block text-xs font-bold text-slate-700 mb-1">시공일자</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={asForm.constructDate}
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

            <div className="grid grid-cols-3 gap-3">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">담당 기사</label>
                <input
                  type="text"
                  value={asForm.technician}
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
                type="submit"
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
