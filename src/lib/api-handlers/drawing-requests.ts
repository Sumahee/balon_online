import { NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { serverStore } from "@/lib/serverStore";
import { DrawingRequest } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workItemId = searchParams.get("workItemId");
  const status = searchParams.get("status");

  if (db) {
    let sql = "SELECT * FROM drawing_requests";
    const args: any[] = [];
    const conditions: string[] = [];

    if (workItemId) {
      conditions.push("work_item_id = ?");
      args.push(workItemId);
    }
    if (status) {
      conditions.push("status = ?");
      args.push(status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    const res = await executeQuery(sql, args);
    if (res.success && res.rows) {
      const requests: DrawingRequest[] = res.rows.map((row: any) => ({
        id: String(row.id),
        workItemId: String(row.work_item_id),
        drawingType: row.drawing_type ? (String(row.drawing_type) as any) : undefined,
        clientName: String(row.client_name || ""),
        siteAddress: row.site_address ? String(row.site_address) : undefined,
        deliveryDate: row.delivery_date ? String(row.delivery_date) : undefined,
        contactName: row.contact_name ? String(row.contact_name) : undefined,
        contactPhone: row.contact_phone ? String(row.contact_phone) : undefined,
        postColor: row.post_color ? String(row.post_color) : undefined,
        boardColor: row.board_color ? String(row.board_color) : undefined,
        drawingAssignee: row.drawing_assignee ? String(row.drawing_assignee) : undefined,
        title: String(row.title || ""),
        description: row.description ? String(row.description) : undefined,
        status: row.status || "pending",
        blueprintId: row.blueprint_id ? Number(row.blueprint_id) : undefined,
        resultPdfUrl: row.result_pdf_url ? String(row.result_pdf_url) : undefined,
        resultThumbnailUrl: row.result_thumbnail_url ? String(row.result_thumbnail_url) : undefined,
        createdAt: String(row.created_at || ""),
        updatedAt: String(row.updated_at || ""),
      }));
      return NextResponse.json({ success: true, requests });
    }
  }

  // Fallback to in-memory serverStore
  let list = serverStore.getDrawingRequests(workItemId || undefined);
  if (status) {
    list = list.filter((r) => r.status === status);
  }
  return NextResponse.json({ success: true, requests: list, isMock: !db });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      workItemId,
      drawingType,
      clientName,
      siteAddress,
      deliveryDate,
      contactName,
      contactPhone,
      postColor,
      boardColor,
      drawingAssignee,
      title,
      description,
    } = body;

    if (!workItemId || !title || !clientName) {
      return NextResponse.json(
        { success: false, error: "workItemId, title, clientName are required fields" },
        { status: 400 }
      );
    }

    const id = `req-${Date.now()}`;
    const now = new Date().toISOString();

    if (db) {
      const sql = `
        INSERT INTO drawing_requests 
        (id, work_item_id, drawing_type, client_name, site_address, delivery_date, contact_name, contact_phone, post_color, board_color, drawing_assignee, title, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `;
      const args = [
        id,
        workItemId,
        drawingType || "옴니버스",
        clientName,
        siteAddress || null,
        deliveryDate || null,
        contactName || null,
        contactPhone || null,
        postColor || null,
        boardColor || null,
        drawingAssignee || null,
        title,
        description || null,
        now,
        now,
      ];

      const res = await executeQuery(sql, args);
      if (res.success) {
        const newReq: DrawingRequest = {
          id,
          workItemId,
          drawingType,
          clientName,
          siteAddress,
          deliveryDate,
          contactName,
          contactPhone,
          postColor,
          boardColor,
          drawingAssignee,
          title,
          description,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        return NextResponse.json({ success: true, request: newReq });
      }
    }

    // Fallback to in-memory serverStore
    const newReq = serverStore.addDrawingRequest({
      workItemId,
      drawingType,
      clientName,
      siteAddress,
      deliveryDate,
      contactName,
      contactPhone,
      postColor,
      boardColor,
      drawingAssignee,
      title,
      description,
      status: "pending",
    });

    return NextResponse.json({ success: true, request: newReq, isMock: !db });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, blueprintId, resultPdfUrl, resultThumbnailUrl } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (db) {
      const updates: string[] = ["updated_at = ?"];
      const args: any[] = [now];

      if (status) {
        updates.push("status = ?");
        args.push(status);
      }
      if (blueprintId !== undefined) {
        updates.push("blueprint_id = ?");
        args.push(blueprintId);
      }
      if (resultPdfUrl !== undefined) {
        updates.push("result_pdf_url = ?");
        args.push(resultPdfUrl);
      }
      if (resultThumbnailUrl !== undefined) {
        updates.push("result_thumbnail_url = ?");
        args.push(resultThumbnailUrl);
      }

      args.push(id);
      const sql = `UPDATE drawing_requests SET ${updates.join(", ")} WHERE id = ?`;
      const res = await executeQuery(sql, args);

      if (res.success) {
        return NextResponse.json({ success: true, message: "Drawing request updated successfully" });
      }
    }

    // Fallback to in-memory serverStore
    const updated = serverStore.updateDrawingRequest(id, {
      ...(status && { status }),
      ...(blueprintId !== undefined && { blueprintId }),
      ...(resultPdfUrl !== undefined && { resultPdfUrl }),
      ...(resultThumbnailUrl !== undefined && { resultThumbnailUrl }),
    });

    return NextResponse.json({ success: true, request: updated, isMock: !db });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
