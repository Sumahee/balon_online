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
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Camera,
} from "lucide-react";

import { WorkItem, WorkStatus, AttachmentItem, Priority, CardType, DeadlineType, DrawingRequest } from "@/types";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { getMaterialOrders } from "@/lib/materialUtils";

interface TaskDetailModalProps {
  item: WorkItem | null;
  onClose: () => void;
}

export function TaskDetailModal({ item, onClose }: TaskDetailModalProps) {
  const { workItems, updateWorkItem, addComment, deleteComment, deleteCommentImage, deletePhotoFromWorkItem } = useData();

  // Reactive subscription to live item in DataContext
  const liveItem = item ? (workItems.find((w) => w.id === item.id) || item) : null;

  const [description, setDescription] = useState(liveItem?.description || liveItem?.notes || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);

  // Drawing Request State for Baron Web integration
  const [drawingReq, setDrawingReq] = useState<DrawingRequest | null>(null);
  const [isSendingReq, setIsSendingReq] = useState(false);
  const [reqToast, setReqToast] = useState<string | null>(null);

  // PDF Viewer Modal
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState<string>("");

  // Image Preview Modal
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentAttachedPhotos, setCommentAttachedPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Top Document Attachments (excludes comment photos)
  const docAttachments = React.useMemo(() => {
    return (liveItem?.attachments || []).filter(
      (att) => att.fileType !== "image" && !/\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)
    );
  }, [liveItem?.attachments]);

  // All photos for Lightbox Slider (combines card uploads & comment photos)
  const allPhotos = React.useMemo(() => {
    const list: { id: string; name: string; url: string; size?: string; uploadedAt?: string }[] = [];
    (liveItem?.attachments || []).forEach((att) => {
      if (att.fileType === "image" || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)) {
        list.push({
          id: att.id,
          name: att.name,
          url: att.url,
          size: att.size,
          uploadedAt: att.uploadedAt,
        });
      }
    });
    (liveItem?.comments || []).forEach((cmt, cIdx) => {
      const cmtImages = cmt.images || (cmt.imageUrl ? [cmt.imageUrl] : []);
      cmtImages.forEach((imgUrl, imgIdx) => {
        list.push({
          id: `cmt-photo-${cmt.id}-${imgIdx}`,
          name: `댓글 사진 #${cIdx + 1}-${imgIdx + 1}`,
          url: imgUrl,
          uploadedAt: cmt.createdAt.includes("T") ? cmt.createdAt.split("T")[0] : cmt.createdAt,
        });
      });
    });
    return list;
  }, [liveItem?.attachments, liveItem?.comments]);

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePhotoIndex === null || allPhotos.length === 0) return;
    setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allPhotos.length - 1));
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePhotoIndex === null || allPhotos.length === 0) return;
    setActivePhotoIndex((prev) => (prev !== null && prev < allPhotos.length - 1 ? prev + 1 : 0));
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePhotoIndex === null) return;
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "Escape") setActivePhotoIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, allPhotos.length]);

  const handleAddComment = async (textToSubmit?: string) => {
    const content = (textToSubmit !== undefined ? textToSubmit : newCommentText).trim();
    if ((!content && commentAttachedPhotos.length === 0) || !liveItem) return;

    await addComment(
      liveItem.id,
      "김진우 실장 (오피스)",
      content || "📷 [사진 첨부]",
      commentAttachedPhotos
    );

    setNewCommentText("");
    setCommentAttachedPhotos([]);
  };

  // Immediate upload & post when user selects photo files from OS dialog ("열기")
  const handleCommentPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !liveItem) return;

    const newPhotoUrls: string[] = [];
    let loadedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (evt.target?.result) {
          newPhotoUrls.push(evt.target.result as string);
        }
        loadedCount++;
        if (loadedCount === files.length && newPhotoUrls.length > 0) {
          // Immediately post as comment so user sees it live instantly!
          await addComment(
            liveItem.id,
            "김진우 실장 (오피스)",
            newCommentText.trim() || "📷 [현장 사진]",
            newPhotoUrls
          );
          setNewCommentText("");
          setCommentAttachedPhotos([]);
        }
      };
      reader.readAsDataURL(file);
    });
    // reset input
    e.target.value = "";
  };

  const handleRemoveAttachedPhoto = (index: number) => {
    setCommentAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
  };


  // Fetch existing drawing request for this item
  React.useEffect(() => {
    if (item?.id) {
      fetch(`/api/drawing-requests?workItemId=${item.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.requests && data.requests.length > 0) {
            setDrawingReq(data.requests[0]);
          }
        })
        .catch(() => {});
    }
  }, [item?.id]);

  if (!item) return null;

  const handleSendDrawingRequest = async () => {
    if (!item) return;
    setIsSendingReq(true);
    try {
      const res = await fetch("/api/drawing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workItemId: item.id,
          drawingType: item.drawingType || "옴니버스",
          clientName: item.clientName,
          siteAddress: item.siteAddress || "미지정 현장",
          deliveryDate: item.deliveryDate || item.dueDate,
          contactPhone: item.siteContactPhone || "010-미입력", // 업체로부터 받은 현장 담당자 연락처
          postColor: item.postColor || "흑니켈",
          boardColor: item.boardColor || "PET 18T 화이트",
          drawingAssignee: item.drawingAssignee || item.assignee || "김진우 실장 (로그인 유저)",
          title: item.title,
          description: description || item.description || item.notes,
        }),
      });
      const data = await res.json();
      if (data.success && data.request) {
        setDrawingReq(data.request);
        setReqToast("바론웹으로 도면 작업 요청 정보가 전송되었습니다! 🚀 (도면 정보 8종 자동 전달됨)");
        setTimeout(() => setReqToast(null), 4500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReq(false);
    }
  };


  const handleConfirmDrawing = async (approve: boolean) => {
    if (!drawingReq) return;
    const newStatus = approve ? "confirmed" : "in_progress";
    try {
      const res = await fetch("/api/drawing-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: drawingReq.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDrawingReq((prev) => (prev ? { ...prev, status: newStatus } : null));
        if (approve) {
          setReqToast("도면이 최종 컨펌 및 승인되었습니다! 🎉");
          if (drawingReq.resultPdfUrl) {
            const newAtt: AttachmentItem = {
              id: `att-dwg-${Date.now()}`,
              name: `${item.title}_완성도면.pdf`,
              url: drawingReq.resultPdfUrl,
              fileType: "pdf",
              size: "도면 파일",
              uploadedAt: new Date().toISOString().split("T")[0],
            };
            updateWorkItem(item.id, { attachments: [newAtt, ...(item.attachments || [])] });
          }
        } else {
          setReqToast("도면 반려 및 수정 요청이 전달되었습니다. (바론웹 재작업 진행)");
        }
        setTimeout(() => setReqToast(null), 4500);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const STAGES: { key: WorkStatus; label: string; icon: typeof Clock; desc: string }[] = [
    { key: "대기", label: "To-Do", icon: Clock, desc: "발주 접수 / 대기" },
    { key: "오피스", label: "오피스", icon: Briefcase, desc: "도면 작업 / 택배" },
    { key: "공장", label: "공장", icon: Factory, desc: "자재 준비 / 가공" },
    { key: "준비완료", label: "준비완료", icon: CheckCircle2, desc: "출고 대기" },
    { key: "시공완료", label: "시공완료", icon: CheckCircle, desc: "현장 시공 완료" },
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
    else if (newStatus === "준비완료") newProgress = 90;
    else if (newStatus === "시공완료") newProgress = 100;

    updateWorkItem(item.id, { status: newStatus, progress: newProgress });
  };

  const handleNextStage = () => {
    if (item.status === "대기") handleStageChange("오피스");
    else if (item.status === "오피스") handleStageChange("공장");
    else if (item.status === "공장") handleStageChange("준비완료");
    else if (item.status === "준비완료") handleStageChange("시공완료");
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
                  <button
                    onClick={handleNextStage}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>🏗️ 현장 시공완료 처리 (칸반에서 삭제/업무 리스트 보관)</span>
                  </button>
                )}

                {item.status === "시공완료" && (
                  <div className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>✅ 현장 시공 완료됨 (업무 관리 리스트에 보관)</span>
                  </div>
                )}
              </div>

              {/* Stepper Indicators */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-800">
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

            {/* 🎨 바론 웹 도면 작업 연동 & 수동 전송 / 컨펌 섹션 */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 rounded-2xl border border-indigo-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    🎨
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>바론웹(도면 프로그램) 연동</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        수동 전송 & 컨펌 시스템
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      버튼을 눌러 발주/도면 정보(업체명, 시공일, 요구사항)를 바론웹 알림으로 전달합니다.
                    </p>
                  </div>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={handleSendDrawingRequest}
                  disabled={isSendingReq}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer shrink-0",
                    drawingReq
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-400/50 animate-pulse"
                  )}
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>{isSendingReq ? "전송 중..." : drawingReq ? "바론웹으로 도면 정보 재전송" : "🎨 바론웹으로 도면 정보 전송"}</span>
                </button>
              </div>

              {/* 📋 도면 프로그램 전송 8개 필수 데이터 요약 표 */}
              <div className="p-3.5 bg-white/90 rounded-xl border border-indigo-100 text-xs space-y-2">
                <div className="flex items-center justify-between font-extrabold text-slate-900 border-b border-indigo-50 pb-2">
                  <span>📋 도면 프로그램 전송 정보 (8종 사양)</span>
                  <span className="text-[11px] font-bold text-indigo-600">도면 담당자: {item.drawingAssignee || item.assignee || "김진우 실장 (로그인)"}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">도면 타입</span>
                    <span className="font-extrabold text-slate-900">{item.drawingType || "옴니버스"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">업체명</span>
                    <span className="font-extrabold text-slate-900 truncate block">{item.clientName}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">현장 주소</span>
                    <span className="font-extrabold text-slate-900 truncate block">{item.siteAddress || "미지정"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">시공일</span>
                    <span className="font-extrabold text-indigo-700 font-mono">{item.deliveryDate || item.dueDate}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">현장 담당자 연락처</span>
                    <span className="font-extrabold text-slate-900 font-mono truncate block">{item.siteContactPhone || "미입력"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">포스트바 컬러</span>
                    <span className="font-extrabold text-slate-900">{item.postColor || "흑니켈"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">합판 컬러 (종류)</span>
                    <span className="font-extrabold text-slate-900 truncate block">{item.boardColor || "PET 18T 화이트"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] font-bold">도면 담당자</span>
                    <span className="font-extrabold text-indigo-700 truncate block">{item.drawingAssignee || item.assignee}</span>
                  </div>
                </div>
              </div>

              {/* Toast Message */}
              {reqToast && (
                <div className="p-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{reqToast}</span>
                </div>
              )}


              {/* Status Display Card */}
              {!drawingReq ? (
                <div className="p-3.5 bg-white/80 rounded-xl border border-indigo-100 text-xs text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    아직 바론웹으로 도면 정보가 전송되지 않았습니다. 상단 <strong>[도면 정보 전송]</strong> 버튼을 누르시면 바론웹에 신규 알림이 전달됩니다.
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">바론웹 요청 연동 상태:</span>
                    <span className="font-extrabold px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-800">
                      {drawingReq.status === "pending" && "⏳ 바론웹 알림 전달됨 (도면작업 대기 중)"}
                      {drawingReq.status === "in_progress" && "✏️ 바론웹에서 도면 작성 진행 중"}
                      {drawingReq.status === "review_pending" && "🔍 도면 완료! 컨펌 대기 중"}
                      {drawingReq.status === "confirmed" && "✅ 도면 최종 승인 완료"}
                    </span>
                  </div>

                  {/* If Review Pending: Confirmation Buttons */}
                  {drawingReq.status === "review_pending" && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>바론웹에서 도면 작성이 완료되었습니다. 완성된 도면을 검토 후 승인해 주세요.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleConfirmDrawing(true)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>도면 최종 승인 (완성 도면 첨부)</span>
                        </button>
                        <button
                          onClick={() => handleConfirmDrawing(false)}
                          className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-rose-600" />
                          <span>수정 요청 (바론웹 재작업)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {drawingReq.status === "confirmed" && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>도면 검토가 최종 완료되어 승인되었습니다. 도면 파일이 아래 첨부파일에 추가되었습니다.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 📦 Material Order Management Section */}
            <MaterialOrderManager
              orders={getMaterialOrders(item)}
              onChange={(updatedOrders) => {
                const allDone = updatedOrders.length > 0 && updatedOrders.every((o) => o.isOrdered);
                updateWorkItem(item.id, {
                  materialOrders: updatedOrders,
                  materialOrderNeeded: updatedOrders.map((o) => o.name).join(", "),
                  materialOrderStatus: updatedOrders.length === 0 ? "발주불필요" : allDone ? "발주완료" : "발주필요",
                });
              }}
            />


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

            {/* Attachments Section: Drawings, PDFs, Documents Only */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    도면(PDF) 및 첨부 문서 ({docAttachments.length})
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
              {docAttachments.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition space-y-1.5"
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    설계도면(PDF), 재단 리스트 등 문서 파일을 업로드하세요.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF 도면은 별도 프로그램 없이 앱 안에서 즉시 열람할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docAttachments.map((att) => {
                    const isPdf = att.fileType === "pdf" || att.name.endsWith(".pdf");

                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 text-white text-[11px]",
                              isPdf ? "bg-rose-600 shadow-xs" : "bg-slate-600"
                            )}
                          >
                            {isPdf ? "PDF" : "FILE"}
                          </div>

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

            {/* 💬 SNS 게시물/피드 스타일 현장 소통 댓글 섹션 */}

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span>댓글</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {liveItem?.comments?.length || 0}
                      </span>
                    </h3>
                  </div>
                </div>
              </div>

              {/* Quick Comment Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-bold text-slate-500 mr-1">⚡ 빠른 댓글:</span>
                {[
                  "✅ 현장 시공이 성공적으로 완료되었습니다!",
                  "🚚 발주 자재 및 하드웨어 출고 완료",
                  "📐 변경 도면 검토 요청드립니다.",
                  "⚠️ 현장 실측 치수 재확인이 필요합니다.",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAddComment(chip)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Comment Submission Form with Photo Attachment */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                {/* Photo attached preview row inside comment form */}
                {commentAttachedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    {commentAttachedPhotos.map((pUrl, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden border border-indigo-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pUrl} alt="preview" className="w-16 h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachedPhoto(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 p-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />

                  {/* Hidden photo file input */}
                  <input
                    type="file"
                    ref={commentFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleCommentPhotoSelect}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => commentFileInputRef.current?.click()}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-extrabold transition flex items-center gap-1 cursor-pointer justify-center"
                      title="댓글에 사진 첨부"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      <span>사진</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddComment()}
                      disabled={!newCommentText.trim() && commentAttachedPhotos.length === 0}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>등록</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments Timeline Feed */}
              {(!liveItem?.comments || liveItem.comments.length === 0) ? (
                <div className="p-6 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  등록된 댓글이 없습니다.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {liveItem.comments.map((cmt) => {
                    const cmtImages = cmt.images || (cmt.imageUrl ? [cmt.imageUrl] : []);
                    return (
                      <div
                        key={cmt.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-2xs hover:shadow-xs transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                              {cmt.author[0] || "유"}
                            </div>
                            <span className="font-extrabold text-slate-900 text-xs">{cmt.author}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">
                              {cmt.createdAt.includes("T") ? cmt.createdAt.split("T")[0] : cmt.createdAt}
                            </span>
                            <button
                              onClick={() => deleteComment(liveItem.id, cmt.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer rounded"
                              title="댓글 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-sans pl-9 whitespace-pre-wrap">
                          {cmt.content}
                        </p>

                        {/* Comment Attached Photos inline with Small Red X badge button */}
                        {cmtImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1 pl-9">
                            {cmtImages.map((imgUrl, idx) => (
                              <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgUrl}
                                  alt={`cmt-photo-${idx}`}
                                  onClick={() => {
                                    const pIndex = allPhotos.findIndex((p) => p.url === imgUrl);
                                    if (pIndex !== -1) setActivePhotoIndex(pIndex);
                                  }}
                                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover cursor-pointer group-hover:scale-105 transition"
                                />
                                {/* Red Circle X Mark Delete Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCommentImage(liveItem.id, cmt.id, imgUrl);
                                  }}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-md border-2 border-white transition cursor-pointer z-20"
                                  title="사진 개별 삭제"
                                >
                                  <X className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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

      {/* 🖼️ Photo Lightbox Carousel Overlay with Prev (<) & Next (>) Buttons */}
      {(activePhotoIndex !== null || activeImageUrl) && (
        <div
          onClick={() => {
            setActivePhotoIndex(null);
            setActiveImageUrl(null);
          }}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full flex flex-col items-center justify-center max-h-[92vh]"
          >
            {/* Carousel Header Bar */}
            <div className="w-full flex items-center justify-between text-white text-xs font-bold mb-3 px-3">
              <span className="flex items-center gap-2">
                {allPhotos.length > 0 && activePhotoIndex !== null && (
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                    사진 {activePhotoIndex + 1} / {allPhotos.length}
                  </span>
                )}
                <span className="truncate max-w-md font-mono">
                  {activePhotoIndex !== null && allPhotos[activePhotoIndex]
                    ? allPhotos[activePhotoIndex].name
                    : "시공 현장 사진"}
                </span>
              </span>

              <button
                onClick={() => {
                  setActivePhotoIndex(null);
                  setActiveImageUrl(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image Viewport with Prev (<) & Next (>) Buttons */}
            <div className="relative flex items-center justify-center w-full group">
              {allPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/70 hover:bg-blue-600 text-white transition shadow-xl border border-white/20 cursor-pointer"
                  title="이전 사진 (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  activePhotoIndex !== null && allPhotos[activePhotoIndex]
                    ? allPhotos[activePhotoIndex].url
                    : activeImageUrl || ""
                }
                alt="Preview"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
              />

              {allPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/70 hover:bg-blue-600 text-white transition shadow-xl border border-white/20 cursor-pointer"
                  title="다음 사진 (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Carousel Footer info */}
            <div className="mt-3 flex items-center justify-between w-full text-white/80 text-xs px-3">
              <span>💡 클릭하거나 키보드 ◀ ▶ 방향키를 누르면 사진을 연속으로 넘겨볼 수 있습니다.</span>
              {(activePhotoIndex !== null || activeImageUrl) && (

                <a
                  href={
                    activePhotoIndex !== null && allPhotos[activePhotoIndex]
                      ? allPhotos[activePhotoIndex].url
                      : activeImageUrl || ""
                  }
                  download="시공사진.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>원본 다운로드</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
