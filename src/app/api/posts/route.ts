import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { db, executeQuery } from "@/lib/db";
import { WorkItem, AsItem } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'work' | 'as'
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  if (type === "work") {
    if (db) {
      let sql = "SELECT * FROM bo_work_items";
      const conditions: string[] = [];
      const args: any[] = [];

      if (status && status !== "전체") {
        conditions.push("status = ?");
        args.push(status);
      }
      if (query) {
        conditions.push("(LOWER(title) LIKE ? OR LOWER(assignee) LIKE ? OR LOWER(client_name) LIKE ?)");
        args.push(`%${query}%`, `%${query}%`, `%${query}%`);
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      sql += " ORDER BY created_at DESC";

      const res = await executeQuery(sql, args);
      if (res.success && res.rows) {
        // Load attachments and comments for live items
        const attRes = await executeQuery("SELECT * FROM bo_attachments", []);
        const cmtRes = await executeQuery("SELECT * FROM bo_work_item_comments ORDER BY created_at ASC", []);

        const attMap = new Map<string, any[]>();
        if (attRes.success && attRes.rows) {
          for (const a of attRes.rows) {
            const list = attMap.get(String(a.work_item_id)) || [];
            list.push({
              id: String(a.id),
              name: String(a.name),
              url: String(a.url),
              fileType: (a.file_type || "file") as any,
              size: a.size ? String(a.size) : undefined,
              uploadedAt: a.uploaded_at ? String(a.uploaded_at) : undefined,
            });
            attMap.set(String(a.work_item_id), list);
          }
        }

        const cmtMap = new Map<string, any[]>();
        if (cmtRes.success && cmtRes.rows) {
          for (const c of cmtRes.rows) {
            let images: string[] = [];
            if (c.images) {
              try {
                images = JSON.parse(String(c.images));
              } catch (e) {
                images = [String(c.images)];
              }
            }
            const list = cmtMap.get(String(c.work_item_id)) || [];
            list.push({
              id: String(c.id),
              workItemId: String(c.work_item_id),
              author: String(c.author),
              content: String(c.content),
              images,
              createdAt: String(c.created_at),
            });
            cmtMap.set(String(c.work_item_id), list);
          }
        }

        const items: WorkItem[] = res.rows.map((row: any) => {
          let materialOrders = [];
          if (row.material_orders) {
            try {
              materialOrders = JSON.parse(String(row.material_orders));
            } catch (e) {}
          }

          return {
            id: String(row.id),
            type: "work",
            title: String(row.title || ""),
            clientName: String(row.client_name || "(주)바론 협력업체"),
            siteAddress: row.site_address ? String(row.site_address) : undefined,
            region: row.region ? String(row.region) : "반포",
            drawingType: row.drawing_type ? (String(row.drawing_type) as any) : undefined,
            cardType: (row.card_type || "도면") as any,
            deadlineType: (row.deadline_type || "시공일") as any,
            deliveryDate: String(row.delivery_date || ""),
            siteContactPhone: row.site_contact_phone ? String(row.site_contact_phone) : undefined,
            postColor: row.post_color ? String(row.post_color) : undefined,
            boardColor: row.board_color ? String(row.board_color) : undefined,
            drawingAssignee: row.drawing_assignee ? String(row.drawing_assignee) : undefined,
            category: (row.category || "제작") as any,
            assignee: String(row.assignee || "담당자 미지정"),
            priority: (row.priority || "보통") as any,
            status: (row.status || "대기") as any,
            progress: Number(row.progress || 0),
            startDate: String(row.start_date || ""),
            dueDate: String(row.due_date || ""),
            notes: row.notes ? String(row.notes) : "",
            description: row.description ? String(row.description) : "",
            materialOrders,
            createdAt: String(row.created_at || ""),
            attachments: attMap.get(String(row.id)) || [],
            comments: cmtMap.get(String(row.id)) || [],
          };
        });
        return NextResponse.json({ success: true, count: items.length, data: items, isDb: true });
      }
    }

    let items = serverStore.getWorkItems();
    if (status && status !== "전체") {
      items = items.filter((item) => item.status === status);
    }
    if (query) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.assignee.toLowerCase().includes(query) ||
          (item.clientName || "").toLowerCase().includes(query) ||
          (item.category || "").toLowerCase().includes(query)
      );
    }
    return NextResponse.json({ success: true, count: items.length, data: items, isDb: false });
  } else if (type === "as") {
    if (db) {
      let sql = "SELECT * FROM bo_as_items";
      const conditions: string[] = [];
      const args: any[] = [];

      if (status && status !== "전체") {
        conditions.push("result_status = ?");
        args.push(status);
      }
      if (query) {
        conditions.push("(LOWER(client_name) LIKE ? OR LOWER(site_address) LIKE ? OR LOWER(reason) LIKE ?)");
        args.push(`%${query}%`, `%${query}%`, `%${query}%`);
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      sql += " ORDER BY created_at DESC";

      const res = await executeQuery(sql, args);
      if (res.success && res.rows) {
        const items: AsItem[] = res.rows.map((row: any) => ({
          id: String(row.id),
          type: "as",
          clientName: String(row.client_name || ""),
          constructDate: String(row.construct_date || ""),
          siteAddress: String(row.site_address || ""),
          reason: String(row.reason || ""),
          resultStatus: (row.result_status || "접수") as any,
          resolutionDetails: row.resolution_details ? String(row.resolution_details) : "",
          technician: row.technician ? String(row.technician) : "",
          contactPhone: row.contact_phone ? String(row.contact_phone) : "",
          priority: (row.priority || "보통") as any,
          createdAt: String(row.created_at || ""),
        }));
        return NextResponse.json({ success: true, count: items.length, data: items, isDb: true });
      }
    }

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
    return NextResponse.json({ success: true, count: items.length, data: items, isDb: false });
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
        siteAddress,
        region,
        drawingType,
        cardType,
        deadlineType,
        deliveryDate,
        siteContactPhone,
        postColor,
        boardColor,
        drawingAssignee,
        category,
        assignee,
        priority,
        status,
        progress,
        startDate,
        dueDate,
        notes,
        description,
        materialOrders,
        attachments,
      } = body;
      if (!title || !assignee) {
        return NextResponse.json(
          { success: false, message: "Title and assignee are required" },
          { status: 400 }
        );
      }

      const id = body.id || `work-${Date.now()}`;
      const safeClient = clientName || "(주)바론 협력사";
      const safeRegion = region || "반포";
      const safeDrawingType = drawingType || "옴니버스";
      const safeCardType = cardType || "도면";
      const safeDeadlineType = deadlineType || "시공일";
      const safeDeliveryDate = deliveryDate || dueDate || new Date().toISOString().split("T")[0];
      const safeCategory = category || "제작";
      const safePriority = priority || "보통";
      const safeStatus = status || "대기";
      const safeProgress = typeof progress === "number" ? progress : 0;
      const safeStartDate = startDate || new Date().toISOString().split("T")[0];
      const safeDueDate = dueDate || safeDeliveryDate;
      const safeNotes = notes || "";
      const safeDesc = description || "";
      const safeOrders = materialOrders ? JSON.stringify(materialOrders) : "[]";
      const now = new Date().toISOString();

      if (db) {
        await executeQuery(
          `INSERT INTO bo_work_items 
           (id, type, title, client_name, site_address, region, drawing_type, card_type, deadline_type, delivery_date, site_contact_phone, post_color, board_color, drawing_assignee, category, assignee, priority, status, progress, start_date, due_date, notes, description, material_orders, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            "work",
            title,
            safeClient,
            siteAddress || "",
            safeRegion,
            safeDrawingType,
            safeCardType,
            safeDeadlineType,
            safeDeliveryDate,
            siteContactPhone || "",
            postColor || "",
            boardColor || "",
            drawingAssignee || "",
            safeCategory,
            assignee,
            safePriority,
            safeStatus,
            safeProgress,
            safeStartDate,
            safeDueDate,
            safeNotes,
            safeDesc,
            safeOrders,
            now,
          ]
        );
        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            await executeQuery(
              `INSERT INTO bo_attachments (id, work_item_id, name, url, file_type, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                att.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                id,
                att.name,
                att.url,
                att.fileType || "file",
                att.size || "",
                att.uploadedAt || now,
              ]
            );
          }
        }
      }

      const newItem = serverStore.addWorkItem({
        type: "work",
        title,
        clientName: safeClient,
        siteAddress,
        region: safeRegion,
        drawingType: safeDrawingType,
        cardType: safeCardType,
        deadlineType: safeDeadlineType,
        deliveryDate: safeDeliveryDate,
        category: safeCategory,
        assignee,
        priority: safePriority,
        status: safeStatus,
        progress: safeProgress,
        startDate: safeStartDate,
        dueDate: safeDueDate,
        notes: safeNotes,
        description: safeDesc,
        materialOrders: Array.isArray(materialOrders) ? materialOrders : [],
        attachments: Array.isArray(attachments) ? attachments : [],
      });
      return NextResponse.json({ success: true, data: { ...newItem, id } }, { status: 201 });
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

      const id = body.id || `as-${Date.now()}`;
      const safeConstructDate = constructDate || new Date().toISOString().split("T")[0];
      const safeResultStatus = resultStatus || "접수";
      const safeResolution = resolutionDetails || "";
      const safeTechnician = technician || "";
      const safeContact = contactPhone || "";
      const safePriority = priority || "보통";
      const now = new Date().toISOString();

      if (db) {
        await executeQuery(
          `INSERT INTO bo_as_items 
           (id, type, client_name, construct_date, site_address, reason, result_status, resolution_details, technician, contact_phone, priority, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            "as",
            clientName,
            safeConstructDate,
            siteAddress,
            reason,
            safeResultStatus,
            safeResolution,
            safeTechnician,
            safeContact,
            safePriority,
            now,
          ]
        );
      }

      const newItem = serverStore.addAsItem({
        type: "as",
        clientName,
        constructDate: safeConstructDate,
        siteAddress,
        reason,
        resultStatus: safeResultStatus,
        resolutionDetails: safeResolution,
        technician: safeTechnician,
        contactPhone: safeContact,
        priority: safePriority,
      });
      return NextResponse.json({ success: true, data: { ...newItem, id } }, { status: 201 });
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
      if (db) {
        const fields: string[] = [];
        const args: any[] = [];

        if (updates.status) {
          fields.push("status = ?");
          args.push(updates.status);
        }
        if (typeof updates.progress === "number") {
          fields.push("progress = ?");
          args.push(updates.progress);
        }
        if (updates.deliveryDate) {
          fields.push("delivery_date = ?");
          args.push(updates.deliveryDate);
        }
        if (updates.deadlineType) {
          fields.push("deadline_type = ?");
          args.push(updates.deadlineType);
        }
        if (updates.title) {
          fields.push("title = ?");
          args.push(updates.title);
        }
        if (updates.clientName) {
          fields.push("client_name = ?");
          args.push(updates.clientName);
        }
        if (updates.region) {
          fields.push("region = ?");
          args.push(updates.region);
        }
        if (updates.siteAddress !== undefined) {
          fields.push("site_address = ?");
          args.push(updates.siteAddress);
        }
        if (updates.drawingType !== undefined) {
          fields.push("drawing_type = ?");
          args.push(updates.drawingType);
        }
        if (updates.cardType !== undefined) {
          fields.push("card_type = ?");
          args.push(updates.cardType);
        }
        if (updates.category !== undefined) {
          fields.push("category = ?");
          args.push(updates.category);
        }
        if (updates.assignee !== undefined) {
          fields.push("assignee = ?");
          args.push(updates.assignee);
        }
        if (updates.priority !== undefined) {
          fields.push("priority = ?");
          args.push(updates.priority);
        }
        if (updates.startDate !== undefined) {
          fields.push("start_date = ?");
          args.push(updates.startDate);
        }
        if (updates.dueDate !== undefined) {
          fields.push("due_date = ?");
          args.push(updates.dueDate);
        }
        if (updates.notes !== undefined) {
          fields.push("notes = ?");
          args.push(updates.notes);
        }
        if (updates.description !== undefined) {
          fields.push("description = ?");
          args.push(updates.description);
        }
        if (updates.materialOrders !== undefined) {
          fields.push("material_orders = ?");
          args.push(JSON.stringify(updates.materialOrders));
        }

        if (fields.length > 0) {
          args.push(id);
          await executeQuery(`UPDATE bo_work_items SET ${fields.join(", ")} WHERE id = ?`, args);
        }

        if (updates.attachments !== undefined && Array.isArray(updates.attachments)) {
          await executeQuery("DELETE FROM bo_attachments WHERE work_item_id = ?", [id]);
          for (const att of updates.attachments) {
            await executeQuery(
              `INSERT INTO bo_attachments (id, work_item_id, name, url, file_type, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                att.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                id,
                att.name,
                att.url,
                att.fileType || "file",
                att.size || "",
                att.uploadedAt || new Date().toISOString().split("T")[0],
              ]
            );
          }
        }
      }

      const updated = serverStore.updateWorkItem(id, updates);
      return NextResponse.json({ success: true, data: updated || { id, ...updates } });
    } else if (type === "as") {
      if (db) {
        const fields: string[] = [];
        const args: any[] = [];

        if (updates.resultStatus) {
          fields.push("result_status = ?");
          args.push(updates.resultStatus);
        }
        if (updates.resolutionDetails !== undefined) {
          fields.push("resolution_details = ?");
          args.push(updates.resolutionDetails);
        }
        if (updates.technician !== undefined) {
          fields.push("technician = ?");
          args.push(updates.technician);
        }

        if (fields.length > 0) {
          args.push(id);
          await executeQuery(`UPDATE bo_as_items SET ${fields.join(", ")} WHERE id = ?`, args);
        }
      }

      const updated = serverStore.updateAsItem(id, updates);
      return NextResponse.json({ success: true, data: updated || { id, ...updates } });
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

  if (type === "work") {
    if (db) {
      await executeQuery("DELETE FROM bo_attachments WHERE work_item_id = ?", [id]);
      await executeQuery("DELETE FROM bo_work_item_comments WHERE work_item_id = ?", [id]);
      await executeQuery("DELETE FROM bo_work_items WHERE id = ?", [id]);
    }
    serverStore.deleteWorkItem(id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } else if (type === "as") {
    if (db) {
      await executeQuery("DELETE FROM bo_as_items WHERE id = ?", [id]);
    }
    serverStore.deleteAsItem(id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  }

  return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
}
