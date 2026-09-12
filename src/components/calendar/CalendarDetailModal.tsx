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

import { WorkItem } from "@/types";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

interface CalendarDetailModalProps {
  item: WorkItem;
  onClose: () => void;
}

export function CalendarDetailModal({ item, onClose }: CalendarDetailModalProps) {
  const { workItems, addComment, deleteComment, deleteCommentImage, deletePhotoFromWorkItem, uploadConstructionPhoto, updateWorkItem } = useData();

  // Reactive subscription to live item in DataContext
  const liveItem = workItems.find((w) => w.id === item.id) || item;

  const [activeTab, setActiveTab] = useState<"blueprint" | "comments" | "photos">("blueprint");
  
  // Date & Schedule edit state
  const [isEditingDate, setIsEditingDate] = useState(false);

  const initialParts = (liveItem.deliveryDate || "2026-09-15").split("-");
  const [editYear, setEditYear] = useState<number>(parseInt(initialParts[0]) || 2026);
  const [editMonth, setEditMonth] = useState<number>(parseInt(initialParts[1]) || 9);
  const [editDay, setEditDay] = useState<number>(parseInt(initialParts[2]) || 15);

  const [editDeadlineType, setEditDeadlineType] = useState<"시공일" | "배송일" | "요청일">(
    liveItem.deadlineType || "시공일"
  );
  const [editRegion, setEditRegion] = useState(liveItem.region || "반포");
  const [editStatus, setEditStatus] = useState(liveItem.status);
  const [saveNotice, setSaveNotice] = useState("");

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
                  {item.deadlineType || "시공일"}
                </span>
                <span className="font-extrabold text-white text-base">
                  {item.clientName} {item.siteAddress || item.region} ({item.drawingType || "옴니버스"})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>시공 마감: <strong>{item.deliveryDate}</strong></span>
                <span>•</span>
                <span>지역: <strong>{item.region || "서초동"}</strong></span>
                <span>•</span>
                <span>상태: <strong className="text-blue-300">{item.status}</strong></span>
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
              <span>완료 도면 ({docAttachments.length})</span>
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
              onClick={() => setIsEditingDate(!isEditingDate)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEditingDate ? "일정 수정 닫기" : "📅 일정 변경"}</span>
            </button>
          </div>
        </div>

        {/* Schedule Extension/Modification Banner Form */}
        {isEditingDate && (
          <form onSubmit={handleSaveScheduleEdit} className="bg-amber-50 p-4 border-b border-amber-200 space-y-3 shrink-0 animate-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                현장 시공일 / 배송 요청일 변경 (연기 및 조율)
              </span>
              <span className="text-[11px] text-amber-800 font-bold">
                현재 일정: {item.deliveryDate} ({item.deadlineType})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-amber-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">구분</label>
                <select
                  value={editDeadlineType}
                  onChange={(e) => setEditDeadlineType(e.target.value as "시공일" | "배송일" | "요청일")}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                >
                  <option value="시공일">시공일</option>
                  <option value="배송일">배송일</option>
                  <option value="요청일">요청일</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">연도 / 월</label>
                <div className="flex gap-1">
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(parseInt(e.target.value))}
                    className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    {YEARS_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select
                    value={editMonth}
                    onChange={(e) => setEditMonth(parseInt(e.target.value))}
                    className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  >
                    {MONTHS_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">일 선택</label>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(parseInt(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                >
                  {DAYS_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">현장 지역</label>
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs"
                  placeholder="반포, 서초, 성수 등"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingDate(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg transition flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>변경사항 저장</span>
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
          {/* SECTION 1: BLUEPRINT & SPECS */}
          <div id="cal-sec-blueprint" className="space-y-4 text-xs">
            {/* Attached Blueprint Files List (Documents Only) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>완료 도면 및 첨부 문서 ({docAttachments.length}개)</span>
              </h3>

              {docAttachments.length === 0 ? (
                <div className="p-4 bg-white rounded-lg border border-dashed text-center text-slate-400 text-xs">
                  등록된 도면/문서 파일이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-blue-300 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded bg-rose-50 text-rose-600 font-bold text-[10px]">
                          {att.fileType === "pdf" ? "PDF" : "DOC"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate" title={att.name}>
                            {att.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {att.size} | {att.uploadedAt}
                          </span>
                        </div>
                      </div>

                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>확인</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Embedded PDF/Blueprint Viewer Simulation */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                  <FileText className="w-4 h-4" />
                  도면 실시간 미리보기 (Live Blueprint Reader)
                </span>
                <span className="text-[10px] text-slate-400">Scale: 1:1 CAD Engine</span>
              </div>

              <div className="h-48 sm:h-56 bg-slate-950 rounded-lg border border-slate-800 p-4 flex flex-col items-center justify-center relative overflow-hidden text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {docAttachments[0]?.name || "도면 설계안"}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    현장: {item.region || "반포"} | 업체: {item.clientName} | 담당: {item.assignee}
                  </p>
                </div>
                {docAttachments[0] && (
                  <a
                    href={docAttachments[0].url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 shadow-sm mt-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>전체 도면 PDF 다운로드/열기</span>
                  </a>
                )}
              </div>
            </div>

            {/* Specification Text */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="font-bold text-slate-900">상세 현장 작업지시 및 비고</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                {item.description || item.notes || "특이사항 없음"}
              </p>
            </div>
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
            작성일: {new Date(item.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
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

