"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useData } from "@/context/DataContext";
import type { WorkItem } from "@/types";
import { useModalBack } from "@/lib/use-modal-back";

export function WorkDetailGate({item,onClose,children}:{item:WorkItem|null;onClose:()=>void;children:(item:WorkItem)=>ReactNode}) {
  const {loadWorkDetail} = useData();
  const [loaded,setLoaded]=useState<WorkItem|null>(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const needsDetail=!!loadWorkDetail && item?.detailsLoaded === false;
  useModalBack(!!item,onClose);
  useEffect(()=>{
    if(!item || !needsDetail) return;
    let active=true;
    void loadWorkDetail(item.id).then(value=>{if(active)setLoaded(value);}).catch(cause=>{if(active)setError(cause instanceof Error ? cause.message : "업무를 불러오지 못했습니다.");});
    return()=>{active=false;};
  },[item?.id,loadWorkDetail,needsDetail,retry]);
  if(!item) return null;
  if(!needsDetail) return children(item);
  if(loaded?.id === item.id) return children(loaded);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95"><div className="p-6 text-center"><p role="status">{error || "업무 내용 불러오는 중…"}</p>{error && <button className="p-3 text-blue-700" onClick={()=>{setError("");setRetry(value=>value+1);}}>다시 시도</button>}<button className="p-3" onClick={onClose}>닫기</button></div></div>;
}
