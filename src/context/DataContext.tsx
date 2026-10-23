"use client";
import { useAuth } from "@/context/AuthContext";
import { isInstaller } from "@/lib/access";

import { STATUS_PROGRESS } from "@/lib/work-form";
import { getDrawingAttachment } from "@/lib/drawing-attachments";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
  DashboardMetrics,
  OnlinePurchaseItem,
} from "@/types";
import {
  initialWorkItems,
  initialAsItems,
  initialFolders,
  initialImages,
  initialMaterials,
  getDashboardMetrics,
} from "@/lib/dataStore";

import { compressPhoto } from "@/lib/photo-compression";
import { commentGalleryImages, orderGalleryImage } from "@/lib/construction-gallery";
import type { WorkItemComment } from "@/types";
import { requestApi } from "@/lib/api-client";

interface DataContextType {
  workItems: WorkItem[];
  asItems: AsItem[];
  folders: GalleryFolder[];
  images: GalleryImage[];
  materials: MaterialSample[];
  purchaseItems: OnlinePurchaseItem[];
  metrics: DashboardMetrics;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  reloadData: () => Promise<void>;
  loadWorkList: (params: string, append?: boolean) => Promise<boolean>;
  loadWorkDetail: (id: string) => Promise<WorkItem>;
  loadGallery: (params?: string, append?: boolean) => Promise<boolean>;
  loadMoreComments: (id:string,offset:number) => Promise<void>;
  workHasMore: boolean;
  dismissError: () => void;
  addWorkItem: (item: Omit<WorkItem, "id" | "createdAt">) => Promise<void>;
  updateWorkItem: (id: string, updates: Partial<WorkItem>) => Promise<void>;
  deleteWorkItem: (id: string) => Promise<void>;
  advanceWorkStatus: (id: string) => Promise<void>;
  addAsItem: (item: Omit<AsItem, "id" | "createdAt">) => Promise<void>;
  updateAsItem: (id: string, updates: Partial<AsItem>) => Promise<void>;
  deleteAsItem: (id: string) => Promise<void>;
  advanceAsStatus: (id: string) => Promise<void>;
  addFolder: (name: string, description?: string) => Promise<void>;
  addImage: (img: Omit<GalleryImage, "id" | "createdAt">) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  addMaterial: (mat: Omit<MaterialSample, "id">) => Promise<void>;
  addPurchaseItem: (item: Omit<OnlinePurchaseItem, "id" | "createdAt">) => Promise<void>;
  updatePurchaseItem: (id: string, updates: Partial<OnlinePurchaseItem>) => Promise<void>;
  deletePurchaseItem: (id: string) => Promise<void>;
  addComment: (workItemId: string, author: string, content: string, images?: string[]) => Promise<void>;
  deleteComment: (workItemId: string, commentId: string) => Promise<void>;
  deleteCommentImage: (workItemId: string, commentId: string, imageUrl: string) => Promise<void>;
  deletePhotoFromWorkItem: (workItemId: string, photoUrlOrId: string) => Promise<void>;
  uploadConstructionPhoto: (workItemId: string, fileName: string, fileUrl: string, size?: string, author?: string) => Promise<void>;
  quickModalType: "work" | "as" | null;
  setQuickModalType: (type: "work" | "as" | null) => void;
  clearAllData: () => void;
  resetToSampleData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  WORK: "baron_work_items_v3",
  AS: "baron_as_items_v3",
  FOLDERS: "baron_folders_v3",
  IMAGES: "baron_images_v3",
  MATERIALS: "baron_materials_v3",
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { user: sessionUser } = useAuth();
  const workRequest = useRef(0);
  const galleryRequest = useRef(0);
  const lastWorkParams=useRef("limit=30");
  const lastGalleryParams=useRef("");
  const detailCache = useRef(new Map<string,{item:WorkItem,time:number}>());
  const detailPending = useRef(new Map<string,Promise<WorkItem>>());
  const listCache=useRef(new Map<string,{data:WorkItem[];hasMore:boolean;time:number}>());
  const listPending=useRef(new Map<string,Promise<{data?:WorkItem[];hasMore?:boolean}>>());
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [asItems, setAsItems] = useState<AsItem[]>([]);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [materials, setMaterials] = useState<MaterialSample[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<OnlinePurchaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickModalType, setQuickModalType] = useState<"work" | "as" | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [metricCounts,setMetricCounts]=useState<Pick<DashboardMetrics,"totalProjects"|"inProgressTasks"|"urgentAsCount"|"completionRate"|"todoCount"|"readyCount"> | null>(null);
  useEffect(()=>{
    if(pendingWrites || pathname === "/login" || isInstaller(sessionUser))return;
    let active=true;
    const timer=setTimeout(()=>{void requestApi<NonNullable<typeof metricCounts>>("/api/dashboard").then(result=>{if(active && result.data)setMetricCounts(result.data);}).catch(()=>{});},100);
    return()=>{active=false;clearTimeout(timer);};
  },[pendingWrites,pathname,sessionUser]);
  const [workHasMore,setWorkHasMore]=useState(false);
  const loadWorkList = useCallback(async (params: string, append = false) => {
    const version = ++workRequest.current;
    if(!append) lastWorkParams.current=params;
    setIsLoading(true);
    try {
      const cached=listCache.current.get(params);
      let result:{data?:WorkItem[];hasMore?:boolean};
      if(cached && Date.now()-cached.time<30000) result=cached;
      else {
        let request=listPending.current.get(params);
        if(!request){request=requestApi<WorkItem[]>(`/api/posts?type=work&summary=1&${params}`).finally(()=>listPending.current.delete(params));listPending.current.set(params,request);}
        result=await request;
        if(listCache.current.size>=12)listCache.current.delete(listCache.current.keys().next().value!);
        listCache.current.set(params,{data:result.data || [],hasMore:!!result.hasMore,time:Date.now()});
      }
      if (version !== workRequest.current) return false;
      setWorkItems(prev => append ? [...prev,...(result.data || []).filter(item=>!prev.some(old=>old.id===item.id))] : result.data || []);
      setWorkHasMore(!!result.hasMore);
      return !!result.hasMore;
    } catch(cause) { if(version === workRequest.current) setError(cause instanceof Error ? cause.message : "업무 조회 실패"); throw cause; }
    finally { if(version === workRequest.current) setIsLoading(false); }
  }, []);
  const loadWorkDetail = useCallback((id: string): Promise<WorkItem> => {
    const cached = detailCache.current.get(id);
    if (cached && Date.now()-cached.time < 30000) { setWorkItems(prev=>prev.map(item=>item.id===id ? cached.item : item)); return Promise.resolve(cached.item); }
    const pending = detailPending.current.get(id);
    if (pending) return pending;
    const request = requestApi<WorkItem[]>(`/api/posts?type=work&id=${encodeURIComponent(id)}`).then(result=>{
      const item = result.data?.[0]; if (!item) throw new Error("업무를 찾지 못했습니다.");
      const loaded = {...item,detailsLoaded:true};
      detailCache.current.set(id,{item:loaded,time:Date.now()});
      setWorkItems(prev=>prev.map(value=>value.id===id ? loaded : value));
      return loaded;
    }).finally(()=>detailPending.current.delete(id));
    detailPending.current.set(id,request);
    return request;
  }, []);
  const loadGallery = useCallback(async (params = "", append = false) => {
    const version=++galleryRequest.current;
    if(!append)lastGalleryParams.current=params;
    const result = await requestApi<{folders:GalleryFolder[];images:GalleryImage[]}>(`/api/gallery?limit=30&${params}`);
    if(version !== galleryRequest.current) return false;
    if(result.data) { setFolders(result.data.folders); setImages(prev=>append ? [...prev,...result.data!.images.filter(image=>!prev.some(old=>old.id===image.id))] : result.data!.images); }
    return !!result.hasMore;
  }, []);
  const loadMoreComments=useCallback(async(id:string,offset:number)=>{
    const result=await requestApi<WorkItemComment[]>(`/api/comments?workItemId=${encodeURIComponent(id)}&offset=${offset}`);
    detailCache.current.delete(id);
    setWorkItems(prev=>prev.map(item=>item.id===id ? {...item,comments:[...(result.data || []).filter(comment=>!item.comments?.some(existing=>existing.id===comment.id)),...(item.comments || [])],commentsHasMore:!!result.hasMore} : item));
  },[]);

  const reloadData = useCallback(async () => {
    if (pathname === "/calendar" || pathname === "/work") {listCache.current.clear();await loadWorkList(lastWorkParams.current);return;}
    if(pathname === "/gallery") {await loadGallery(lastGalleryParams.current);setIsLoading(false);return;}
    if(pathname === "/login") {setIsLoading(false);return;}
    setIsLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      pathname === "/" ? requestApi<WorkItem[]>("/api/posts?type=work&summary=1&mode=active&limit=30") : Promise.resolve({data:undefined}),
      pathname === "/as" || pathname === "/" ? requestApi<AsItem[]>("/api/posts?type=as") : Promise.resolve({data:undefined}),
      pathname === "/purchases" ? requestApi<OnlinePurchaseItem[]>("/api/purchases") : Promise.resolve({data:undefined}),
      Promise.resolve({data:undefined}),
      pathname === "/materials" ? requestApi<MaterialSample[]>("/api/materials") : Promise.resolve({data:undefined}),
    ]);
    const [work, service, purchases, gallery, samples] = results;
    if (work.status === "fulfilled" && work.value.data) setWorkItems(work.value.data);
    if(work.status === "fulfilled" && "hasMore" in work.value) setWorkHasMore(!!work.value.hasMore);
    if (service.status === "fulfilled" && service.value.data) setAsItems(service.value.data);
    if (purchases.status === "fulfilled" && purchases.value.data) setPurchaseItems(purchases.value.data);
    void gallery;
    if (samples.status === "fulfilled" && samples.value.data) setMaterials(samples.value.data);
    if (results.some((result) => result.status === "rejected")) {
      setError("일부 데이터를 불러오지 못했습니다. 기존 화면을 유지합니다. 다시 불러오기를 눌러 주세요.");
    }
    setIsLoading(false);
  }, [pathname,loadWorkList,loadGallery]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active && pathname !== "/work" && pathname !== "/calendar" && pathname !== "/gallery") void reloadData(); else if(active && pathname === "/gallery") setIsLoading(false); });
    return () => { active = false; };
  }, [reloadData,pathname]);

  // 호출자는 실패 시 폼을 유지할 수 있도록 오류를 전달받습니다.
  const save = async <T,>(url: string, method: string, body?: unknown) => {
    detailCache.current.clear();
    listCache.current.clear();
    setPendingWrites((count) => count + 1);
    setError(null);
    try {
      return await requestApi<T>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "저장에 실패했습니다.";
      setError(`변경 사항을 저장하지 못했습니다. ${message}`);
      throw cause;
    } finally {
      setPendingWrites((count) => count - 1);
    }
  };

  // 서버 저장이 확인된 데이터만 화면에 반영합니다.
  const addWorkItem = async (item: Omit<WorkItem, "id" | "createdAt">) => {
    const result = await save<WorkItem>("/api/posts", "POST", { ...item, id: crypto.randomUUID(), type: "work" });
    if (result.data) setWorkItems((prev) => [result.data!, ...prev]);
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    if (updates.attachments) {
      updates = { ...updates, drawingAttachment: getDrawingAttachment({attachments:updates.attachments,detailsLoaded:true}) };
    }
    if (updates.status) updates = { ...updates, progress: STATUS_PROGRESS[updates.status] };
    await save("/api/posts", "PUT", { ...updates, id, type: "work" });
    detailCache.current.delete(id);
    setWorkItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteWorkItem = async (id: string) => {
    await save(`/api/posts?id=${encodeURIComponent(id)}&type=work`, "DELETE");
    setWorkItems((prev) => prev.filter((item) => item.id !== id));
  };

  const advanceWorkStatus = async (id: string) => {
    const item = workItems.find((w) => w.id === id);
    if (!item) return;
    let nextStatus: WorkItem["status"] = "오피스";
    let nextProgress = item.progress;

    if (item.status === "대기") {
      nextStatus = "오피스";
      nextProgress = Math.max(item.progress, 30);
    } else if (item.status === "오피스") {
      nextStatus = "공장";
      nextProgress = Math.max(item.progress, 70);
    } else if (item.status === "공장") {
      nextStatus = "준비완료";
      nextProgress = 90;
    } else if (item.status === "준비완료") {
      nextStatus = "시공완료";
      nextProgress = 100;
    } else {
      return; // 완료 업무는 자동으로 처음 단계로 돌아가지 않습니다.
    }

    await updateWorkItem(id, { status: nextStatus, progress: nextProgress });
  };

  const addAsItem = async (item: Omit<AsItem, "id" | "createdAt">) => {
    const result = await save<AsItem>("/api/posts", "POST", { ...item, id: crypto.randomUUID(), type: "as" });
    if (result.data) setAsItems((prev) => [result.data!, ...prev]);
  };

  const updateAsItem = async (id: string, updates: Partial<AsItem>) => {
    await save("/api/posts", "PUT", { ...updates, id, type: "as" });
    setAsItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteAsItem = async (id: string) => {
    await save(`/api/posts?id=${encodeURIComponent(id)}&type=as`, "DELETE");
    setAsItems((prev) => prev.filter((item) => item.id !== id));
  };

  const advanceAsStatus = async (id: string) => {
    const item = asItems.find((a) => a.id === id);
    if (!item) return;
    let nextStatus: AsItem["resultStatus"] = "처리중";
    if (item.resultStatus === "접수") nextStatus = "처리중";
    else if (item.resultStatus === "처리중") nextStatus = "완료";
    else return;

    await updateAsItem(id, { resultStatus: nextStatus });
  };

  const addFolder = async (name: string, description?: string) => {
    const result = await save<GalleryFolder>("/api/gallery", "POST", { action: "create_folder", name, description });
    if (result.data) setFolders((prev) => [...prev, result.data!]);
  };

  const addImage = async (img: Omit<GalleryImage, "id" | "createdAt">) => {
    const result = await save<GalleryImage>("/api/gallery", "POST", { action: "upload_image", ...img });
    if (!result.data) return;
    setImages((prev) => [result.data!, ...prev]);
    setFolders((prev) => prev.map((folder) => folder.id === img.folderId || folder.id === "folder-all"
      ? { ...folder, itemCount: folder.itemCount + 1 } : folder));
  };

  const deleteImage = async (id: string) => {
    const target = images.find((img) => img.id === id) || galleryImages.find((img) => img.id === id);
    if (!target) return;
    await save(`/api/gallery?id=${encodeURIComponent(id)}&type=image`, "DELETE");
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (id.startsWith("attachment-")) setWorkItems(prev => prev.map(item => ({...item, attachments: (item.attachments || []).filter(attachment => `attachment-${attachment.id}` !== id)})));
    setFolders((prev) => prev.map((folder) => folder.id === target.folderId || folder.id === "folder-all"
      ? { ...folder, itemCount: Math.max(0, folder.itemCount - 1) } : folder));
  };

  const addMaterial = async (mat: Omit<MaterialSample, "id">) => {
    const result = await save<MaterialSample>("/api/materials", "POST", mat);
    if (result.data) setMaterials((prev) => [result.data!, ...prev]);
  };

  const addPurchaseItem = async (item: Omit<OnlinePurchaseItem, "id" | "createdAt">) => {
    const newItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await save("/api/purchases", "POST", newItem);
    setPurchaseItems((prev) => [newItem, ...prev]);
  };

  const updatePurchaseItem = async (id: string, updates: Partial<OnlinePurchaseItem>) => {
    await save("/api/purchases", "PUT", { ...updates, id });
    setPurchaseItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const deletePurchaseItem = async (id: string) => {
    await save(`/api/purchases?id=${encodeURIComponent(id)}`, "DELETE");
    setPurchaseItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add Comment to Work Item (with optional photos & auto-gallery sync)
  const addComment = async (
    workItemId: string,
    author: string,
    content: string,
    imagesParam?: string[]
  ) => {
    const compressed: string[] = [];
    setPendingWrites(count=>count+1);
    setError(null);
    try {
    if ((imagesParam?.length ?? 0)>20) throw new Error("한 번에 사진 20장까지 첨부해주세요.");
    for (const image of imagesParam ?? []) compressed.push(await compressPhoto(image));
    const result = await save<{ comment: WorkItemComment }>("/api/comments", "POST", { workItemId, author, content, images: compressed });
    if (!result.data?.comment) throw new Error("댓글 저장 결과를 확인하지 못했습니다.");
    const newComment = result.data.comment;
    const targetItem = workItems.find(w => w.id === workItemId);
    setWorkItems(prev=>prev.map(item=>item.id === workItemId ? { ...item, comments:[...(item.comments ?? []),newComment] } : item));
    if (targetItem && compressed.length) {
      const galleryPhotos = commentGalleryImages(targetItem,{...newComment,images:compressed});
      setImages(prev=>[...galleryPhotos,...prev]);
      setFolders(prev=>prev.some(f=>f.id === "folder-construction")
        ? prev.map(f=>f.id === "folder-construction" ? {...f,itemCount:f.itemCount+galleryPhotos.length} : f)
        : [...prev,{id:"folder-construction",name:"시공 사진",description:"",itemCount:galleryPhotos.length,createdAt:newComment.createdAt}]);
    }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo save failed");
      throw cause;
    } finally { setPendingWrites(count=>count-1); }
  };

  const deleteComment = async (workItemId: string, commentId: string) => {
    await save(`/api/comments?id=${encodeURIComponent(commentId)}&workItemId=${encodeURIComponent(workItemId)}`,"DELETE");
    setImages(prev=>prev.filter(image=>!image.id.startsWith(`comment-${commentId}-`)));
    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id === workItemId) {
          return {
            ...item,
            comments: (item.comments || []).filter((c) => c.id !== commentId),
          };
        }
        return item;
      })
    );
  };

  const deleteCommentImage = async (workItemId: string, commentId: string, imageUrl: string) => {
    if (imageUrl.startsWith("/api/gallery?source=comment")) {
      const index=new URL(imageUrl,"http://localhost").searchParams.get("index");
      await save(`/api/gallery?type=image&id=${encodeURIComponent(`comment-${commentId}-${index}`)}`,"DELETE");
      setImages(prev=>prev.filter(image=>image.url !== imageUrl));
    }
    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id === workItemId) {
          return {
            ...item,
            comments: (item.comments || []).map((c) => {
              if (c.id === commentId) {
                return {
                  ...c,
                  images: (c.images || []).filter((img) => img !== imageUrl),
                };
              }
              return c;
            }),
          };
        }
        return item;
      })
    );
  };

  const deletePhotoFromWorkItem = async (workItemId: string, photoUrlOrId: string) => {
    if (photoUrlOrId.startsWith("/api/gallery?source=comment")) {
      const query=new URL(photoUrlOrId,"http://localhost").searchParams;
      await deleteCommentImage(workItemId,query.get("id")!,photoUrlOrId);
      return;
    }
    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id === workItemId) {
          const updatedAtts = (item.attachments || []).filter(
            (a) => a.id !== photoUrlOrId && a.url !== photoUrlOrId
          );
          const updatedCmts = (item.comments || []).map((c) => ({
            ...c,
            images: (c.images || []).filter((img) => img !== photoUrlOrId),
          }));
          return {
            ...item,
            attachments: updatedAtts,
            comments: updatedCmts,
          };
        }
        return item;
      })
    );
  };

  // Upload Construction Photo & Auto Sync to Gallery with Smart Tags
  const uploadConstructionPhoto = async (
    workItemId: string,
    fileName: string,
    fileUrl: string,
    _size: string = "2.5 MB",
    author: string = "\uC2DC\uACF5\uAE30\uC0AC"
  ) => {
    await addComment(workItemId, author, `[시공 사진] ${fileName}`, [fileUrl]);
  };

  const clearAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.WORK);
      localStorage.removeItem(STORAGE_KEYS.AS);
      localStorage.removeItem(STORAGE_KEYS.FOLDERS);
      localStorage.removeItem(STORAGE_KEYS.IMAGES);
      localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    } catch (e) {}
    setWorkItems([]);
    setAsItems([]);
    setFolders([]);
    setImages([]);
    setMaterials([]);
  };

  const resetToSampleData = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.WORK);
      localStorage.removeItem(STORAGE_KEYS.AS);
      localStorage.removeItem(STORAGE_KEYS.FOLDERS);
      localStorage.removeItem(STORAGE_KEYS.IMAGES);
      localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    } catch (e) {}
    setWorkItems(initialWorkItems);
    setAsItems(initialAsItems);
    setFolders(initialFolders);
    setImages(initialImages);
    setMaterials(initialMaterials);
  };

  const observeAction = <Args extends unknown[]>(action: (...args: Args) => Promise<void>) =>
    (...args: Args) => {
      const pending = action(...args);
      void pending.catch(() => {}); // The global banner reports the failure.
      return pending;
    };

  const metrics = {...getDashboardMetrics(workItems, asItems),...(metricCounts || {})};
  const galleryImages = [
    ...images.filter(image => !image.id.startsWith("attachment-")),
    ...workItems.flatMap(item => (item.attachments || []).filter(attachment => attachment.fileType === "image").map(attachment => orderGalleryImage(item, attachment))),
  ];

  return (
    <DataContext.Provider
      value={{
        workItems,
        asItems,
        folders,
        images: pathname === "/gallery" ? images : galleryImages,
        materials,
        purchaseItems,
        metrics,
        isLoading,
        error,
        isSaving: pendingWrites > 0,
        reloadData,
        loadWorkList,
        loadWorkDetail,
        loadGallery,
        loadMoreComments,
        workHasMore,
        dismissError: () => setError(null),
        addWorkItem: observeAction(addWorkItem),
        updateWorkItem: observeAction(updateWorkItem),
        deleteWorkItem: observeAction(deleteWorkItem),
        advanceWorkStatus: observeAction(advanceWorkStatus),
        addAsItem: observeAction(addAsItem),
        updateAsItem: observeAction(updateAsItem),
        deleteAsItem: observeAction(deleteAsItem),
        advanceAsStatus: observeAction(advanceAsStatus),
        addFolder: observeAction(addFolder),
        addImage: observeAction(addImage),
        deleteImage: observeAction(deleteImage),
        addMaterial: observeAction(addMaterial),
        addPurchaseItem: observeAction(addPurchaseItem),
        updatePurchaseItem: observeAction(updatePurchaseItem),
        deletePurchaseItem: observeAction(deletePurchaseItem),
        addComment,
        deleteComment,
        deleteCommentImage,
        deletePhotoFromWorkItem,
        uploadConstructionPhoto,
        quickModalType,
        setQuickModalType,
        clearAllData,
        resetToSampleData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
