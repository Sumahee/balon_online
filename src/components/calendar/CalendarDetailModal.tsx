"use client";

import React, { useState } from "react";
import {
  X,
  Calendar as CalendarIcon,
  MapPin,
  Building2,
  FileText,
  MessageSquare,
  Camera,
  Download,
  Send,
  Upload,
  Sparkles,
  CheckCircle2,
  Paperclip,
  Clock,
  User,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
  Plus,
  UploadCloud,
} from "lucide-react";

import { WorkItem, ClientInfo, DrawingType, WorkStatus, Priority, AttachmentItem } from "@/types";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { UnifiedBoardEditor } from "@/components/common/UnifiedBoardEditor";

interface CalendarDetailModalProps {
  item: WorkItem;
  onClose: () => void;
}

export function CalendarDetailModal({ item, onClose }: CalendarDetailModalProps) {
  const { workItems, addComment, deleteComment, deleteCommentImage, deletePhotoFromWorkItem, uploadConstructionPhoto, updateWorkItem } = useData();

  // Reactive subscription to live item in DataContext
  const liveItem = workItems.find((w) => w.id === item.id) || item;

  const [activeTab, setActiveTab] = useState<"blueprint" | "comments" | "photos">("blueprint");
  
  // Full Edit Mode state (Title, Client, Address, DrawingType, DeadlineType, DeliveryDate, Region, Status, Priority, Description, Attachments)
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientsList, setClientsList] = useState<ClientInfo[]>([]);

  const initialParts = (liveItem.deliveryDate || "2026-09-15").split("-");
  const [editYear, setEditYear] = useState<number>(parseInt(initialParts[0]) || 2026);
  const [editMonth, setEditMonth] = useState<number>(parseInt(initialParts[1]) || 9);
  const [editDay, setEditDay] = useState<number>(parseInt(initialParts[2]) || 15);

  const [editTitle, setEditTitle] = useState(liveItem.title || "");
  const [editClientName, setEditClientName] = useState(liveItem.clientName || "");
  const [editSiteAddress, setEditSiteAddress] = useState(liveItem.siteAddress || "");
  const [editDrawingType, setEditDrawingType] = useState<DrawingType>(liveItem.drawingType || "천정형");
  const [editDeadlineType, setEditDeadlineType] = useState<"시공일" | "배송일" | "요청일">(
    liveItem.deadlineType || "시공일"
  );
  const [editRegion, setEditRegion] = useState(liveItem.region || "반포");
  const [editStatus, setEditStatus] = useState<WorkStatus>(liveItem.status || "대기");
  const [editPriority, setEditPriority] = useState<Priority>(liveItem.priority || "보통");
  const [editCategory, setEditCategory] = useState<string>(liveItem.category || "제작");
  const [editDescription, setEditDescription] = useState(liveItem.description || liveItem.notes || "");
  const [editAttachments, setEditAttachments] = useState<AttachmentItem[]>(liveItem.attachments || []);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  // Load live clients list for autocomplete
  React.useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.clients)) {
          setClientsList(data.clients);
        }
      })
      .catch(() => {});
  }, []);

  // Comment state
  const [authorName, setAuthorName] = useState("바론 INT 오피스");
  const [commentText, setCommentText] = useState("");
  const [commentAttachedPhotos, setCommentAttachedPhotos] = useState<string[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentFileInputRef = React.useRef<HTMLInputElement>(null);

  // Photo upload state
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoSize, setPhotoSize] = useState("2.5 MB");
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);

  // Photo Carousel Lightbox State
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Top Document Attachments (excludes comment images & photo uploads)
  const docAttachments = React.useMemo(() => {
    return (liveItem.attachments || []).filter(
      (att) => att.fileType !== "image" && !/\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)
    );
  }, [liveItem.attachments]);

  // All Photos list (combines card photo uploads & comment attached photos)
  const allPhotos = React.useMemo(() => {
    const list: { id: string; name: string; url: string; size?: string; uploadedAt?: string }[] = [];
    (liveItem.attachments || []).forEach((att) => {
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
    (liveItem.comments || []).forEach((cmt, cIdx) => {
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
  }, [liveItem.attachments, liveItem.comments]);

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

  const handleLocalDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          uploadConstructionPhoto(liveItem.id, file.name, event.target.result as string, sizeStr);
          if (index === 0) {
            setPhotoFileName(file.name);
            setPhotoUrl(event.target.result as string);
            setPhotoSize(sizeStr);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setPhotoUploadSuccess(true);
    setTimeout(() => setPhotoUploadSuccess(false), 4000);
  };

  // Immediate upload & post when user selects photo files from OS dialog ("열기")
  const handleCommentPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
            authorName,
            commentText.trim() || "📷 [현장 사진]",
            newPhotoUrls
          );
          setCommentText("");
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

  const YEARS_OPTIONS = [2025, 2026, 2027, 2028, 2029, 2030];
  const MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(editYear, editMonth, 0).getDate();
  const DAYS_OPTIONS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleMarkAsCompleted = async () => {
    const isCurrentlyCompleted = liveItem.status === "시공완료";
    const newStatus = isCurrentlyCompleted ? "준비완료" : "시공완료";
    const newProgress = isCurrentlyCompleted ? 90 : 100;

    await updateWorkItem(liveItem.id, {
      status: newStatus,
      progress: newProgress,
    });

    setSaveNotice(
      isCurrentlyCompleted
        ? "시공 완료가 취소되어 준비완료 상태로 변경되었습니다."
        : "🏗️ 현장 시공 완료 처리되었습니다!"
    );
    setTimeout(() => setSaveNotice(""), 4000);
  };

  const handleOpenEditMode = () => {
    setEditTitle(liveItem.title || "");
    setEditClientName(liveItem.clientName || "");
    setEditSiteAddress(liveItem.siteAddress || "");
    setEditDrawingType(liveItem.drawingType || "천정형");
    setEditDeadlineType(liveItem.deadlineType || "시공일");
    setEditRegion(liveItem.region || "반포");
    setEditStatus(liveItem.status || "대기");
    setEditPriority(liveItem.priority || "보통");
    setEditCategory(liveItem.category || "제작");
    setEditDescription(liveItem.description || liveItem.notes || "");
    setEditAttachments(liveItem.attachments || []);

    const parts = (liveItem.deliveryDate || "2026-09-15").split("-");
    setEditYear(parseInt(parts[0]) || 2026);
    setEditMonth(parseInt(parts[1]) || 9);
    setEditDay(parseInt(parts[2]) || 15);

    setIsEditMode(true);
  };

  const handleSaveAllEdits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const finalDateStr = `${editYear}-${String(editMonth).padStart(2, "0")}-${String(editDay).padStart(2, "0")}`;

    await updateWorkItem(liveItem.id, {
      title: editTitle.trim() || liveItem.title,
      clientName: editClientName.trim() || liveItem.clientName,
      siteAddress: editSiteAddress.trim(),
      drawingType: editDrawingType,
      deadlineType: editDeadlineType,
      deliveryDate: finalDateStr,
      dueDate: finalDateStr,
      region: editRegion,
      status: editStatus,
      priority: editPriority,
      category: editCategory as any,
      description: editDescription,
      notes: editDescription,
      attachments: editAttachments,
    });

    setIsSaving(false);
    setIsEditMode(false);
    setIsEditingDate(false);
    setSaveNotice("✨ 모든 수정 내용(제목, 업체, 현장, 도면타입, 일정, 본문, 첨부파일)이 저장되었습니다!");
    setTimeout(() => setSaveNotice(""), 4000);
  };

  const handleSaveScheduleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDateStr = `${editYear}-${String(editMonth).padStart(2, "0")}-${String(editDay).padStart(2, "0")}`;

    await updateWorkItem(liveItem.id, {
      deliveryDate: finalDateStr,
      startDate: finalDateStr,
      dueDate: finalDateStr,
      deadlineType: editDeadlineType,
      region: editRegion,
      status: editStatus,
    });

    setIsEditingDate(false);
    setSaveNotice(`일정이 ${finalDateStr} (${editDeadlineType})로 변경/연기 되었습니다!`);
    setTimeout(() => setSaveNotice(""), 4000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachedPhotos.length === 0) return;

    setIsSubmittingComment(true);
    await addComment(
      liveItem.id,
      authorName,
      commentText.trim() || "📷 [사진 첨부]",
      commentAttachedPhotos
    );
    setCommentText("");
    setCommentAttachedPhotos([]);
    setIsSubmittingComment(false);
  };

  const handlePhotoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) return;

    const fileName = photoFileName.trim() || `${item.region || "현장"}_시공완료사진.jpg`;
    await uploadConstructionPhoto(item.id, fileName, photoUrl.trim(), photoSize);
    
    setPhotoUploadSuccess(true);
    setPhotoFileName("");
    setPhotoUrl("");
    setTimeout(() => setPhotoUploadSuccess(false), 4000);
  };

  const samplePhotoPresets = [
    {
      name: "반포_원베일리_아일랜드_시공완료.jpg",
      url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "한남동_붙박이장_시공완료.jpg",
      url: "https://images.unsplash.com/photo-1558997519-83ea9252def8?auto=format&fit=crop&w=1200&q=80",
    },
    {
      name: "성수동_팬트리_라운지_마감.jpg",
      url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const REGIONS_LIST = ["반포", "일산", "서초", "한남", "성수", "판교", "분당"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-500/30">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[11px] border border-blue-500/30">
                  {liveItem.deadlineType || "시공일"}
                </span>
                <span className="font-extrabold text-white text-base">
                  {liveItem.clientName} {liveItem.siteAddress || liveItem.region} ({liveItem.drawingType || "천정형"})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>시공 마감: <strong>{liveItem.deliveryDate}</strong></span>
                <span>•</span>
                <span>지역: <strong>{liveItem.region || "서초동"}</strong></span>
                <span>•</span>
                <span>상태: <strong className="text-blue-300">{liveItem.status}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const el = document.getElementById("cal-sec-blueprint");
                el?.scrollIntoView({ behavior: "smooth" });
                setActiveTab("blueprint");
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer",
                activeTab === "blueprint" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>작업 내용/도면 ({docAttachments.length})</span>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("cal-sec-photos");
                el?.scrollIntoView({ behavior: "smooth" });
                setActiveTab("photos");
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer",
                activeTab === "photos" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>시공 사진 ({allPhotos.length})</span>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("cal-sec-comments");
                el?.scrollIntoView({ behavior: "smooth" });
                setActiveTab("comments");
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer",
                activeTab === "comments" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>댓글 ({item.comments?.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAsCompleted}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs",
                liveItem.status === "시공완료"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{liveItem.status === "시공완료" ? "✅ 시공완료 됨 (취소)" : "🏗️ 시공완료 처리"}</span>
            </button>

            <button
              onClick={isEditMode ? handleSaveAllEdits : handleOpenEditMode}
              disabled={isSaving}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs",
                isEditMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-300"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              {isEditMode ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
                  <span>{isSaving ? "저장 중..." : "💾 수정 완료 및 저장"}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>✏️ 전체 내용 수정</span>
                </>
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition text-xs cursor-pointer"
              >
                취소
              </button>
            )}
          </div>
        </div>

        {/* Full Edit Mode Form */}
        {isEditMode && (
          <form onSubmit={handleSaveAllEdits} className="bg-blue-50/70 p-4 border-b border-blue-200 space-y-3 shrink-0 animate-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                전체 정보 수정 모드 (제목, 업체명, 주소, 일정, 도면타입 등)
              </span>
              <span className="text-[11px] text-blue-700 font-bold">
                수정 후 [전체 변경사항 저장]을 누르면 즉시 DB에 영구 반영됩니다.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-xl border border-blue-200">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">프로젝트 제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">의뢰 업체명</label>
                <input
                  type="text"
                  list="cal-detail-clients"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <datalist id="cal-detail-clients">
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">현장 상세 주소</label>
                <input
                  type="text"
                  value={editSiteAddress}
                  onChange={(e) => setEditSiteAddress(e.target.value)}
                  placeholder="예: 반포동 104동"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">시공/현장 지역</label>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                >
                  {REGIONS_LIST.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">도면 타입</label>
                <div className="grid grid-cols-4 gap-1">
                  {(["천정형", "에보라", "옴니버스", "기타"] as const).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setEditDrawingType(dt)}
                      className={cn(
                        "py-1.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer text-center",
                        editDrawingType === dt
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">마감 구분</label>
                <select
                  value={editDeadlineType}
                  onChange={(e) => setEditDeadlineType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                >
                  <option value="시공일">시공일</option>
                  <option value="배송일">배송일</option>
                  <option value="요청일">요청일</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">연도 / 월 / 일</label>
                <div className="grid grid-cols-3 gap-1">
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(parseInt(e.target.value))}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    {YEARS_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select
                    value={editMonth}
                    onChange={(e) => setEditMonth(parseInt(e.target.value))}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    {MONTHS_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(parseInt(e.target.value))}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    {DAYS_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}일</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">업무 상태</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                >
                  <option value="대기">대기</option>
                  <option value="오피스">오피스</option>
                  <option value="공장">공장</option>
                  <option value="준비완료">준비완료</option>
                  <option value="시공완료">시공완료</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
              >
                수정 취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg transition flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSaving ? "저장 중..." : "전체 변경사항 저장"}</span>
              </button>
            </div>
          </form>
        )}

        {saveNotice && (
          <div className="bg-emerald-50 text-emerald-800 p-3 text-xs font-bold border-b border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* Modal Main Scrollable Content (Single Continuous SNS Post Feed) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: UNIFIED BOARD (TEXT + ATTACHMENTS + IMAGES + PDFS) */}
          <div id="cal-sec-blueprint" className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>작업 내용 및 첨부 도면/파일</span>
              </h3>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleOpenEditMode}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>내용 수정 및 파일 추가</span>
                </button>
              )}
            </div>

            <UnifiedBoardEditor
              description={isEditMode ? editDescription : (liveItem.description || liveItem.notes || "")}
              onChangeDescription={setEditDescription}
              attachments={isEditMode ? editAttachments : (liveItem.attachments || [])}
              onChangeAttachments={setEditAttachments}
              readOnly={!isEditMode}
              placeholder="작업 지시사항, 상세 사양, 현장 메모를 입력하세요... 파일이나 도면, 사진을 여기에 바로 끌어다 놓으시면 됩니다."
            />
          </div>

          {/* SECTION 2: ATTACHED PHOTOS FEED & MULTI-PHOTO UPLOAD */}
          <div id="cal-sec-photos" className="bg-amber-50/30 p-5 rounded-2xl border border-amber-200/80 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span>시공 현장 첨부 사진 피드</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {allPhotos.length}장
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    사진을 클릭하면 크게 확대되며 <strong>이전/다음 연속 슬라이더</strong>로 감상할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Multi photo upload trigger button */}
              <button
                type="button"
                onClick={() => document.getElementById("cal-local-device-photo-input")?.click()}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span>📷 사진 여러 장 선택 업로드</span>
              </button>
            </div>

            {/* Hidden file input with MULTIPLE selection */}
            <input
              id="cal-local-device-photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleLocalDeviceFileSelect}
              className="hidden"
            />

            {photoUploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  ✨ 시공 사진 일괄 등록 완료! 갤러리(/gallery)에 <strong>#{item.region || "반포"}</strong> 태그로 자동 수집되었습니다.
                </span>
              </div>
            )}

            {/* Photo Thumbnails Feed Grid */}
            {allPhotos.length === 0 ? (
              <div
                onClick={() => document.getElementById("cal-local-device-photo-input")?.click()}
                className="p-6 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white cursor-pointer text-center space-y-1.5 transition group"
              >
                <Camera className="w-8 h-8 text-amber-400 mx-auto group-hover:scale-110 transition" />
                <span className="font-extrabold text-slate-900 text-xs block">
                  시공 현장 사진을 여러 장 한 번에 올리려면 여기를 클릭하세요.
                </span>
                <span className="text-[11px] text-slate-400 block">
                  폰 앨범 또는 PC 파일 탐색기에서 다중 선택 가능 (JPG, PNG, WEBP 등)
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allPhotos.map((photo, idx) => (
                  <div
                    key={photo.id || idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className="bg-white rounded-xl border border-amber-200/80 overflow-hidden shadow-2xs cursor-pointer group hover:border-amber-500 hover:shadow-md transition relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-2xs flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-amber-300" />
                      <span>{idx + 1}/{allPhotos.length}</span>
                    </div>

                    {/* Red Circle with X mark Delete Button for Photo Grid */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhotoFromWorkItem(liveItem.id, photo.url);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-md border-2 border-white transition cursor-pointer z-20"
                      title="사진 개별 삭제"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="p-2 space-y-0.5 bg-white">
                      <span className="font-bold text-slate-900 block truncate text-[11px]">{photo.name}</span>
                      <span className="text-[10px] text-amber-700 font-bold block">#{liveItem.region || "반포"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: SNS COMMENTS TIMELINE FEED & INPUT AT BOTTOM */}
          <div id="cal-sec-comments" className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>댓글</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {(liveItem.comments?.length || 0)}
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
                  onClick={async () => {
                    await addComment(liveItem.id, authorName, chip);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Comments List Feed */}
            {(!liveItem.comments || liveItem.comments.length === 0) ? (
              <div className="p-6 bg-white rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
                등록된 댓글이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {liveItem.comments.map((cmt) => {
                  const cmtImages = cmt.images || (cmt.imageUrl ? [cmt.imageUrl] : []);
                  return (
                    <div key={cmt.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center border border-indigo-200">
                            {cmt.author[0] || "유"}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">{cmt.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
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

                      <p className="text-slate-800 leading-relaxed pl-8 font-sans text-xs whitespace-pre-wrap">
                        {cmt.content}
                      </p>

                      {/* Comment Attached Photos inline with Red Circle X Delete Button */}
                      {cmtImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 pl-8">
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

            {/* SNS Comment Input Form AT THE VERY BOTTOM */}
            <form onSubmit={handleCommentSubmit} className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-indigo-600" />
                  <span>댓글 작성</span>
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">작성자:</span>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-800 text-xs w-32"
                    placeholder="작성자 이름"
                  />
                </div>
              </div>

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
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition"
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
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

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
                    type="submit"
                    disabled={isSubmittingComment || (!commentText.trim() && commentAttachedPhotos.length === 0)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>등록</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>


        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            작성일: {new Date(liveItem.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                type="button"
                onClick={handleSaveAllEdits}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "저장 중..." : "전체 변경사항 저장"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 🖼️ Photo Lightbox Carousel Overlay with Prev (<) & Next (>) Buttons */}
      {activePhotoIndex !== null && allPhotos.length > 0 && (
        <div
          onClick={() => setActivePhotoIndex(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full flex flex-col items-center justify-center max-h-[92vh]"
          >
            {/* Header info */}
            <div className="w-full flex items-center justify-between text-white text-xs font-bold mb-3 px-3">
              <span className="flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                  사진 {activePhotoIndex + 1} / {allPhotos.length}
                </span>
                <span className="truncate max-w-md">{allPhotos[activePhotoIndex].name}</span>
              </span>

              <button
                onClick={() => setActivePhotoIndex(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview with Prev & Next Buttons */}
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
                src={allPhotos[activePhotoIndex].url}
                alt={allPhotos[activePhotoIndex].name}
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

            {/* Bottom bar */}
            <div className="mt-3 flex items-center justify-between w-full text-white/80 text-xs px-3">
              <span>💡 클릭하거나 키보드 ◀ ▶ 방향키로 연속 사진 넘겨보기가 가능합니다.</span>
              <a
                href={allPhotos[activePhotoIndex].url}
                download={allPhotos[activePhotoIndex].name}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>원본 다운로드</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

