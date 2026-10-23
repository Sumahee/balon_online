"use client";
import { ConstructionPhotoPicker } from "@/components/common/ConstructionPhotoPicker";
import { DrawingUploadBlock } from "@/components/common/DrawingUploadBlock";
import { isDrawingAttachment } from "@/lib/drawing-attachments";
import { WorkEditorModal } from "@/components/common/WorkEditorModal";
import { WorkDetailHeader } from "@/components/common/WorkDetailHeader";
import { PhotoImage } from "@/components/common/PhotoImage";
import { isInstaller } from "@/lib/access";
import { InstallerTaskDetail } from "@/components/dashboard/InstallerTaskDetail";
import { MaterialOrderManager } from "@/components/dashboard/MaterialOrderManager";
import { useModalBack } from "@/lib/use-modal-back";
import { PdfPreview } from "@/components/common/PdfPreview";
import { WorkDetailGate } from "@/components/common/WorkDetailGate";
import { STATUS_PROGRESS } from "@/lib/work-form";
import { workStatusLabel } from "@/lib/work-status";
import { getWorkTitle } from "@/lib/work-title";


import { getToday } from "@/lib/date";

import {
AlertTriangle,
Building,
Camera,
CheckCircle,
CheckCircle2,
ChevronLeft,
ChevronRight,
Clock,
Download,
ExternalLink,
MessageSquare,
Send,
Sparkles,
Trash2,
X
} from "lucide-react";
import { DrawingLinksPanel } from "./DrawingLinksPanel";
import React,{ useRef,useState } from "react";

import { UnifiedBoardEditor } from "@/components/common/UnifiedBoardEditor";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { bodyText } from "@/lib/body-content";
import { getMaterialOrders } from "@/lib/materialUtils";
import { readPhotoFile } from "@/lib/photo-compression";
import { cn } from "@/lib/utils";
import { AttachmentItem,CardType,DeadlineType,DrawingRequest,WorkItem,WorkStatus } from "@/types";

interface TaskDetailModalProps {
  item: WorkItem | null;
  startPhotoUpload?: boolean;
  onClose: () => void;
}

export function TaskDetailModal({item,onClose,startPhotoUpload}:TaskDetailModalProps) { const {user}=useAuth(); return <WorkDetailGate item={item} onClose={onClose}>{loaded => isInstaller(user) ? <InstallerTaskDetail item={loaded} onClose={onClose} startPhotoUpload={startPhotoUpload} /> : <TaskDetailContent item={loaded} onClose={onClose} startPhotoUpload={startPhotoUpload} />}</WorkDetailGate>; }
function TaskDetailContent({ item: originalItem, onClose, startPhotoUpload }: { item: WorkItem; onClose: () => void; startPhotoUpload?: boolean }) {
  const { workItems, updateWorkItem, isSaving, addComment, deleteComment, deleteCommentImage, loadMoreComments } = useData();
  const { user, token } = useAuth();

  // Reactive subscription to live item in DataContext
  const item = workItems.find((w) => w.id === originalItem.id) || originalItem;
  const liveItem = item;

  const [completionPrompt,setCompletionPrompt]=useState(false);
  const [completionError,setCompletionError]=useState("");
  const completionLock=useRef(false);
  const [photoOpen,setPhotoOpen]=useState(!!startPhotoUpload);
  const [photoFiles,setPhotoFiles]=useState<File[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const startEditingSpecs = () => setEditorOpen(true);

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



  // All photos for Lightbox Slider (combines card uploads & comment photos)
  const allPhotos = React.useMemo(() => {
    const list: { id: string; name: string; url: string; size?: string; uploadedAt?: string }[] = [];
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
      if (e.key === "ArrowLeft") setActivePhotoIndex((prev) => prev !== null && prev > 0 ? prev - 1 : allPhotos.length - 1);
      if (e.key === "ArrowRight") setActivePhotoIndex((prev) => prev !== null && prev < allPhotos.length - 1 ? prev + 1 : 0);
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
      user?.name || "미로그인 사용자",
      content || "📷 [사진 첨부]",
      commentAttachedPhotos
    );

    setNewCommentText("");
    setCommentAttachedPhotos([]);
  };


  const handleRemoveAttachedPhoto = (index: number) => {
    setCommentAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
  };


  // Fetch existing drawing request for this item
  React.useEffect(() => {
    if (item?.id && (item.cardType || "도면") === "도면") {
      fetch(`/api/drawing-requests?workItemId=${item.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.requests && data.requests.length > 0) {
            setDrawingReq(data.requests[0]);
          }
        })
        .catch(() => {});
    }
  }, [item?.id, item?.cardType]);

  if (!item) return null;

  const handleSendDrawingRequest = async (drawingProjectId?: string) => {
    if (!liveItem || isSendingReq) return;
    if (editorOpen) {
      window.alert("본문과 도면 사양을 저장한 뒤 전송해 주세요.");
      return;
    }
    const drawingWindow = window.open("about:blank", "_blank");
    if (!drawingWindow) {
      window.alert("새 창을 열 수 없습니다. 팝업을 허용한 뒤 다시 전송해 주세요.");
      return;
    }
    drawingWindow.opener = null;
    drawingWindow.document.body.textContent = "도면 정보를 전송하고 있습니다…";
    setIsSendingReq(true);
    const assignedUser = liveItem.drawingAssignee || "";

    try {
      const res = await fetch("/api/drawing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          workItemId: liveItem.id,
          drawingProjectId,
          drawingType: liveItem.drawingType || "옴니버스",
          clientName: liveItem.clientName,
          siteAddress: liveItem.siteAddress || "",
          deliveryDate: liveItem.deliveryDate || liveItem.dueDate,
          contactPhone: liveItem.siteContactPhone || "",
          ceilingHeight: liveItem.ceilingHeight || "",
          postColor: liveItem.postColor || "",
          boardColor: liveItem.boardColor || "",
          drawingAssignee: assignedUser,
          title: liveItem.title,
          description: bodyText(liveItem.description ?? liveItem.notes ?? ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.request || !data.launchUrl) {
        throw new Error(data.error || data.message || "도면 전송에 실패했습니다.");
      }
      drawingWindow.location.replace(data.launchUrl);
      if (data.success && data.request) {
        setDrawingReq(data.request);
        setReqToast("바론웹으로 도면 작업 요청이 전송되었습니다.");
        setTimeout(() => setReqToast(null), 4500);
      }
    } catch (err) {
      drawingWindow.close();
      window.alert(err instanceof Error ? err.message : "도면 전송에 실패했습니다.");
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
              name: `${getWorkTitle(item)}_완성도면.pdf`,
              url: drawingReq.resultPdfUrl,
              fileType: "pdf",
              size: "도면 파일",
              uploadedAt: getToday(),
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


  const STAGES: WorkStatus[] = ["대기", "오피스", "공장", "준비완료", "시공완료"];

  const handleStageChange = (newStatus: WorkStatus) => { void updateWorkItem(item.id, { status: newStatus, progress: STATUS_PROGRESS[newStatus] }).catch(() => {}); };
  useModalBack(completionPrompt,()=>{if(completionLock.current)return false;setCompletionPrompt(false);});
  useModalBack(!!activePdfUrl,()=>setActivePdfUrl(null));
  const handleClose = onClose;
  const finishWork=async()=>{
    if(completionLock.current)return;completionLock.current=true;setCompletionError("");
    try {await updateWorkItem(item.id,{status:"시공완료",progress:100});setCompletionPrompt(false);}
    catch {setCompletionError("완료 상태 저장에 실패했습니다. 다시 시도해주세요.");}
    finally {completionLock.current=false;}
  };
  const requestCompletion=()=>{if(liveItem.status!=="시공완료"){setCompletionError("");setCompletionPrompt(true);}};
  const completedLabel=workStatusLabel(liveItem,"시공완료");

  const deliveryDate = liveItem?.deliveryDate || item.dueDate;
  const daysUntilDelivery = Math.ceil((new Date(deliveryDate).getTime() - new Date(getToday()).getTime()) / 86400000);
  const isUrgent = item.priority === "긴급" || (daysUntilDelivery >= 0 && daysUntilDelivery <= 3);

  return (
    <>
      {completionPrompt && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-5" role="alertdialog" aria-modal="true" aria-label="시공완료 확인"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold">{completedLabel} 처리할까요?</h2><p className="mt-2 text-sm text-slate-500">확인하면 업무 상태가 {completedLabel}로 변경됩니다.</p>{completionError && <p role="alert" className="mt-3 text-sm text-rose-600">{completionError}</p>}<div className="mt-6 flex gap-3"><button disabled={isSaving} onClick={()=>setCompletionPrompt(false)} className="flex-1 rounded-xl border py-3 text-sm">나중에</button><button disabled={isSaving} onClick={()=>void finishWork()} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white">{isSaving?"저장 중…":completedLabel}</button></div></div></div>}
      {editorOpen && <WorkEditorModal item={liveItem} onClose={() => setEditorOpen(false)} />}
      <div role="dialog" aria-modal="true" aria-label="업무 상세" inert={editorOpen} aria-hidden={editorOpen}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
        {photoOpen && <ConstructionPhotoPicker onUploaded={()=>{setPhotoOpen(false);setNewCommentText("");requestCompletion();}} title={liveItem.title} initialFiles={photoFiles} onClose={()=>setPhotoOpen(false)} onUpload={photos=>addComment(liveItem.id,user?.name || "시공기사",newCommentText.trim() || "[시공 사진]",photos)} />}
      <div className="w-full sm:max-w-4xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh]">
          {/* Top Bar */}
          <div className="sm:hidden flex items-center gap-3 border-b border-slate-100 px-4 py-3 shrink-0 bg-white">
            <h1 className="min-w-0 flex-1 text-base font-bold text-slate-900">일정 상세</h1>
            <button type="button" disabled={isSaving || liveItem.status==="시공완료"} onClick={requestCompletion} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold",liveItem.status==="시공완료"?"bg-teal-50 text-teal-700":"bg-slate-100 text-slate-600")}>{workStatusLabel(liveItem,liveItem.status)}{liveItem.status!=="시공완료"&&" · 완료하기"}</button>
            <button aria-label="상세 닫기" onClick={handleClose} className="p-1.5"><X className="h-5 w-5" /></button>
          </div>
          <div className="hidden sm:flex px-6 py-4 border-b border-slate-200 bg-slate-50 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg border bg-white px-3 py-1 text-xs font-semibold">{item.cardType || "도면"}</span>

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

            <button type="button" disabled={isSaving || liveItem.status==="시공완료"} onClick={requestCompletion} className="ml-auto mr-3 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">{workStatusLabel(liveItem,liveItem.status)}{liveItem.status!=="시공완료"&&" · 완료하기"}</button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/80 px-3 py-3 sm:p-5 space-y-3">
            <section className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-sm" aria-label="기본정보와 본문">
              <h3 className="sr-only">기본정보 · 업무 내용</h3>
              <WorkDetailHeader item={liveItem} onEdit={startEditingSpecs} />
              {!!liveItem?.tags?.length && <div aria-label="업무 태그" className="flex flex-wrap gap-2">{liveItem.tags.map(tag => <span key={tag} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{tag}</span>)}</div>}
              {!!(liveItem?.description || liveItem?.notes || (liveItem.attachments??[]).filter(a=>!isDrawingAttachment(a)).length) && <UnifiedBoardEditor description={liveItem?.description || liveItem?.notes || ""} onChangeDescription={() => {}} attachments={(liveItem?.attachments ?? []).filter(attachment => !isDrawingAttachment(attachment))} onChangeAttachments={() => {}} readOnly minRows={3} onOpenAttachment={attachment => {if (attachment.fileType === "pdf") {setActivePdfUrl(attachment.url);setActivePdfTitle(attachment.name);} else window.open(attachment.url,"_blank","noopener,noreferrer");}} />}
              <div className="space-y-2 border-t border-slate-100 pt-4">{(liveItem.attachments??[]).filter(isDrawingAttachment).map(file=><button key={file.id} onClick={()=>{setActivePdfUrl(file.url);setActivePdfTitle(file.name);}} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"><span className="rounded-xl bg-rose-50 px-3 py-3 text-xs font-bold text-rose-600">PDF</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{file.name}</span><span className="text-xs text-slate-400">{file.size} · 도면 보기</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div>
              <details className="rounded-lg text-xs text-slate-500"><summary className="cursor-pointer py-1">상세 상태 변경</summary><div className="flex items-center gap-3 pt-2 text-sm"><label className="flex items-center gap-2">현재 상태<select aria-label="현재 업무 상태" value={liveItem?.status || item.status} disabled={isSaving} onChange={e => handleStageChange(e.target.value as WorkStatus)} className="rounded-lg border p-2">{(["대기", "오피스", "공장", "준비완료", "시공완료"] as WorkStatus[]).map(status => <option key={status} value={status}>{workStatusLabel(liveItem || item, status)}</option>)}</select></label><span className="text-xs text-slate-500" role="status">{isSaving ? "저장 중…" : "상태 변경은 즉시 저장됩니다"}</span></div></details>
              {!liveItem.confirmationCompleted && <div className="flex items-center gap-2"><button type="button" aria-pressed={!!liveItem?.confirmationPending} disabled={isSaving} onClick={() => { void updateWorkItem(item.id, { confirmationPending: !liveItem?.confirmationPending, confirmationCompleted: false }); }} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50", liveItem?.confirmationCompleted ? "border-emerald-300 bg-emerald-100 text-emerald-800" : liveItem?.confirmationPending ? "border-amber-400 bg-amber-100 text-amber-800 shadow-sm" : "border-slate-200 bg-slate-100 text-slate-500")}><span className={cn("inline-block mr-1.5 h-2 w-2 rounded-full", liveItem?.confirmationCompleted ? "bg-emerald-500" : liveItem?.confirmationPending ? "bg-amber-500" : "bg-slate-300")} />{liveItem?.confirmationCompleted ? "컨펌완료 ✓" : "컨펌중"}</button></div>}
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="시공사진">
              <h2 className="text-sm font-bold text-slate-800">시공사진 {allPhotos.length > 0 && <span className="ml-1 text-teal-600">{allPhotos.length}</span>}</h2>
              {allPhotos.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(liveItem.comments || []).flatMap(cmt => (cmt.images || (cmt.imageUrl ? [cmt.imageUrl] : [])).map((url,index) =>
                  <div key={cmt.id + "-" + index} className="relative overflow-hidden rounded-xl bg-slate-100">
                    <button type="button" aria-label={"시공사진 확대 " + (index + 1)} onClick={()=>setActivePhotoIndex(allPhotos.findIndex(photo=>photo.id==="cmt-photo-"+cmt.id+"-"+index))} className="block aspect-square w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <PhotoImage src={url} alt="시공사진" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                    <button type="button" aria-label="시공사진 삭제" disabled={isSaving} onClick={()=>void deleteCommentImage(liveItem.id,cmt.id,url)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>}
              <button type="button" disabled={isSaving} onClick={()=>{setPhotoFiles([]);setPhotoOpen(true);}} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
                <Camera className="h-5 w-5" />{allPhotos.length ? "시공사진 추가" : "시공사진 업로드"}
              </button>
            </section>

            <DrawingLinksPanel workItemId={liveItem.id} token={token} onOpen={projectId => { void handleSendDrawingRequest(projectId); }} />
            {(liveItem?.cardType || "도면") === "도면" && (
              <details className="hidden sm:block rounded-xl border border-indigo-200 bg-indigo-50/30">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-indigo-950">도면 정보 · {drawingReq ? "전달 내역 및 도면 확인" : "아직 전달하지 않음"}</summary>
            {/* 🎨 바론 웹 도면 작업 연동 & 수동 전송 / 컨펌 섹션 */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 rounded-2xl border border-indigo-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    🎨
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>도면 프로그램 전달</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        수동 전송 & 컨펌 시스템
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      현장 정보와 연결번호를 바론웹에 전달합니다. 기존 시트 구성은 유지하며, 컬러·천고 설정은 웹에서 확인 후 선택하여 적용합니다. 연결된 도면은 이어서 열 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* Dispatch Button */}
                <button
                  onClick={() => void handleSendDrawingRequest()}
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

              {drawingReq && (
                <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">마지막으로 도면 프로그램에 전달한 내용</h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["도면 타입", drawingReq.drawingType], ["업체", drawingReq.clientName],
                      ["현장", drawingReq.siteAddress], ["예정일", drawingReq.deliveryDate],
                      ["연락처", drawingReq.contactPhone], ["포스트바", drawingReq.postColor],
                      ["합판", drawingReq.boardColor], ["도면 담당자", drawingReq.drawingAssignee],
                    ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-slate-800">{value || "미입력"}</dd></div>)}
                  </dl>
                  {drawingReq.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{drawingReq.description}</p>}
                </div>
              )}
              <details className="rounded-xl border border-indigo-100 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">다음 전송에 사용할 사양 확인·수정</summary>
              <div className="p-4 text-xs space-y-3">
                  /* 👁️ VIEW MODE GRID (Clickable to Edit) */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 도면 타입 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">도면 타입</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 mt-0.5 block">{liveItem?.drawingType || "옴니버스"}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 업체명 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">업체명</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 truncate block mt-0.5">{liveItem?.clientName}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 현장 주소 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">현장 주소</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 truncate block mt-0.5">{liveItem?.siteAddress || "미지정"}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 시공일 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">시공일</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-indigo-700 font-mono mt-0.5 block">{liveItem?.deliveryDate || liveItem?.dueDate}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 현장 담당자 연락처 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">현장 담당자 연락처</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 font-mono truncate block mt-0.5">{liveItem?.siteContactPhone || "미입력"}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 포스트바 컬러 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">포스트바 컬러</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 mt-0.5 block">{liveItem?.postColor || "미정"}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 합판 컬러 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">합판 컬러 (종류)</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-slate-900 truncate block mt-0.5">{liveItem?.boardColor || "미정"}</span>
                    </div>

                    <div
                      onClick={startEditingSpecs}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 border border-slate-100 rounded-xl cursor-pointer transition group"
                      title="클릭하여 도면 담당자 수정"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] font-bold">도면 담당자</span>
                        <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 font-bold transition">✏️</span>
                      </div>
                      <span className="font-extrabold text-indigo-700 truncate block mt-0.5">{liveItem?.drawingAssignee || "미배정"}</span>
                      <span className="mt-2 block text-xs text-slate-600">천정고: {liveItem?.ceilingHeight ? liveItem.ceilingHeight + " mm" : "미입력"} · 시공팀: {liveItem?.installationTeam || "미지정"} · 등록자: {liveItem?.createdBy || "기존 기록 없음"}</span>
                    </div>
                  </div>

              </div>

              </details>
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
                      <span>도면 검토가 최종 완료되어 승인되었습니다. 도면 파일이 본문에 추가되었습니다.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

              </details>
            )}

            <details onToggle={event => setMaterialOpen(event.currentTarget.open)} className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">자재 발주 · {getMaterialOrders(item).length}개 품목</summary>
            {/* 📦 Material Order Management Section */}
            <div className="px-3 pb-3">{materialOpen && <MaterialOrderManager
              orders={getMaterialOrders(item)} autoFocusInput={getMaterialOrders(item).length === 0}
              onChange={orders => updateWorkItem(item.id, {
                materialOrders: orders,
                materialOrderNeeded: orders.map(order => order.name).join(", "),
                materialOrderStatus: !orders.length ? "발주불필요" : orders.every(order => order.isOrdered) ? "발주완료" : "발주필요",
              })}
            />}</div>
            </details>

            {/* 💬 SNS 게시물/피드 스타일 현장 소통 댓글 섹션 */}
            {liveItem?.commentsHasMore && <button type="button" disabled={isSaving} onClick={()=>{void loadMoreComments(item.id,liveItem.comments?.length || 0).catch(()=>alert("댓글을 불러오지 못했습니다."));}} className="w-full rounded-lg border bg-white py-2 text-xs">이전 댓글 20개 더보기</button>}


            <div className="bg-slate-50 rounded-none sm:rounded-2xl border-y sm:border border-slate-200 px-0 py-3 sm:p-5 space-y-4">
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

{/* Comment Submission Form with Photo Attachment */}
              <div className="bg-white px-0 py-3 sm:p-3.5 rounded-none sm:rounded-xl border-y sm:border border-slate-200 shadow-2xs space-y-3">
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

                  <div className="flex flex-col gap-1.5 shrink-0">

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
                    return (
                      <div
                        key={cmt.id}
                        className="bg-white px-0 py-3 sm:p-4 rounded-none sm:rounded-xl border-y sm:border border-slate-200 space-y-2 shadow-2xs hover:shadow-xs transition"
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl bg-white rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[100dvh] sm:h-[92vh]">
            <div className="px-4 py-3 bg-white text-slate-800 border-b border-slate-100 flex items-center justify-between">
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
                  aria-label="PDF 닫기" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-100 relative">
              <PdfPreview url={activePdfUrl} />
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
              <PhotoImage
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
