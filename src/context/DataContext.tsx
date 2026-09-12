"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
  DashboardMetrics,
} from "@/types";
import {
  initialWorkItems,
  initialAsItems,
  initialFolders,
  initialImages,
  initialMaterials,
  getDashboardMetrics,
} from "@/lib/dataStore";

interface DataContextType {
  workItems: WorkItem[];
  asItems: AsItem[];
  folders: GalleryFolder[];
  images: GalleryImage[];
  materials: MaterialSample[];
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
  quickModalType: "work" | "as" | null;
  setQuickModalType: (type: "work" | "as" | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  WORK: "baron_work_items_v1",
  AS: "baron_as_items_v1",
  FOLDERS: "baron_folders_v1",
  IMAGES: "baron_images_v1",
  MATERIALS: "baron_materials_v1",
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [workItems, setWorkItems] = useState<WorkItem[]>(initialWorkItems);
  const [asItems, setAsItems] = useState<AsItem[]>(initialAsItems);
  const [folders, setFolders] = useState<GalleryFolder[]>(initialFolders);
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [materials, setMaterials] = useState<MaterialSample[]>(initialMaterials);
  const [isLoading, setIsLoading] = useState(true);
  const [quickModalType, setQuickModalType] = useState<"work" | "as" | null>(null);

  // Initialize from LocalStorage or API
  useEffect(() => {
    try {
      const savedWork = localStorage.getItem(STORAGE_KEYS.WORK);
      const savedAs = localStorage.getItem(STORAGE_KEYS.AS);
      const savedFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES);
      const savedMaterials = localStorage.getItem(STORAGE_KEYS.MATERIALS);

      if (savedWork) setWorkItems(JSON.parse(savedWork));
      if (savedAs) setAsItems(JSON.parse(savedAs));
      if (savedFolders) setFolders(JSON.parse(savedFolders));
      if (savedImages) setImages(JSON.parse(savedImages));
      if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    } catch (e) {
      console.warn("LocalStorage access failed, using memory state", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync to LocalStorage on change
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

  // Actions
  const addWorkItem = async (item: Omit<WorkItem, "id" | "createdAt">) => {
    const newItem: WorkItem = {
      ...item,
      id: `work-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setWorkItems((prev) => [newItem, ...prev]);

    // Async sync to server API
    fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, type: "work" }),
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
      nextProgress = 100;
    } else {
      nextStatus = "대기";
      nextProgress = 0;
    }

    updateWorkItem(id, { status: nextStatus, progress: nextProgress });
  };

  const addAsItem = async (item: Omit<AsItem, "id" | "createdAt">) => {
    const newItem: AsItem = {
      ...item,
      id: `as-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAsItems((prev) => [newItem, ...prev]);

    fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, type: "as" }),
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

  const metrics = getDashboardMetrics(workItems, asItems);

  return (
    <DataContext.Provider
      value={{
        workItems,
        asItems,
        folders,
        images,
        materials,
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
        quickModalType,
        setQuickModalType,
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
