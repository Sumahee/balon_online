"use client";

import React, { useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  Building,
  Calendar,
  MapPin,
  FileText,
  User,
  Phone,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Trash2,
  Filter,
  Camera,
  UploadCloud,
  Eye,
  Image as ImageIcon,
  ZoomIn,
  X,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { AsItem, AsStatus, Priority } from "@/types";
import { cn } from "@/lib/utils";

export default function AsBoardPage() {
  const { asItems, updateAsItem, deleteAsItem, advanceAsStatus, setQuickModalType } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("전체");
  const [selectedPriority, setSelectedPriority] = useState<string>("전체");

  // Detailed view & print receipt modal
  const [activeReceipt, setActiveReceipt] = useState<AsItem | null>(null);

  // Edit modal
  const [editingItem, setEditingItem] = useState<AsItem | null>(null);

  // Photo Preview Lightbox
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const handleResultPhotoUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !editingItem) return;

    const newPhotoUrls: string[] = [];
    let count = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          newPhotoUrls.push(evt.target.result as string);
        }
        count++;
        if (count === files.length) {
          const existing = editingItem.resultPhotos || editingItem.images || [];
          setEditingItem({
            ...editingItem,
            resultPhotos: [...existing, ...newPhotoUrls],
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveResultPhoto = (index: number) => {
    if (!editingItem) return;
    const existing = editingItem.resultPhotos || editingItem.images || [];
    setEditingItem({
      ...editingItem,
      resultPhotos: existing.filter((_: string, i: number) => i !== index),
    });
  };

  const filteredItems = asItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.clientName.toLowerCase().includes(query) ||
      item.siteAddress.toLowerCase().includes(query) ||
      item.reason.toLowerCase().includes(query) ||
      (item.technician && item.technician.toLowerCase().includes(query));

    const matchesStatus = selectedStatus === "전체" || item.resultStatus === selectedStatus;
    const matchesPriority = selectedPriority === "전체" || item.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: AsStatus) => {
    switch (status) {
      case "접수":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "처리중":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "완료":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "긴급":
        return "bg-rose-600 text-white";
      case "높음":
        return "bg-amber-500 text-white";
      case "보통":
        return "bg-blue-600 text-white";
      case "낮음":
        return "bg-slate-600 text-white";
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateAsItem(editingItem.id, editingItem);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                A/S 관리 게시판 (After-Sales Service)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                현장 시공 하자 접수, 원인 파악, 현장 기사 출동 및 조치 결과를 체계적으로 추적합니다.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setQuickModalType("as")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>신규 A/S 접수</span>
        </button>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedStatus("전체")}
          className={cn(
            "p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between",
            selectedStatus === "전체"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          )}
        >
          <span className="text-xs font-bold">전체 A/S</span>
          <span className="text-base font-extrabold">{asItems.length}건</span>
        </div>

        <div
          onClick={() => setSelectedStatus("접수")}
          className={cn(
            "p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between",
            selectedStatus === "접수"
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold">접수 대기</span>
          </div>
          <span className="text-base font-extrabold text-rose-600">
            {asItems.filter((a) => a.resultStatus === "접수").length}건
          </span>
        </div>

        <div
          onClick={() => setSelectedStatus("처리중")}
          className={cn(
            "p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between",
            selectedStatus === "처리중"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold">처리 진행 중</span>
          </div>
          <span className="text-base font-extrabold text-amber-600">
            {asItems.filter((a) => a.resultStatus === "처리중").length}건
          </span>
        </div>

        <div
          onClick={() => setSelectedStatus("완료")}
          className={cn(
            "p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between",
            selectedStatus === "완료"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/50"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold">조치 완료</span>
          </div>
          <span className="text-base font-extrabold text-emerald-600">
            {asItems.filter((a) => a.resultStatus === "완료").length}건
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="업체명, 현장주소, 고장 사유, 기사명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="전체">모든 우선도</option>
            <option value="긴급">긴급 대응</option>
            <option value="높음">높음</option>
            <option value="보통">보통</option>
            <option value="낮음">낮음</option>
          </select>
        </div>
      </div>

      {/* A/S Cards List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            해당 조건의 A/S 접수 내역이 없습니다.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition space-y-3"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded",
                      getPriorityBadge(item.priority)
                    )}
                  >
                    {item.priority}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{item.clientName}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => advanceAsStatus(item.id)}
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-full border transition hover:opacity-85 cursor-pointer flex items-center gap-1",
                      getStatusBadge(item.resultStatus)
                    )}
                    title="상태 단계 변경"
                  >
                    <span>{item.resultStatus}</span>
                    <span className="text-[10px]">↻</span>
                  </button>

                  <button
                    onClick={() => setActiveReceipt(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="현장 접수증 인쇄"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("이 A/S 내역을 삭제하시겠습니까?")) deleteAsItem(item.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Site Address & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate font-medium">{item.siteAddress}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    시공일: <strong>{item.constructDate}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    담당 기사: <strong>{item.technician || "미지정"}</strong>
                  </span>
                  {item.contactPhone && (
                    <span className="text-slate-400">({item.contactPhone})</span>
                  )}
                </div>
              </div>

              {/* Reason & Resolution Details & Photos */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">A/S 발생 사유:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80">
                    {item.reason}
                  </p>
                </div>

                {item.resolutionDetails && (
                  <div>
                    <span className="font-bold text-slate-700">처리 및 조치 결과:</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                      {item.resolutionDetails}
                    </p>
                  </div>
                )}

                {/* 조치 결과 현장 사진 갤러리 */}
                {((item.resultPhotos && item.resultPhotos.length > 0) || (item.images && item.images.length > 0)) && (
                  <div>
                    <span className="font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>조치 결과 현장 사진 ({(item.resultPhotos || item.images || []).length}장):</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(item.resultPhotos || item.images || []).map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhotoUrl(imgUrl)}
                          className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden relative group cursor-pointer shadow-2xs hover:scale-105 transition"
                        >
                          <img src={imgUrl} alt={`조치 사진 #${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Actions */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-100">
              <span className="text-xs font-bold text-slate-600">A/S 현장 작업 확인서 출력 뷰</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>인쇄하기 (Print)</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Paper Content */}
            <div className="p-8 space-y-6 text-slate-900" id="printable-as-receipt">
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-wider">BARON INT</h1>
                  <p className="text-xs text-slate-500">맞춤 가구 시공 A/S 현장 작업 지시서</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono text-slate-500">문서번호: AS-{activeReceipt.id}</p>
                  <p className="font-semibold text-rose-600">상태: [{activeReceipt.resultStatus}]</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">의뢰 업체</span>
                  <span className="font-bold text-sm text-slate-900">{activeReceipt.clientName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">원시공 일자</span>
                  <span className="font-bold text-sm text-slate-900">{activeReceipt.constructDate}</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-500 text-[11px]">현장 주소</span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-semibold">
                  {activeReceipt.siteAddress}
                </p>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-500 text-[11px]">A/S 접수 및 하자 내용</span>
                <p className="p-4 bg-slate-50 rounded-lg border border-slate-200 leading-relaxed min-h-[70px]">
                  {activeReceipt.reason}
                </p>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-500 text-[11px]">기사 조치 사항 및 특이사항</span>
                <div className="p-4 border border-dashed border-slate-300 rounded-lg min-h-[90px] text-slate-700">
                  {activeReceipt.resolutionDetails || "현장 조치 사항을 수기 기재하거나 서명합니다."}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">담당 기사: </span>
                  <span className="font-bold">{activeReceipt.technician || "바론 시공팀"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">고객/현장 확인 서명:</span>
                  <div className="w-28 border-b border-slate-400 pb-1 text-center text-slate-400">
                    (서명)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit A/S Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">A/S 접수 정보 수정</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">업체명</label>
                  <input
                    type="text"
                    required
                    value={editingItem.clientName}
                    onChange={(e) => setEditingItem({ ...editingItem, clientName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">시공일</label>
                  <input
                    type="date"
                    value={editingItem.constructDate}
                    onChange={(e) => setEditingItem({ ...editingItem, constructDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">현장 주소</label>
                <input
                  type="text"
                  required
                  value={editingItem.siteAddress}
                  onChange={(e) => setEditingItem({ ...editingItem, siteAddress: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">A/S 사유</label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.reason}
                  onChange={(e) => setEditingItem({ ...editingItem, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">처리 상태</label>
                  <select
                    value={editingItem.resultStatus}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        resultStatus: e.target.value as AsStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="접수">접수</option>
                    <option value="처리중">처리중</option>
                    <option value="완료">완료</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">우선도</label>
                  <select
                    value={editingItem.priority}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        priority: e.target.value as Priority,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="긴급">긴급</option>
                    <option value="높음">높음</option>
                    <option value="보통">보통</option>
                    <option value="낮음">낮음</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당 기사</label>
                  <input
                    type="text"
                    value={editingItem.technician || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, technician: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">연락처</label>
                  <input
                    type="text"
                    value={editingItem.contactPhone || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    처리 내용 및 조치 결과
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>📷 조치 사진 첨부</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleResultPhotoUpload(e.target.files)}
                    />
                  </label>
                </div>
                <textarea
                  rows={2}
                  placeholder="예: 힌지 교체 완료, 레일 유격 조정 등 조치사항 입력..."
                  value={editingItem.resolutionDetails || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, resolutionDetails: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                {/* 첨부된 조치 결과 사진 썸네일 & 삭제 */}
                {((editingItem.resultPhotos && editingItem.resultPhotos.length > 0) || (editingItem.images && editingItem.images.length > 0)) && (
                  <div className="mt-2.5 space-y-1">
                    <span className="text-[11px] font-bold text-slate-600">첨부된 조치 결과 현장 사진 ({(editingItem.resultPhotos || editingItem.images || []).length}장):</span>
                    <div className="flex flex-wrap gap-2">
                      {(editingItem.resultPhotos || editingItem.images || []).map((imgUrl: string, idx: number) => (
                        <div key={idx} className="w-16 h-16 rounded-xl border border-slate-300 overflow-hidden relative group shadow-2xs">
                          <img src={imgUrl} alt={`조치사진 #${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveResultPhoto(idx)}
                            className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition"
                            title="사진 삭제"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  수정 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewPhotoUrl}
              alt="조치 사진 확대"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-700"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
