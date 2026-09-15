"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Wrench, Calendar, MapPin, Building, User, FileText, Phone, Palette, Layers, UserCheck, Sparkles } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Priority, WorkItem, CardType, DeadlineType, ClientInfo, UserInfo, MaterialOrderItem, DrawingType, AttachmentItem, POST_BAR_COLORS } from "@/types";
import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { UnifiedBoardEditor } from "@/components/common/UnifiedBoardEditor";
import { cn } from "@/lib/utils";

export function QuickModals() {
  const { quickModalType, setQuickModalType, addWorkItem, addAsItem } = useData();
  const { user } = useAuth();

  // Dynamic Client and Staff lists loaded from shared DB
  const [clientsList, setClientsList] = useState<ClientInfo[]>([]);
  const [staffList, setStaffList] = useState<UserInfo[]>([]);

  useEffect(() => {
    if (user?.name) {
      setWorkForm((prev) => ({ ...prev, drawingAssignee: user.name }));
    }
  }, [user?.name]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.clients) {
          setClientsList(data.clients);
        }
      })
      .catch(() => {});

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.staff) {
          setStaffList(data.staff);
        }
      })
      .catch(() => {});
  }, []);

  // Work form state
  const [workForm, setWorkForm] = useState<{
    clientName: string;
    siteAddress: string;
    drawingType: DrawingType;
    cardType: CardType;
    deadlineType: DeadlineType;
    deliveryDate: string;
    siteContactPhone: string;
    postColor: string;
    boardColor: string;
    drawingAssignee: string;
    priority: Priority;
    notes: string;
    description: string;
    attachments: AttachmentItem[];
    materialOrders: MaterialOrderItem[];
  }>({
    clientName: "",
    siteAddress: "",
    drawingType: "옴니버스",
    cardType: "도면",
    deadlineType: "시공일",
    deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    siteContactPhone: "",
    postColor: "11 다크그레이",
    boardColor: "PET 18T 화이트",
    drawingAssignee: "김진우 실장 (로그인 유저)",
    priority: "보통",
    notes: "",
    description: "",
    attachments: [],
    materialOrders: [],
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

  const autoTitlePreview = `${workForm.clientName.trim() || "업체명"}${
    workForm.siteAddress.trim() ? ` ${workForm.siteAddress.trim()}` : ""
  }(${workForm.drawingType})`;

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workForm.clientName.trim()) {
      alert("업체명을 입력해 주세요.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const siteStr = workForm.siteAddress.trim() ? ` ${workForm.siteAddress.trim()}` : "";
    const autoTitle = `${workForm.clientName.trim()}${siteStr}(${workForm.drawingType})`;

    const hasOrders = workForm.materialOrders.length > 0;
    const isAllDone = hasOrders && workForm.materialOrders.every((o) => o.isOrdered);
    const finalOrderStatus = isAllDone ? "발주완료" : hasOrders ? "발주필요" : "발주불필요";

    await addWorkItem({
      type: "work",
      title: autoTitle,
      clientName: workForm.clientName.trim(),
      siteAddress: workForm.siteAddress.trim(),
      region: workForm.siteAddress.trim().split(" ")[0] || "서울/수도권",
      drawingType: workForm.drawingType,
      cardType: workForm.cardType,
      deadlineType: workForm.deadlineType,
      deliveryDate: workForm.deliveryDate,
      siteContactPhone: workForm.siteContactPhone,
      postColor: workForm.postColor,
      boardColor: workForm.boardColor,
      drawingAssignee: workForm.drawingAssignee,
      assignee: workForm.drawingAssignee || "김진우 실장", // 로그인 유저 자동 지정
      priority: workForm.priority,
      status: "대기",
      progress: 0,
      startDate: todayStr, // 등록일이 시작일
      dueDate: workForm.deliveryDate, // 시공일이 마감일
      notes: workForm.description || workForm.notes,
      description: workForm.description || workForm.notes,
      materialOrders: workForm.materialOrders,
      materialOrderNeeded: workForm.materialOrders.map((o) => o.name).join(", "),
      materialOrderStatus: finalOrderStatus,
      attachments: workForm.attachments,
    });

    setWorkForm({
      clientName: "",
      siteAddress: "",
      drawingType: "옴니버스",
      cardType: "도면",
      deadlineType: "시공일",
      deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      siteContactPhone: "",
      postColor: "11 다크그레이",
      boardColor: "PET 18T 화이트",
      drawingAssignee: "김진우 실장 (로그인 유저)",
      priority: "보통",
      notes: "",
      description: "",
      attachments: [],
      materialOrders: [],
    });

    setQuickModalType(null);
  };

  const DRAWING_TYPES: DrawingType[] = ["천정형", "에보라", "옴니버스", "기타"];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Work Form */}
        {quickModalType === "work" && (
          <form onSubmit={handleWorkSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* 업체명 & 현장 주소/지역 (2열 배치) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    업체명 / 의뢰사 <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      list="clients-datalist"
                      placeholder="예: 홈파베르, (주)디자인에이치"
                      value={workForm.clientName}
                      onChange={(e) => setWorkForm({ ...workForm, clientName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    />
                    <datalist id="clients-datalist">
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.companyAddress ? `${c.name} (${c.companyAddress})` : c.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    현장 주소 / 세부 지역 <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="예: 서초동 팬트리, 반포동 104동, 일산"
                      value={workForm.siteAddress}
                      onChange={(e) => setWorkForm({ ...workForm, siteAddress: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 도면 타입 선택 (천정형, 에보라, 옴니버스, 기타) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  도면 세부 타입 선택 (자동 프로젝트명 표기용) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DRAWING_TYPES.map((dt) => {
                    const isSelected = workForm.drawingType === dt;
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setWorkForm({ ...workForm, drawingType: dt })}
                        className={cn(
                          "py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer text-center",
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {dt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 자동 생성 프로젝트명 미리보기 배너 */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-blue-900 font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>카드 표기 프로젝트명 (자동기입):</span>
                </span>
                <span className="font-extrabold text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs font-mono text-xs truncate max-w-full">
                  {autoTitlePreview}
                </span>
              </div>

              {/* 카드 타입 & 마감 시공일 & 우선순위 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    카드 구분
                  </label>
                  <select
                    value={workForm.cardType}
                    onChange={(e) =>
                      setWorkForm({ ...workForm, cardType: e.target.value as CardType })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="도면">도면</option>
                    <option value="자재리스트">자재리스트</option>
                    <option value="견적">견적</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    시공일 (마감일) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={workForm.deliveryDate}
                    onChange={(e) => setWorkForm({ ...workForm, deliveryDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">우선순위</label>
                  <select
                    value={workForm.priority}
                    onChange={(e) =>
                      setWorkForm({ ...workForm, priority: e.target.value as Priority })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="긴급">긴급 (Urgent)</option>
                    <option value="높음">높음 (High)</option>
                    <option value="보통">보통 (Normal)</option>
                    <option value="낮음">낮음 (Low)</option>
                  </select>
                </div>
              </div>

              {/* 🎨 도면 프로그램 전달 상세 정보 (타입, 업체명, 주소, 시공일, 현장담당자 연락처, 포스트바, 합판컬러, 도면담당자) */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>🎨 도면 프로그램 전송 정보 설정 (바론웹 전달)</span>
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    로그인 담당자 자동 기입됨
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 현장 담당자 연락처 (업체로부터 받은 연락처) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      업체 현장 담당자 연락처 <span className="text-indigo-600 font-normal">(도면 전송용)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="예: 010-1234-5678 (현장 소장님)"
                        value={workForm.siteContactPhone}
                        onChange={(e) => setWorkForm({ ...workForm, siteContactPhone: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  {/* 도면 담당자 (로그인한 사람) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      도면 담당자 <span className="text-indigo-600 font-normal">(로그인 계정 자동)</span>
                    </label>
                    <div className="relative">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={workForm.drawingAssignee}
                        onChange={(e) => setWorkForm({ ...workForm, drawingAssignee: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-indigo-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 포스트바 컬러 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      포스트바 컬러 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Palette className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="예: 11 다크그레이, 12 화이트, 13 실버..."
                        value={workForm.postColor}
                        onChange={(e) => setWorkForm({ ...workForm, postColor: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {POST_BAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWorkForm({ ...workForm, postColor: c })}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer",
                            workForm.postColor === c
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 합판 컬러 / 합판 종류 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      합판 컬러 (합판 종류) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="예: PET 18T 화이트, 내츄럴 옥..."
                        value={workForm.boardColor}
                        onChange={(e) => setWorkForm({ ...workForm, boardColor: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {["PET 18T 화이트", "내츄럴 옥", "딥오크", "화이트 LPM"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setWorkForm({ ...workForm, boardColor: c })}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer",
                            workForm.boardColor === c
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Material Order Section */}
              <MaterialOrderManager
                orders={workForm.materialOrders}
                onChange={(updated) => setWorkForm({ ...workForm, materialOrders: updated })}
              />


              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  작업 내용 및 첨부 파일 (도면 / 이미지 / PDF) <span className="text-slate-400 font-normal">(파일 드래그&드롭, 이미지 미리보기, PDF 즉시 열기)</span>
                </label>
                <UnifiedBoardEditor
                  description={workForm.description}
                  onChangeDescription={(val) => setWorkForm({ ...workForm, description: val, notes: val })}
                  attachments={workForm.attachments}
                  onChangeAttachments={(items) => setWorkForm({ ...workForm, attachments: items })}
                  placeholder="작업 내용, 상세 사양, 현장 지시사항 등을 자유롭게 작성하세요... 파일이나 사진을 이 영역으로 드래그 & 드롭하여 바로 첨부할 수 있습니다."
                />
              </div>
            </div>

            {/* Sticky Always Visible Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 sticky bottom-0 z-10 shadow-md">
              <button
                type="button"
                onClick={() => setQuickModalType(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
              >
                취소 (닫기)
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                + 업무 등록하기
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
