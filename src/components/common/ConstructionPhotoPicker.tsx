"use client";
import { useEffect, useRef, useState } from "react";
import { parse } from "exifr";
import { groupPhotos, type PhotoMetadata } from "@/lib/photo-groups";
import { compressPhoto, readPhotoFile } from "@/lib/photo-compression";
import { useModalBack } from "@/lib/use-modal-back";
interface Photo extends PhotoMetadata { file: File; preview: string; selected: boolean }
export function ConstructionPhotoPicker({title,onClose,onUpload,initialFiles=[]}:{title:string;onClose:()=>void;onUpload:(photos:string[])=>Promise<void>;initialFiles?:File[]}) {
  const [photos,setPhotos]=useState<Photo[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[progress,setProgress]=useState("");
  const lock=useRef(false),urls=useRef<string[]>([]),initialized=useRef(false);
  const close=()=>{if(lock.current)return false;if(photos.length && !window.confirm("선택한 사진을 취소하고 닫을까요?"))return false;onClose();};
  useModalBack(true,close);
  useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  const read=async(files:File[])=>{
    if(lock.current)return;
    if(files.length+photos.length>20){setError("한 번에 최대 20장까지 선택해주세요.");return;}
    if(files.some(file=>!file.type.startsWith("image/")||file.size>25*1024*1024)){setError("25MB 이하 이미지 파일을 선택해주세요.");return;}
    lock.current=true;setBusy(true);setError("");
    try {
      const added:Photo[]=[];
      for(const file of files){
        let metadata:Record<string,unknown>|undefined;
        try { metadata=await parse(file,{pick:["DateTimeOriginal","GPSLatitude","GPSLongitude","GPSLatitudeRef","GPSLongitudeRef"]}); } catch { /* No readable EXIF: keep as undated. */ }
        const date=metadata?.DateTimeOriginal;
        const latitude=Number(metadata?.latitude),longitude=Number(metadata?.longitude);
        const preview=URL.createObjectURL(file);urls.current.push(preview);
        added.push({id:crypto.randomUUID(),file,preview,selected:true,takenAt:date instanceof Date && Number.isFinite(date.getTime())?date.getTime():undefined,latitude:Number.isFinite(latitude)&&Math.abs(latitude)<=90?latitude:undefined,longitude:Number.isFinite(longitude)&&Math.abs(longitude)<=180?longitude:undefined});
      }
      setPhotos(prev=>[...prev,...added]);
    } finally {lock.current=false;setBusy(false);}
  };
  useEffect(()=>{if(!initialized.current){initialized.current=true;if(initialFiles.length)void read(initialFiles);}},[]); // Initial drop only.
  const upload=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError("");
    const selected=photos.filter(p=>p.selected);let completed=0;
    try {
      // Three compressed photos keep each JSON request below hosting body limits.
      for(let i=0;i<selected.length;i+=3){
        const batch=selected.slice(i,i+3),encoded:string[]=[];
        for(const photo of batch)encoded.push(await compressPhoto(await readPhotoFile(photo.file)));
        setProgress(`${completed}/${selected.length}장 저장 중`);
        await onUpload(encoded);
        completed+=batch.length;const ids=new Set(batch.map(p=>p.id));
        setPhotos(prev=>prev.filter(p=>!ids.has(p.id)));
      }
      setProgress(`${completed}장 등록 완료`);
      if(selected.length===photos.length)onClose();
    } catch(cause){setError(`${completed}장 저장 완료. 남은 사진을 다시 등록해주세요. ${cause instanceof Error?cause.message:"업로드 실패"}`);}
    finally{lock.current=false;setBusy(false);}
  };
  return <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-2" role="dialog" aria-modal="true" aria-label="시공사진 등록">
    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[94dvh] flex flex-col p-4 gap-3">
      <div className="flex justify-between gap-3"><h2 className="font-bold">{title} · 사진 등록</h2><button disabled={busy} onClick={close} aria-label="사진 등록 닫기">닫기</button></div>
      <p className="text-xs text-slate-500">최대 20장 · 촬영 간격 5분 이내로 묶음 · 촬영정보가 없는 사진은 별도 표시</p>
      <label className="rounded-xl bg-blue-600 text-white text-center py-3 font-bold">휴대폰 사진 불러오기<input className="sr-only" type="file" accept="image/*" multiple disabled={busy} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value="";void read(files);}} /></label>
      <div className="overflow-y-auto space-y-4 flex-1 min-h-0">{groupPhotos(photos).map((group,index)=><section key={group[0].id} className="rounded-xl border p-3 space-y-2">
        <label className="flex gap-2 font-bold text-sm"><input type="checkbox" disabled={busy} checked={group.every(p=>p.selected)} onChange={e=>{const ids=new Set(group.map(p=>p.id));setPhotos(prev=>prev.map(p=>ids.has(p.id)?{...p,selected:e.target.checked}:p));}} />{group[0].takenAt===undefined?"촬영시간 정보 없음":`묶음 ${index+1} · ${new Date(group[0].takenAt).toLocaleString("ko-KR")}`} ({group.length}장)</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{group.map(photo=><div key={photo.id} className="min-w-0"><label className="block relative"><img src={photo.preview} alt={photo.file.name} className="w-full aspect-square object-cover rounded-lg" /><input aria-label={`${photo.file.name} 선택`} type="checkbox" checked={photo.selected} disabled={busy} onChange={e=>setPhotos(prev=>prev.map(p=>p.id===photo.id?{...p,selected:e.target.checked}:p))} className="absolute top-2 left-2 h-5 w-5" /></label>{photo.latitude!==undefined&&photo.longitude!==undefined&&<a className="text-xs text-blue-700" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${photo.latitude},${photo.longitude}`}>촬영 위치 지도 ↗</a>}<button disabled={busy} onClick={()=>setPhotos(prev=>prev.filter(p=>p.id!==photo.id))} className="block text-xs text-slate-500">제외</button></div>)}</div>
      </section>)}</div>
      {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}{progress&&<p role="status" className="text-sm">{progress}</p>}
      <button disabled={busy||!photos.some(p=>p.selected)} onClick={()=>void upload()} className="rounded-xl bg-blue-600 disabled:opacity-50 text-white font-bold py-3">{busy?"처리 중…":`선택한 ${photos.filter(p=>p.selected).length}장 등록`}</button>
    </div>
  </div>;
}
