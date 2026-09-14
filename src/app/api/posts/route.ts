import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'work' | 'as'
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  if (type === "work") {
    let items = serverStore.getWorkItems();
    if (status && status !== "전체") {
      items = items.filter((item) => item.status === status);
    }
    if (query) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.assignee.toLowerCase().includes(query) ||
          (item.category || "").toLowerCase().includes(query)
      );
    }
    return NextResponse.json({ success: true, count: items.length, data: items });
  } else if (type === "as") {
    let items = serverStore.getAsItems();
    if (status && status !== "전체") {
      items = items.filter((item) => item.resultStatus === status);
    }
    if (query) {
      items = items.filter(
        (item) =>
          item.clientName.toLowerCase().includes(query) ||
          item.siteAddress.toLowerCase().includes(query) ||
          item.reason.toLowerCase().includes(query) ||
          (item.technician && item.technician.toLowerCase().includes(query))
      );
    }
    return NextResponse.json({ success: true, count: items.length, data: items });
  }

  return NextResponse.json(
    {
      success: false,
      message: "Please specify ?type=work or ?type=as",
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === "work") {
      const {
        title,
        clientName,
        cardType,
        deadlineType,
        deliveryDate,
        category,
        assignee,
        priority,
        status,
        progress,
        startDate,
        dueDate,
        notes,
        description,
        attachments,
      } = body;
      if (!title || !assignee) {
        return NextResponse.json(
          { success: false, message: "Title and assignee are required" },
          { status: 400 }
        );
      }
      const newItem = serverStore.addWorkItem({
        type: "work",
        title,
        clientName: clientName || "(주)바론 협력사",
        cardType: cardType || "도면",
        deadlineType: deadlineType || "시공일",
        deliveryDate: deliveryDate || dueDate || new Date().toISOString().split("T")[0],
        category: category || "제작",
        assignee,
        priority: priority || "보통",
        status: status || "대기",
        progress: typeof progress === "number" ? progress : 0,
        startDate: startDate || new Date().toISOString().split("T")[0],
        dueDate: dueDate || new Date().toISOString().split("T")[0],
        notes,
        description: description || "",
        attachments: Array.isArray(attachments) ? attachments : [],
      });
      return NextResponse.json({ success: true, data: newItem }, { status: 201 });
    } else if (type === "as") {
      const {
        clientName,
        constructDate,
        siteAddress,
        reason,
        resultStatus,
        resolutionDetails,
        technician,
        contactPhone,
        priority,
      } = body;

      if (!clientName || !siteAddress || !reason) {
        return NextResponse.json(
          { success: false, message: "Client name, site address, and reason are required" },
          { status: 400 }
        );
      }

      const newItem = serverStore.addAsItem({
        type: "as",
        clientName,
        constructDate: constructDate || new Date().toISOString().split("T")[0],
        siteAddress,
        reason,
        resultStatus: resultStatus || "접수",
        resolutionDetails: resolutionDetails || "",
        technician: technician || "",
        contactPhone: contactPhone || "",
        priority: priority || "보통",
      });
      return NextResponse.json({ success: true, data: newItem }, { status: 201 });
    }

    return NextResponse.json({ success: false, message: "Invalid type field" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, ...updates } = body;

    if (!id || !type) {
      return NextResponse.json({ success: false, message: "id and type are required" }, { status: 400 });
    }

    if (type === "work") {
      const updated = serverStore.updateWorkItem(id, updates);
      if (!updated) {
        return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    } else if (type === "as") {
      const updated = serverStore.updateAsItem(id, updates);
      if (!updated) {
        return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type) {
    return NextResponse.json({ success: false, message: "id and type are required" }, { status: 400 });
  }

  let deleted = false;
  if (type === "work") {
    deleted = serverStore.deleteWorkItem(id);
  } else if (type === "as") {
    deleted = serverStore.deleteAsItem(id);
  }

  if (!deleted) {
    return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Deleted successfully" });
}
