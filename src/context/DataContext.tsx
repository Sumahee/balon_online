"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  initialPurchaseItems,
  getDashboardMetrics,
} from "@/lib/dataStore";

interface DataContextType {
  workItems: WorkItem[];
  asItems: AsItem[];
  folders: GalleryFolder[];
  images: GalleryImage[];
  materials: MaterialSample[];
  purchaseItems: OnlinePurchaseItem[];
  metrics: DashboardMetrics;
  isLoading: boolean;
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

  // Initialize: Purge old dummy data from localStorage & Fetch live from Turso DB
  useEffect(() => {
    // 1. Force purge any legacy dummy data from localStorage
    try {
      localStorage.removeItem("baron_work_items_v1");
      localStorage.removeItem("baron_as_items_v1");
      localStorage.removeItem("baron_folders_v1");
      localStorage.removeItem("baron_images_v1");
      localStorage.removeItem("baron_materials_v1");
      localStorage.removeItem("baron_work_items_v2");
      localStorage.removeItem("baron_as_items_v2");
    } catch (e) {}

    // 2. Fetch live data directly from Turso DB APIs
    const loadLiveDbData = async () => {
      setIsLoading(true);
      try {
        const [workRes, asRes, purchaseRes] = await Promise.all([
          fetch("/api/posts?type=work")
            .then((r) => r.json())
            .catch(() => ({ success: false, data: [] })),
          fetch("/api/posts?type=as")
            .then((r) => r.json())
            .catch(() => ({ success: false, data: [] })),
          fetch("/api/purchases")
            .then((r) => r.json())
            .catch(() => ({ success: false, data: [] })),
        ]);

        if (workRes.success && Array.isArray(workRes.data)) {
          setWorkItems(workRes.data);
        } else {
          setWorkItems([]);
        }

        if (asRes.success && Array.isArray(asRes.data)) {
          setAsItems(asRes.data);
        } else {
          setAsItems([]);
        }

        if (purchaseRes.success && Array.isArray(purchaseRes.data) && purchaseRes.data.length > 0) {
          setPurchaseItems(purchaseRes.data);
        } else {
          setPurchaseItems(initialPurchaseItems);
        }
      } catch (err) {
        console.error("Failed to load initial data from DB API:", err);
        setPurchaseItems(initialPurchaseItems);
      } finally {
        setIsLoading(false);
      }
    };

    loadLiveDbData();
  }, []);

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

  // Actions: Live write to Turso DB + State update
  const addWorkItem = async (item: Omit<WorkItem, "id" | "createdAt">) => {
    const newItemId = `work-${Date.now()}`;
    const newItem: WorkItem = {
      ...item,
      id: newItemId,
      createdAt: new Date().toISOString(),
    };
    setWorkItems((prev) => [newItem, ...prev]);

    fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newItemId, ...item, type: "work" }),
    }).catch((e) => console.log("Server sync notice:", e));
  };

  const updateWorkItem = async (id: string, updates: Partial<WorkItem>) => {
    setWorkItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "work", ...updates }),
    }).catch((e) => console.log("Server sync notice:", e));
  };

  const deleteWorkItem = async (id: string) => {
    setWorkItems((prev) => prev.filter((item) => item.id !== id));
    fetch(`/api/posts?id=${id}&type=work`, { method: "DELETE" }).catch(() => {});
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
      nextStatus = "대기";
      nextProgress = 0;
    }

    updateWorkItem(id, { status: nextStatus, progress: nextProgress });
  };

  const addAsItem = async (item: Omit<AsItem, "id" | "createdAt">) => {
    const newItemId = `as-${Date.now()}`;
    const newItem: AsItem = {
      ...item,
      id: newItemId,
      createdAt: new Date().toISOString(),
    };
    setAsItems((prev) => [newItem, ...prev]);

    fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newItemId, ...item, type: "as" }),
    }).catch(() => {});
  };

  const updateAsItem = async (id: string, updates: Partial<AsItem>) => {
    setAsItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "as", ...updates }),
    }).catch(() => {});
  };

  const deleteAsItem = async (id: string) => {
    setAsItems((prev) => prev.filter((item) => item.id !== id));
    fetch(`/api/posts?id=${id}&type=as`, { method: "DELETE" }).catch(() => {});
  };

  const advanceAsStatus = async (id: string) => {
    const item = asItems.find((a) => a.id === id);
    if (!item) return;
    let nextStatus: AsItem["resultStatus"] = "처리중";
    if (item.resultStatus === "접수") nextStatus = "처리중";
    else if (item.resultStatus === "처리중") nextStatus = "완료";
    else nextStatus = "접수";

    updateAsItem(id, { resultStatus: nextStatus });
  };

  const addFolder = async (name: string, description?: string) => {
    const newFolder: GalleryFolder = {
      id: `folder-${Date.now()}`,
      name,
      description,
      itemCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setFolders((prev) => [...prev, newFolder]);

    fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_folder", name, description }),
    }).catch(() => {});
  };

  const addImage = async (img: Omit<GalleryImage, "id" | "createdAt">) => {
    const newImage: GalleryImage = {
      ...img,
      id: `img-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setImages((prev) => [newImage, ...prev]);

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === img.folderId || f.id === "folder-all") {
          return { ...f, itemCount: f.itemCount + 1 };
        }
        return f;
      })
    );

    fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upload_image", ...img }),
    }).catch(() => {});
  };

  const deleteImage = async (id: string) => {
    const target = images.find((img) => img.id === id);
    if (!target) return;
    setImages((prev) => prev.filter((img) => img.id !== id));

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === target.folderId || f.id === "folder-all") {
          return { ...f, itemCount: Math.max(0, f.itemCount - 1) };
        }
        return f;
      })
    );

    fetch(`/api/gallery?id=${id}&type=image`, { method: "DELETE" }).catch(() => {});
  };

  const addMaterial = async (mat: Omit<MaterialSample, "id">) => {
    const newMat: MaterialSample = {
      ...mat,
      id: `mat-${Date.now()}`,
    };
    setMaterials((prev) => [newMat, ...prev]);

    fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mat),
    }).catch(() => {});
  };

  const addPurchaseItem = async (item: Omit<OnlinePurchaseItem, "id" | "createdAt">) => {
    const newItemId = `purch-${Date.now()}`;
    const newItem: OnlinePurchaseItem = {
      ...item,
      id: newItemId,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPurchaseItems((prev) => [newItem, ...prev]);

    fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    }).catch((e) => console.log("Purchase API sync error:", e));
  };

  const updatePurchaseItem = async (id: string, updates: Partial<OnlinePurchaseItem>) => {
    setPurchaseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    fetch("/api/purchases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    }).catch((e) => console.log("Purchase API sync error:", e));
  };

  const deletePurchaseItem = async (id: string) => {
    setPurchaseItems((prev) => prev.filter((item) => item.id !== id));
    fetch(`/api/purchases?id=${id}`, { method: "DELETE" }).catch(() => {});
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
        addWorkItem,
        updateWorkItem,
        deleteWorkItem,
        advanceWorkStatus,
        addAsItem,
        updateAsItem,
        deleteAsItem,
        advanceAsStatus,
        addFolder,
        addImage,
        deleteImage,
        addMaterial,
        addPurchaseItem,
        updatePurchaseItem,
        deletePurchaseItem,
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
