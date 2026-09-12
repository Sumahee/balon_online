import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder_id") || undefined;

  const folders = serverStore.getFolders();
  const images = serverStore.getImages(folderId);

  return NextResponse.json({
    success: true,
    data: {
      folders,
      images,
      selectedFolderId: folderId || "folder-all",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_folder") {
      const { name, description } = body;
      if (!name) {
        return NextResponse.json({ success: false, message: "Folder name is required" }, { status: 400 });
      }
      const folder = serverStore.addFolder(name, description);
      return NextResponse.json({ success: true, data: folder }, { status: 201 });
    } else if (action === "upload_image" || body.url) {
      const { folderId, title, url, siteName, tags, dimensions, size } = body;
      if (!url || !title) {
        return NextResponse.json({ success: false, message: "URL and title are required" }, { status: 400 });
      }
      const image = serverStore.addImage({
        folderId: folderId || "folder-1",
        title,
        url,
        siteName: siteName || "바론 시공 현장",
        tags: Array.isArray(tags) ? tags : ["현장시공"],
        dimensions: dimensions || "1920 x 1080",
        size: size || "2.0 MB",
      });
      return NextResponse.json({ success: true, data: image }, { status: 201 });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type"); // 'image' or 'folder'

  if (!id) {
    return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
  }

  if (type === "image") {
    const success = serverStore.deleteImage(id);
    if (!success) {
      return NextResponse.json({ success: false, message: "Image not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Image deleted" });
  }

  return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
}
