import {
  WorkItem,
  AsItem,
  GalleryFolder,
  GalleryImage,
  MaterialSample,
} from "@/types";
import {
  initialWorkItems,
  initialAsItems,
  initialFolders,
  initialImages,
  initialMaterials,
} from "./dataStore";

// In-memory persistent state for serverless execution
class ServerStore {
  private workItems: WorkItem[] = [...initialWorkItems];
  private asItems: AsItem[] = [...initialAsItems];
  private folders: GalleryFolder[] = [...initialFolders];
  private images: GalleryImage[] = [...initialImages];
  private materials: MaterialSample[] = [...initialMaterials];

  // Work Items
  getWorkItems(): WorkItem[] {
    return this.workItems;
  }

  addWorkItem(item: Omit<WorkItem, "id" | "createdAt">): WorkItem {
    const newItem: WorkItem = {
      ...item,
      id: `work-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.workItems = [newItem, ...this.workItems];
    return newItem;
  }

  updateWorkItem(id: string, updates: Partial<WorkItem>): WorkItem | null {
    const index = this.workItems.findIndex((w) => w.id === id);
    if (index === -1) return null;
    this.workItems[index] = { ...this.workItems[index], ...updates };
    return this.workItems[index];
  }

  deleteWorkItem(id: string): boolean {
    const initialLen = this.workItems.length;
    this.workItems = this.workItems.filter((w) => w.id !== id);
    return this.workItems.length < initialLen;
  }

  // A/S Items
  getAsItems(): AsItem[] {
    return this.asItems;
  }

  addAsItem(item: Omit<AsItem, "id" | "createdAt">): AsItem {
    const newItem: AsItem = {
      ...item,
      id: `as-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.asItems = [newItem, ...this.asItems];
    return newItem;
  }

  updateAsItem(id: string, updates: Partial<AsItem>): AsItem | null {
    const index = this.asItems.findIndex((a) => a.id === id);
    if (index === -1) return null;
    this.asItems[index] = { ...this.asItems[index], ...updates };
    return this.asItems[index];
  }

  deleteAsItem(id: string): boolean {
    const initialLen = this.asItems.length;
    this.asItems = this.asItems.filter((a) => a.id !== id);
    return this.asItems.length < initialLen;
  }

  // Gallery Folders & Images
  getFolders(): GalleryFolder[] {
    return this.folders;
  }

  addFolder(name: string, description?: string): GalleryFolder {
    const newFolder: GalleryFolder = {
      id: `folder-${Date.now()}`,
      name,
      description,
      itemCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.folders.push(newFolder);
    return newFolder;
  }

  getImages(folderId?: string): GalleryImage[] {
    if (!folderId || folderId === "folder-all") {
      return this.images;
    }
    return this.images.filter((img) => img.folderId === folderId);
  }

  addImage(img: Omit<GalleryImage, "id" | "createdAt">): GalleryImage {
    const newImage: GalleryImage = {
      ...img,
      id: `img-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.images = [newImage, ...this.images];

    // Update folder item count
    const folder = this.folders.find((f) => f.id === img.folderId);
    if (folder) {
      folder.itemCount += 1;
    }
    const allFolder = this.folders.find((f) => f.id === "folder-all");
    if (allFolder) {
      allFolder.itemCount = this.images.length;
    }

    return newImage;
  }

  deleteImage(id: string): boolean {
    const img = this.images.find((i) => i.id === id);
    if (!img) return false;
    this.images = this.images.filter((i) => i.id !== id);
    const folder = this.folders.find((f) => f.id === img.folderId);
    if (folder && folder.itemCount > 0) {
      folder.itemCount -= 1;
    }
    const allFolder = this.folders.find((f) => f.id === "folder-all");
    if (allFolder) {
      allFolder.itemCount = this.images.length;
    }
    return true;
  }

  // Materials
  getMaterials(): MaterialSample[] {
    return this.materials;
  }

  addMaterial(mat: Omit<MaterialSample, "id">): MaterialSample {
    const newMat: MaterialSample = {
      ...mat,
      id: `mat-${Date.now()}`,
    };
    this.materials = [newMat, ...this.materials];
    return newMat;
  }
}

// Global singleton instance
const globalForStore = globalThis as unknown as { serverStore?: ServerStore };
export const serverStore = globalForStore.serverStore ?? new ServerStore();
if (process.env.NODE_ENV !== "production") globalForStore.serverStore = serverStore;
