"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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
  uploadConstructionPhoto: (workItemId: string, fileName: string, fileUrl: string, size?: string) => Promise<void>;
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

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      requestApi<WorkItem[]>("/api/posts?type=work"),
      requestApi<AsItem[]>("/api/posts?type=as"),
      requestApi<OnlinePurchaseItem[]>("/api/purchases"),
      requestApi<{ folders: GalleryFolder[]; images: GalleryImage[] }>("/api/gallery"),
      requestApi<MaterialSample[]>("/api/materials"),
    ]);
    const [work, service, purchases, gallery, samples] = results;
    if (work.status === "fulfilled" && work.value.data) setWorkItems(work.value.data);
    if (service.status === "fulfilled" && service.value.data) setAsItems(service.value.data);
    if (purchases.status === "fulfilled" && purchases.value.data) setPurchaseItems(purchases.value.data);
    if (gallery.status === "fulfilled" && gallery.value.data) {
      setFolders(gallery.value.data.folders);
      setImages(gallery.value.data.images);
    }
    if (samples.status === "fulfilled" && samples.value.data) setMaterials(samples.value.data);
    if (results.some((result) => result.status === "rejected")) {
      setError("일부 데이터를 불러오지 못했습니다. 기존 화면을 유지합니다. 다시 불러오기를 눌러 주세요.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void reloadData(); });
    return () => { active = false; };
  }, [reloadData]);

  // 호출자는 실패 시 폼을 유지할 수 있도록 오류를 전달받습니다.
  const save = async <T,>(url: string, method: string, body?: unknown) => {
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

  // Sync to LocalStorage as auxiliary cache
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEYS.WORK, JSON.stringify(workItems));
        localStorage.setItem(STORAGE_KEYS.AS, JSON.stringify(asItems));
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
        localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(images));
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
      } catch (e) {
        console.warn("Failed saving to localStorage", e);
      }
    }
  }, [workItems, asItems, folders, images, materials, isLoading]);

  // 서버 저장이 확인된 데이터만 화면에 반영합니다.
  const addWorkItem = async (item: Omit<WorkItem, "id" | "createdAt">) => {
    const result = await save<WorkItem>("/api/posts", "POST", { ...item, id: crypto.randomUUID(), type: "work" });
    if (result.data) setWorkItems((prev) => [result.data!, ...prev]);
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    await save("/api/posts", "PUT", { ...updates, id, type: "work" });
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
    const target = images.find((img) => img.id === id);
    if (!target) return;
    await save(`/api/gallery?id=${encodeURIComponent(id)}&type=image`, "DELETE");
    setImages((prev) => prev.filter((img) => img.id !== id));
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
    const newComment = {
      id: `cmt-${Date.now()}`,
      workItemId,
      author,
      content,
      createdAt: new Date().toISOString(),
      images: imagesParam && imagesParam.length > 0 ? imagesParam : undefined,
    };

    const targetItem = workItems.find((w) => w.id === workItemId);

    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id === workItemId) {
          const currentComments = item.comments || [];
          return { ...item, comments: [...currentComments, newComment] };
        }
        return item;
      })
    );

    // Auto-sync comment images to Gallery repository for searching & management!
    if (imagesParam && imagesParam.length > 0 && targetItem) {
      const regionTag = targetItem.region || "반포";
      const clientTag = targetItem.clientName;
      const today = new Date().toISOString().split("T")[0];

      imagesParam.forEach((imgUrl, i) => {
        const newGalleryImage: GalleryImage = {
          id: `img-cmt-${Date.now()}-${i}`,
          folderId: "folder-1",
          title: `${targetItem.title} - 댓글 사진`,
          url: imgUrl,
          siteName: `${regionTag} ${targetItem.title} (${clientTag})`,
          tags: [regionTag, clientTag, "댓글사진", "시공사진", today],
          dimensions: "1920 x 1080",
          size: "1.5 MB",
          createdAt: today,
        };

        setImages((prev) => [newGalleryImage, ...prev]);

        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === "folder-1" || f.id === "folder-all") {
              return { ...f, itemCount: f.itemCount + 1 };
            }
            return f;
          })
        );
      });
    }

    fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workItemId, author, content, images: imagesParam }),
    }).catch(() => {});
  };

  const deleteComment = async (workItemId: string, commentId: string) => {
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
    size: string = "2.5 MB"
  ) => {
    const targetItem = workItems.find((w) => w.id === workItemId);
    const today = new Date().toISOString().split("T")[0];

    const newAttachment = {
      id: `att-${Date.now()}`,
      name: fileName,
      url: fileUrl,
      fileType: "image" as const,
      size,
      uploadedAt: today,
    };

    // 1. Add attachment to work item
    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id === workItemId) {
          return {
            ...item,
            attachments: [newAttachment, ...item.attachments],
          };
        }
        return item;
      })
    );

    // 2. Automatically generate smart tags & sync to Gallery!
    if (targetItem) {
      const regionTag = targetItem.region || "반포";
      const clientTag = targetItem.clientName;
      const categoryTag = targetItem.category || "주방가구";
      const tags = [regionTag, clientTag, categoryTag, "시공완료 사진", "도면연동", today];

      const newGalleryImage: GalleryImage = {
        id: `img-${Date.now()}`,
        folderId: "folder-1", // 2026 시공 현장 폴더
        title: `${targetItem.title} - 시공 완료`,
        url: fileUrl,
        siteName: `${regionTag} ${targetItem.title} (${clientTag})`,
        tags,
        dimensions: "2400 x 1800",
        size,
        createdAt: today,
      };

      setImages((prev) => [newGalleryImage, ...prev]);

      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === "folder-1" || f.id === "folder-all") {
            return { ...f, itemCount: f.itemCount + 1 };
          }
          return f;
        })
      );
    }
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

  const metrics = getDashboardMetrics(workItems, asItems);

  return (
    <DataContext.Provider
      value={{
        workItems,
        asItems,
        folders,
        images,
        materials,
        purchaseItems,
        metrics,
        isLoading,
        error,
        isSaving: pendingWrites > 0,
        reloadData,
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
