"use client";
import { useState } from "react";
import { X, Camera } from "lucide-react";
import type { WorkItem } from "@/types";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { WorkDetailHeader } from "@/components/common/WorkDetailHeader";
import { PhotoImage } from "@/components/common/PhotoImage";
import { ConstructionPhotoPicker } from "@/components/common/ConstructionPhotoPicker";
import { useModalBack } from "@/lib/use-modal-back";
import { bodyText } from "@/lib/body-content";
import { PdfPreview } from "@/components/common/PdfPreview";

export function InstallerTaskDetail({item:initial,onClose,startPhotoUpload}:{item:WorkItem;onClose:()=>void;startPhotoUpload?:boolean}) {
  const {user}=useAuth();
  const {workItems,addComment,isSaving,loadMoreComments}=useData();
  const item=workItems.find(value=>value.id===initial.id)||initial;
  const [picker,setPicker]=useState(!!startPhotoUpload),[comment,setComment]=useState(""),[error,setError]=useState(""),[photo,setPhoto]=useState("");
  const [pdf,setPdf]=useState("");
  useModalBack(!!photo,()=>setPhoto(""));
  useModalBack(!!pdf,()=>setPdf(""));
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 sm:p-5"><section role="dialog" aria-modal="true" aria-label="일정 업무 상세" className="flex h-full w-full max-w-4xl flex-col bg-slate-50 sm:max-h-[92vh] sm:rounded-2xl"><header className="flex items-center justify-between border-b bg-white p-4"><h1 className="font-bold">일정 상세</h1><button onClick={onClose} aria-label="상세 닫기"><X className="h-5 w-5" /></button></header><div className="space-y-4 overflow-y-auto p-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><WorkDetailHeader item={item} readOnly onEdit={()=>{}} /><p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{bodyText(item.description||item.notes||"")}</p><div className="mt-3 space-y-2">{(item.attachments||[]).map(file=><button key={file.id} onClick={()=>file.fileType==="image"?setPhoto(file.url):file.fileType==="pdf"||/\.pdf$/i.test(file.name)?setPdf(file.url):window.open(file.url,"_blank","noopener,noreferrer")} className="block w-full rounded-lg border p-3 text-left text-sm">{file.name}</button>)}</div></div>
    <section className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">시공사진</h2><div className="grid grid-cols-3 gap-2">{(item.comments||[]).flatMap(c=>(c.images||[]).filter(Boolean).map((url,index)=><button key={c.id+index} className="aspect-square overflow-hidden rounded-lg" onClick={()=>setPhoto(url)} aria-label="시공사진 확대"><PhotoImage src={url} alt="시공사진" className="h-full w-full object-cover" /></button>))}</div><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white" disabled={isSaving} onClick={()=>setPicker(true)}><Camera className="h-4 w-4" />시공사진 업로드</button></section>
    <section className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="font-bold">댓글</h2>{item.commentsHasMore&&<button onClick={()=>void loadMoreComments(item.id,item.comments?.length||0).catch(()=>setError("댓글 조회 실패"))}>이전 댓글 더보기</button>}{(item.comments||[]).map(c=><article key={c.id} className="border-b py-2 text-sm"><strong>{c.author}</strong><p className="whitespace-pre-wrap">{c.content}</p></article>)}<form onSubmit={async event=>{event.preventDefault();if(!comment.trim()||isSaving)return;setError("");try{await addComment(item.id,user!.name,comment.trim());setComment("");}catch(cause){setError(cause instanceof Error?cause.message:"댓글 저장 실패");}}}><textarea aria-label="댓글 내용" value={comment} onChange={event=>setComment(event.target.value)} className="w-full rounded-lg border p-3 text-sm" /><button disabled={isSaving||!comment.trim()} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">댓글 등록</button></form>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</section>
  </div></section>{picker&&<ConstructionPhotoPicker title={item.clientName} onClose={()=>setPicker(false)} onUploaded={()=>setPicker(false)} onUpload={photos=>addComment(item.id,user!.name,"[시공 사진]",photos)} />}{photo&&<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-label="시공사진 확대"><button aria-label="사진 닫기" onClick={()=>setPhoto("")} className="absolute right-4 top-4 text-white"><X /></button><PhotoImage src={photo} alt="확대한 시공사진" className="max-h-[90vh] max-w-full object-contain" /></div>}{pdf&&<div className="fixed inset-0 z-[150] flex flex-col bg-white" role="dialog" aria-label="도면 보기"><header className="flex justify-end border-b p-3"><button aria-label="도면 닫기" onClick={()=>setPdf("")}><X /></button></header><div className="min-h-0 flex-1 overflow-auto"><PdfPreview url={pdf} /></div></div>}</div>;
}
