"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Building,
  Calendar,
  User,
  FileText,
  Paperclip,
  UploadCloud,
  FileCheck,
  Eye,
  Trash2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Briefcase,
  Factory,
  CheckCircle,
  AlertTriangle,
  Download,
  Maximize2,
  ClipboardCheck,
  Layers,
  FileSpreadsheet,
  Tag,
  Check,
} from "lucide-react";
import { WorkItem, WorkStatus, AttachmentItem, Priority, CardType, DeadlineType } from "@/types";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

interface TaskDetailModalProps {
  item: WorkItem | null;
  onClose: () => void;
}

export function TaskDetailModal({ item, onClose }: TaskDetailModalProps) {
  const { updateWorkItem } = useData();

  const [description, setDescription] = useState(item?.description || item?.notes || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);

  // PDF Viewer Modal
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState<string>("");

  // Image Preview Modal
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!item) return null;

  const STAGES: { key: WorkStatus; label: string; icon: typeof Clock; desc: string }[] = [
    { key: "대기", label: "To-Do", icon: Clock, desc: "발주 접수 / 작업 대기" },
    { key: "오피스", label: "오피스", icon: Briefcase, desc: "도면 작업 / 택배 리스트업" },
    { key: "공장", label: "공장", icon: Factory, desc: "자재 준비 / 판재 가공" },
    { key: "준비완료", label: "준비완료", icon: CheckCircle2, desc: "출고 및 시공 준비 완료" },
  ];

  const CARD_TYPES: { key: CardType; label: string; color: string }[] = [
    { key: "도면", label: "도면", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    { key: "자재리스트", label: "자재리스트", color: "bg-amber-100 text-amber-800 border-amber-200" },
    { key: "견적", label: "견적", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    { key: "기타", label: "기타", color: "bg-slate-100 text-slate-700 border-slate-200" },
  ];

  const DEADLINE_TYPES: DeadlineType[] = ["시공일", "배송일", "요청일"];

  const currentStageIndex = STAGES.findIndex((s) => s.key === item.status);

  const handleStageChange = (newStatus: WorkStatus) => {
    let newProgress = item.progress;
    if (newStatus === "대기") newProgress = 10;
    else if (newStatus === "오피스") newProgress = 40;
    else if (newStatus === "공장") newProgress = 75;
    else if (newStatus === "준비완료") newProgress = 100;

    updateWorkItem(item.id, { status: newStatus, progress: newProgress });
  };

  const handleNextStage = () => {
    if (item.status === "대기") handleStageChange("오피스");
    else if (item.status === "오피스") handleStageChange("공장");
    else if (item.status === "공장") handleStageChange("준비완료");
  };

  const handleSaveDescription = () => {
    updateWorkItem(item.id, { description });
    setIsEditingDesc(false);
    setDescSaved(true);
    setTimeout(() => setDescSaved(false), 2000);
  };

  // Clipboard Paste Handler (Ctrl+V for Images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      if (itemData.type.indexOf("image") !== -1) {
        hasImage = true;
        const file = itemData.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, "0")}${now
              .getMinutes()
              .toString()
              .padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;

            const newAttachment: AttachmentItem = {
              id: `att-paste-${Date.now()}`,
              name: `캡처_이미지_${timeStr}.png`,
              url: dataUrl,
              fileType: "image",
              size: `${Math.round(file.size / 1024)} KB`,
              uploadedAt: now.toISOString().split("T")[0],
            };

            updateWorkItem(item.id, {
              attachments: [newAttachment, ...(item.attachments || [])],
            });

            setPasteToast("클립보드 이미지가 첨부파일로 즉시 추가되었습니다! 📋🖼️");
            setTimeout(() => setPasteToast(null), 3500);
          };
          reader.readAsDataURL(file);
        }
      }
    }

    if (hasImage) {
      e.preventDefault();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentItem[] = [...(item.attachments || [])];

    Array.from(files).forEach((file) => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

      const objectUrl = URL.createObjectURL(file);
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      newAttachments.unshift({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: file.name,
        url: objectUrl,
        fileType: isPdf ? "pdf" : isImage ? "image" : "file",
        size: sizeStr,
        uploadedAt: new Date().toISOString().split("T")[0],
      });
    });

    updateWorkItem(item.id, { attachments: newAttachments });
  };

  const handleDeleteAttachment = (attId: string) => {
    const updated = (item.attachments || []).filter((a) => a.id !== attId);
    updateWorkItem(item.id, { attachments: updated });
  };

  // Urgency detection
  const todayStr = "2026-09-10";
  const targetDate = item.deliveryDate || item.dueDate;
  const daysUntilDelivery = Math.ceil(
    (new Date(targetDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = item.priority === "긴급" || (daysUntilDelivery >= 0 && daysUntilDelivery <= 3);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Card Type Selector */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
                {CARD_TYPES.map((ct) => {
                  const isSelected = (item.cardType || "도면") === ct.key;
                  return (
                    <button
                      key={ct.key}
                      onClick={() => updateWorkItem(item.id, { cardType: ct.key })}
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-md transition cursor-pointer",
                        isSelected
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      {ct.label}
                    </button>
                  );
                })}
              </div>

              {/* Client Name */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200 text-blue-950 font-bold text-xs">
                <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{item.clientName || "바론 협력업체"}</span>
              </div>

              {isUrgent && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500 text-white animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  기한 임박 (D-{daysUntilDelivery})
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Metadata Strip */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                {item.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-100/70 p-3 rounded-xl border border-slate-200/80">
                {/* Deadline Type & Date Selector */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                  <select
                    value={item.deadlineType || "시공일"}
                    onChange={(e) =>
                      updateWorkItem(item.id, { deadlineType: e.target.value as DeadlineType })
                    }
                    className="font-bold text-xs text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {DEADLINE_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={item.deliveryDate || item.dueDate}
                    onChange={(e) =>
                      updateWorkItem(item.id, {
                        deliveryDate: e.target.value,
                        dueDate: e.target.value,
                      })
                    }
                    className="font-mono text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>
                    담당자: <strong>{item.assignee}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    시작일: <span className="font-mono">{item.startDate}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-slate-400">공정 진척도:</span>
                  <span className="font-extrabold text-blue-600">{item.progress}%</span>
                </div>
              </div>
            </div>

            {/* 4-Stage Process Stepper & Transition Button */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                    가구 제작 프로세스 진행 단계
                  </span>
                  <div className="text-base font-extrabold flex items-center gap-2 mt-0.5">
                    <span>현재 공정:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500 text-white text-sm">
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Fast Action Stage Advance Button */}
                {item.status === "대기" && (
                  <button
                    onClick={handleNextStage}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>오피스로 전달 (도면 및 택배 리스트업 시작)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {item.status === "오피스" && (
                  <button
                    onClick={handleNextStage}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Factory className="w-4 h-4" />
                    <span>공장으로 설계도 및 자재 리스트 인계</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {item.status === "공장" && (
                  <button
                    onClick={handleNextStage}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>자재 준비 완료 및 준비완료로 인계</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {item.status === "준비완료" && (
                  <div className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>모든 자재/시공 준비 완료 (출고 대기)</span>
                  </div>
                )}
              </div>

              {/* Stepper Indicators */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                {STAGES.map((st, idx) => {
                  const isCurrent = item.status === st.key;
                  const isPassed = idx < currentStageIndex;
                  const Icon = st.icon;

                  return (
                    <button
                      key={st.key}
                      onClick={() => handleStageChange(st.key)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                        isCurrent
                          ? "bg-blue-600/90 border-blue-400 text-white ring-2 ring-blue-400/40"
                          : isPassed
                          ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                          : "bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5" />
                          {st.label}
                        </span>
                        {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[10px] text-slate-300/80 truncate">{st.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board / Post Detailed Description with Ctrl+V Clipboard Image Paste */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
              onPaste={handlePaste}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    상세 작업 지시사항 및 현장 메모 (게시판 본문)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold border border-blue-200/80 flex items-center gap-1">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Ctrl+V 이미지 붙여넣기 지원
                  </span>

                  {descSaved && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      저장됨!
                    </span>
                  )}
                  {isEditingDesc ? (
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      저장 완료
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingDesc(true)}
                      className="px-3 py-1 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      글 수정하기
                    </button>
                  )}
                </div>
              </div>

              {/* Toast alert when clipboard image is pasted */}
              {pasteToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{pasteToast}</span>
                </div>
              )}

              {isEditingDesc ? (
                <div className="space-y-1.5">
                  <textarea
                    ref={textareaRef}
                    rows={8}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="도면 규격, 자재 스펙, 택배 리스트, 공장 인계 사항을 자유롭게 작성하세요... (스크린샷이나 복사한 이미지를 여기서 Ctrl+V로 붙여넣으면 첨부파일로 바로 들어갑니다!)"
                    className="w-full p-3.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-slate-50/50"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 캡처 도구로 캡처한 이미지나 복사한 사진을 이 텍스트창에서 <strong>Ctrl+V</strong>를 누르면 아래 첨부파일로 자동 등록됩니다.
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-100 min-h-[120px] text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans cursor-text group"
                >
                  {description || (
                    <p className="text-slate-400 italic">
                      작성된 세부 지시사항이 없습니다. 클릭하여 작업 내용을 작성하거나 이미지를 붙여넣어 보세요.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Attachments Section: Drawings, PDFs, Images */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    첨부파일 / 도면(PDF), 자재 목록, 붙여넣은 이미지 ({item.attachments?.length || 0})
                  </h3>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>파일 / 도면 직접 업로드</span>
                </button>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,image/*,.dwg,.dxf"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              {/* Attachments List */}
              {!item.attachments || item.attachments.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition space-y-1.5"
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    설계도면(PDF), 재단 리스트, 시공 사진을 파일로 업로드하거나, 본문에서 <strong>Ctrl+V</strong>로 이미지를 붙여넣으세요.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF 도면은 별도 프로그램 없이 앱 안에서 즉시 열람할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {item.attachments.map((att) => {
                    const isPdf = att.fileType === "pdf" || att.name.endsWith(".pdf");
                    const isImage = att.fileType === "image";

                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* File Type Badge Icon or Thumbnail */}
                          {isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={att.url}
                              alt={att.name}
                              onClick={() => setActiveImageUrl(att.url)}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-90"
                            />
                          ) : (
                            <div
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 text-white text-[11px]",
                                isPdf ? "bg-rose-600 shadow-xs" : "bg-slate-600"
                              )}
                            >
                              {isPdf ? "PDF" : "FILE"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate" title={att.name}>
                              {att.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {att.size} · {att.uploadedAt}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPdf && (
                            <button
                              onClick={() => {
                                setActivePdfUrl(att.url);
                                setActivePdfTitle(att.name);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="PDF 도면 즉시 열람"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>도면 열람</span>
                            </button>
                          )}

                          {isImage && (
                            <button
                              onClick={() => setActiveImageUrl(att.url)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="이미지 크게보기"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>보기</span>
                            </button>
                          )}

                          <a
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                            title="다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Instant In-App Viewer Modal */}
      {activePdfUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col h-[90vh]">
            {/* Viewer Header */}
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2 py-0.5 bg-rose-600 rounded">
                  PDF 뷰어
                </span>
                <span className="font-bold text-sm truncate max-w-md">{activePdfTitle}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>새 탭에서 열기</span>
                </a>
                <button
                  onClick={() => setActivePdfUrl(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Frame */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={activePdfUrl}
                title={activePdfTitle}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {activeImageUrl && (
        <div
          onClick={() => setActiveImageUrl(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageUrl}
              alt="Preview"
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
            />
            <p className="text-center text-xs text-white/70 mt-2">화면을 클릭하면 닫힙니다.</p>
          </div>
        </div>
      )}
    </>
  );
}
