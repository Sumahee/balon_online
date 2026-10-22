import { ensureWorkTagsSchema } from "@/lib/work-tags-schema";
import { readWorkTags, validateWorkTags } from "@/lib/work-tags";
import { ensureWorkEntrySchema } from "@/lib/work-entry-schema";
import { VERIFY } from "./auth";
import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { db, executeQuery, executeMutation } from "@/lib/db";
import { WorkItem, AsItem } from "@/types";
import { getToday } from "@/lib/date";
import { ensureAsSchema } from "@/lib/as-schema";
import { ensureWorkConfirmationSchema } from "@/lib/work-confirmation-schema";
import { ensureWorkCalendarSchema } from "@/lib/work-calendar-schema";
import { workSummary, WORK_SUMMARY_COLUMNS } from "@/lib/work-list";
import { isCalendarVisible } from "@/lib/calendar-visibility";
import { deleteConstructionPhotos } from "@/lib/r2-storage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'work' | 'as'
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  if (type === "work") {
    const attachmentId=searchParams.get("attachment_id");
    if(attachmentId) {
      let url = "";
      if (db) {
        const result=await executeQuery("SELECT url FROM bo_attachments WHERE id = ?",[attachmentId]);
        if(!result.success)return new Response("File read failed",{status:503});
        url=String(result.rows[0]?.url || "");
      } else {
        url = serverStore.getWorkItems().flatMap(item => item.attachments || []).find(attachment => attachment.id === attachmentId)?.url || "";
      }
      const data=url.match(/^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)$/);
      if(data)return new Response(Buffer.from(data[2],"base64"),{headers:{"Content-Type":data[1],"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}});
      if(/^(https?:\/\/|\/uploads\/)/.test(url))return NextResponse.redirect(new URL(url,request.url));
      return new Response("File not found",{status:404});
    }
    const detailId = searchParams.get("id");
    if (searchParams.get("summary") === "1") {
      const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 30));
      const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const mode = searchParams.get("mode");
      const category = searchParams.get("category");
      const filters: string[] = []; const values: (string | number)[] = [];
      const dateColumn = mode === "calendar" ? "COALESCE(NULLIF(delivery_date,''),due_date)" : "substr(created_at,1,10)";
      if (from) {filters.push(`${dateColumn} >= ?`);values.push(from);}
      if (to) {filters.push(`${dateColumn} <= ?`);values.push(to);}
      if (mode === "active") filters.push("status != '시공완료'");
      if (mode === "calendar") {
        filters.push("COALESCE(calendar_visible, CASE WHEN deadline_type = '시공일' THEN 1 ELSE 0 END) = 1");
        filters.push("COALESCE(NULLIF(TRIM(delivery_date),''),NULLIF(TRIM(due_date),'')) IS NOT NULL");
      }
      if (status && status !== "전체") {filters.push("status = ?");values.push(status);}
      if (category && category !== "전체") {filters.push("category = ?");values.push(category);}
      if (query) {filters.push("(LOWER(title) LIKE ? OR LOWER(client_name) LIKE ? OR LOWER(site_address) LIKE ?)");values.push(...Array(3).fill(`%${query}%`));}
      if (db) {
        try {
          await ensureWorkCalendarSchema(); await ensureWorkConfirmationSchema(); await ensureWorkTagsSchema();
          const result = await executeQuery(`SELECT ${WORK_SUMMARY_COLUMNS} FROM bo_work_items ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values,limit+1,offset]);
          if (!result.success) throw new Error("목록 조회 실패");
          const pageRows = result.rows.slice(0,limit);
          const drawings = new Map<string, {id: string; name: string}>();
          if (pageRows.length) {
            const ids = pageRows.map(row => String(row.id));
            const metadata = await executeQuery(`SELECT id, name, work_item_id AS workItemId FROM bo_attachments WHERE work_item_id IN (${ids.map(() => "?").join(",")}) AND (file_type = 'pdf' OR LOWER(name) LIKE '%.pdf') ORDER BY uploaded_at DESC, id DESC`, ids);
            if (!metadata.success) throw new Error("도면 정보 조회 실패");
            for (const file of metadata.rows) {
              const workId = String(file.workItemId);
              if (!drawings.has(workId)) drawings.set(workId, {id:String(file.id), name:String(file.name)});
            }
          }
          const data = pageRows.map(row => ({...row, tags:readWorkTags(row.tags), drawingAttachment:drawings.get(String(row.id)) || null, confirmationPending:Number(row.confirmationPending) === 1, confirmationCompleted:Number(row.confirmationCompleted) === 1, calendarVisible:row.calendarVisible == null ? undefined : Number(row.calendarVisible) === 1, detailsLoaded:false}));
          return NextResponse.json({success:true,data,hasMore:result.rows.length>limit});
        } catch { return NextResponse.json({success:false,message:"업무 목록을 불러오지 못했습니다."},{status:503}); }
      }
      const matches = serverStore.getWorkItems().filter(item => {
        const date = mode === "calendar" ? item.deliveryDate || item.dueDate : item.createdAt?.slice(0,10);
        return (!from || date >= from) && (!to || date <= to) && (mode !== "active" || item.status !== "시공완료") && (mode !== "calendar" || isCalendarVisible(item)) && (!status || status === "전체" || item.status === status) && (!category || category === "전체" || item.category === category) && (!query || [item.title,item.clientName,item.siteAddress].some(value=>value?.toLowerCase().includes(query)));
      }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      return NextResponse.json({success:true,data:matches.slice(offset,offset+limit).map(workSummary),hasMore:matches.length>offset+limit});
    }
    if (db) {
      await ensureWorkConfirmationSchema();
      await ensureWorkTagsSchema();
      let sql = "SELECT * FROM bo_work_items";
      const conditions: string[] = [];
      const args: any[] = [];
      if (detailId) { conditions.push("id = ?"); args.push(detailId); }

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
      if (!res.success) return NextResponse.json({ success: false, message: "업무 데이터를 불러오지 못했습니다." }, { status: 503 });
      if (res.success && res.rows) {
        // Load attachments and comments for live items
        const ids = res.rows.map(row=>String(row.id));
        const scope = ids.length ? `WHERE work_item_id IN (${ids.map(()=>"?").join(",")})` : "WHERE 1 = 0";
        const [attRes,cmtRes] = await Promise.all([
          executeQuery(`SELECT id,work_item_id,name,file_type,size,uploaded_at,CASE WHEN url LIKE 'data:%' THEN '/api/posts?type=work&attachment_id=' || id ELSE url END AS url FROM bo_attachments ${scope}`, ids),
          executeQuery(`SELECT c.id,c.work_item_id,c.author,c.content,c.created_at,
            (SELECT json_group_array(CASE WHEN j.value LIKE 'data:image/%' THEN '/api/gallery?source=comment&id=' || c.id || '&index=' || j.key ELSE j.value END) FROM json_each(CASE WHEN json_valid(c.images) THEN c.images ELSE '[]' END) j) AS images
            FROM bo_work_item_comments c ${scope} ORDER BY created_at ${detailId ? "DESC LIMIT 21" : "ASC"}`, ids),
        ]);
        if (!attRes.success || !cmtRes.success) return NextResponse.json({ success: false, message: "첨부파일 또는 댓글을 불러오지 못했습니다." }, { status: 503 });

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
          for (const c of detailId ? cmtRes.rows.slice(0,20).reverse() : cmtRes.rows) {
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
              images: images.map((url,index)=>url.startsWith("data:image/") ? `/api/gallery?source=comment&id=${encodeURIComponent(String(c.id))}&index=${index}` : url).filter(Boolean),
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
            detailsLoaded: true,
            commentsHasMore: !!detailId && cmtRes.rows.length > 20,
            title: String(row.title || ""),
            tags: readWorkTags(row.work_tags),
            confirmationPending: Number(row.confirmation_pending || 0) === 1,
            confirmationCompleted: Number(row.confirmation_completed || 0) === 1,
            calendarVisible: row.calendar_visible == null ? undefined : Number(row.calendar_visible) === 1,
            clientName: String(row.client_name || "(주)바론 협력업체"),
            siteAddress: row.site_address ? String(row.site_address) : undefined,
            region: row.region ? String(row.region) : "",
            drawingType: row.drawing_type ? (String(row.drawing_type) as any) : undefined,
            cardType: (row.card_type || "도면") as any,
            deadlineType: (row.deadline_type || "시공일") as any,
            deliveryDate: String(row.delivery_date || ""),
            siteContactPhone: row.site_contact_phone ? String(row.site_contact_phone) : undefined,
            postColor: row.post_color ? String(row.post_color) : undefined,
            boardColor: row.board_color ? String(row.board_color) : undefined,
            createdBy: String(row.created_by || ""), installationTeam: String(row.installation_team || ""), ceilingHeight: String(row.ceiling_height || ""),
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
    if (detailId) items = items.filter(item=>item.id === detailId);
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
    await ensureAsSchema();
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
      if (!res.success) return NextResponse.json({ success: false, message: "업무 데이터를 불러오지 못했습니다." }, { status: 503 });
      if (res.success && res.rows) {
        const items: AsItem[] = res.rows.map((row: any) => ({
          id: String(row.id),
          type: "as",
          clientName: String(row.client_name || ""),
          constructDate: String(row.construct_date || ""),
          installer: String(row.installer || ""),
          receivedDate: String(row.received_date || String(row.created_at || "").split("T")[0]),
          asDate: String(row.as_date || ""),
          serviceType: row.service_type === "유상" || row.service_type === "무상" ? row.service_type : undefined,
          paidReason: row.paid_reason === "고객과실" || row.paid_reason === "기간만료" ? row.paid_reason : "",
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
      const session = await VERIFY(request);
      if (!session.ok) return session;
      const { user: author } = await session.json();
      body.createdBy = String(author.name || author.loginId || "");
      body.assignee = body.createdBy;
      let tags: string[];
      try { tags=validateWorkTags(body.tags ?? []); } catch { return NextResponse.json({success:false,message:"업무 태그를 확인해주세요."},{status:400}); }
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
      const safeRegion = region || "";
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
        await ensureWorkEntrySchema();
        await ensureWorkTagsSchema();
        await executeMutation(
          `INSERT INTO bo_work_items 
           (id, type, title, client_name, site_address, region, drawing_type, card_type, deadline_type, delivery_date, site_contact_phone, post_color, board_color, drawing_assignee, category, assignee, priority, status, progress, start_date, due_date, notes, description, material_orders, created_at, created_by, installation_team, ceiling_height, work_tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            body.createdBy || "", body.installationTeam || "", body.ceilingHeight || "", JSON.stringify(tags),
          ]
        );
        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            await executeMutation(
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

      if (db && typeof body.calendarVisible === "boolean") {
        await ensureWorkCalendarSchema();
        await executeMutation("UPDATE bo_work_items SET calendar_visible = ? WHERE id = ?", [body.calendarVisible ? 1 : 0, id]);
      }
      if (db && typeof body.confirmationPending === "boolean") {
        await ensureWorkConfirmationSchema();
        await executeMutation("UPDATE bo_work_items SET confirmation_pending = ? WHERE id = ?", [body.confirmationPending ? 1 : 0, id]);
      }
      const newItem = serverStore.addWorkItem({
        tags,
        confirmationPending: body.confirmationPending === true,
        createdBy: body.createdBy || "", installationTeam: body.installationTeam || "", ceilingHeight: body.ceilingHeight || "",
        calendarVisible: typeof body.calendarVisible === "boolean" ? body.calendarVisible : undefined,
        type: "work",
        title,
        siteContactPhone, postColor, boardColor, drawingAssignee,
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
      }, id);
      return NextResponse.json({ success: true, data: { ...newItem, id } }, { status: 201 });
    } else if (type === "as") {
      await ensureAsSchema();
      const {
        clientName,
        constructDate,
        installer,
        receivedDate,
        asDate,
        serviceType,
        paidReason,
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
      const safeConstructDate = constructDate || "";
      const safeReceivedDate = receivedDate || getToday();
      if ((serviceType !== undefined && serviceType !== "유상" && serviceType !== "무상") || (serviceType === "유상" && paidReason !== "고객과실" && paidReason !== "기간만료")) return NextResponse.json({ success: false, message: "유상/무상 구분과 유상 사유를 확인해주세요." }, { status: 400 });
      const safeResultStatus = resultStatus || "접수";
      const safeResolution = resolutionDetails || "";
      const safeTechnician = technician || "";
      const safeContact = contactPhone || "";
      const safePriority = priority || "보통";
      const now = new Date().toISOString();

      if (db) {
        await executeMutation(
          `INSERT INTO bo_as_items 
           (id, type, client_name, construct_date, site_address, reason, result_status, resolution_details, technician, contact_phone, priority, created_at, installer, received_date, as_date, service_type, paid_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            installer || "",
            safeReceivedDate,
            asDate || "",
            serviceType || null,
            serviceType === "유상" ? paidReason : "",
          ]
        );
      }

      const newItem = serverStore.addAsItem({
        type: "as",
        clientName,
        constructDate: safeConstructDate,
        installer: installer || "",
        receivedDate: safeReceivedDate,
        asDate: asDate || "",
        serviceType,
        paidReason: serviceType === "유상" ? paidReason : "",
        siteAddress,
        reason,
        resultStatus: safeResultStatus,
        resolutionDetails: safeResolution,
        technician: safeTechnician,
        contactPhone: safeContact,
        priority: safePriority,
      }, id);
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
    const { id, type, createdBy: _createdBy, ...updates } = body;
    void _createdBy; // Registration author never changes during editing.

    if (!id || !type) {
      return NextResponse.json({ success: false, message: "id and type are required" }, { status: 400 });
    }

    if (type === "work") {
      if (updates.tags !== undefined) {
        try { updates.tags=validateWorkTags(updates.tags); } catch { return NextResponse.json({success:false,message:"업무 태그를 확인해주세요."},{status:400}); }
      }
      if (db) {
        const fields: string[] = [];
        const args: any[] = [];

        if (updates.installationTeam !== undefined || updates.ceilingHeight !== undefined) {
          await ensureWorkEntrySchema();
          for (const [key, column] of Object.entries({installationTeam:"installation_team",ceilingHeight:"ceiling_height"})) {
            if (updates[key] !== undefined) { fields.push(`${column} = ?`); args.push(updates[key]); }
          }
        }

        if (updates.tags !== undefined) { await ensureWorkTagsSchema(); fields.push("work_tags = ?"); args.push(JSON.stringify(updates.tags)); }
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
        if (updates.calendarVisible !== undefined) {
          if (typeof updates.calendarVisible !== "boolean") return NextResponse.json({success:false,message:"달력 표시 값을 확인해주세요."},{status:400});
          await ensureWorkCalendarSchema();
          fields.push("calendar_visible = ?"); args.push(updates.calendarVisible ? 1 : 0);
        }
        for (const [key, column] of Object.entries({ confirmationPending: "confirmation_pending", confirmationCompleted: "confirmation_completed" })) {
          if (updates[key] === undefined) continue;
          if (typeof updates[key] !== "boolean") return NextResponse.json({success:false,message:"컨펌 상태를 확인해주세요."},{status:400});
          await ensureWorkConfirmationSchema();
          fields.push(column + " = ?");
          args.push(updates[key] ? 1 : 0);
        }
        if (updates.description !== undefined) {
          fields.push("description = ?");
          args.push(updates.description);
        }
        if (updates.materialOrders !== undefined) {
          fields.push("material_orders = ?");
          args.push(JSON.stringify(updates.materialOrders));
        }

        for (const [key, column] of Object.entries({
          siteContactPhone: "site_contact_phone", postColor: "post_color",
          boardColor: "board_color", drawingAssignee: "drawing_assignee",
        })) {
          if (updates[key] !== undefined) { fields.push(`${column} = ?`); args.push(updates[key]); }
        }

        if (fields.length > 0) {
          args.push(id);
          await executeMutation(`UPDATE bo_work_items SET ${fields.join(", ")} WHERE id = ?`, args);
        }

        if (updates.attachments !== undefined && Array.isArray(updates.attachments)) {
          await executeMutation("DELETE FROM bo_attachments WHERE work_item_id = ?", [id]);
          for (const att of updates.attachments) {
            await executeMutation(
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
      await ensureAsSchema();
      if ((updates.serviceType !== undefined && updates.serviceType !== "유상" && updates.serviceType !== "무상") || (updates.serviceType === "유상" && updates.paidReason !== "고객과실" && updates.paidReason !== "기간만료") || (updates.paidReason !== undefined && !["", "고객과실", "기간만료"].includes(updates.paidReason))) return NextResponse.json({ success: false, message: "유상/무상 구분과 유상 사유를 확인해주세요." }, { status: 400 });
      if (updates.serviceType === "무상") updates.paidReason = "";
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

        for (const [key, column] of Object.entries({
          clientName: "client_name", constructDate: "construct_date", siteAddress: "site_address",
          reason: "reason", contactPhone: "contact_phone", priority: "priority",
          installer: "installer", receivedDate: "received_date", asDate: "as_date",
          serviceType: "service_type", paidReason: "paid_reason",
        })) {
          if (updates[key] !== undefined) { fields.push(`${column} = ?`); args.push(updates[key]); }
        }

        if (fields.length > 0) {
          args.push(id);
          await executeMutation(`UPDATE bo_as_items SET ${fields.join(", ")} WHERE id = ?`, args);
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ success: false, message: "id and type are required" }, { status: 400 });
    }

    if (type === "work") {
      if (db) {
        const auth = await VERIFY(request);
        if (!auth.ok) return auth;
        const attachments = await executeQuery("SELECT url FROM bo_attachments WHERE work_item_id = ?", [id]);
        const comments = await executeQuery("SELECT images FROM bo_work_item_comments WHERE work_item_id = ?", [id]);
        if (!attachments.success || !comments.success) throw new Error("Photo lookup failed");
        const urls = attachments.rows.map(row => String(row.url || ""));
        for (const row of comments.rows) {
          const images = JSON.parse(String(row.images || "[]"));
          if (!Array.isArray(images)) throw new Error("Invalid photo data");
          urls.push(...images.filter((url): url is string => typeof url === "string"));
        }
        await deleteConstructionPhotos(urls);
        await executeMutation("DELETE FROM bo_attachments WHERE work_item_id = ?", [id]);
        await executeMutation("DELETE FROM bo_work_item_comments WHERE work_item_id = ?", [id]);
        await executeMutation("DELETE FROM bo_work_items WHERE id = ?", [id]);
      }
      serverStore.deleteWorkItem(id);
      return NextResponse.json({ success: true, message: "Deleted successfully" });
    } else if (type === "as") {
      if (db) {
        await executeMutation("DELETE FROM bo_as_items WHERE id = ?", [id]);
      }
      serverStore.deleteAsItem(id);
      return NextResponse.json({ success: true, message: "Deleted successfully" });
    }

    return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "삭제에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
  }
}
