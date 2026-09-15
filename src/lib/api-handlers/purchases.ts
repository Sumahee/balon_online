import { NextRequest, NextResponse } from "next/server";
import { executeQuery, db } from "@/lib/db";
import { OnlinePurchaseItem } from "@/types";
import { initialPurchaseItems } from "@/lib/dataStore";

/**
 * 인터넷 자재구매 정보 API Handler
 */
export async function GET() {
  try {
    if (db) {
      // Create table if not exists defensively
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS bo_online_purchases (
          id TEXT PRIMARY KEY,
          mall_name TEXT NOT NULL,
          store_name TEXT NOT NULL,
          item_name TEXT NOT NULL,
          size_spec TEXT,
          color TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price TEXT,
          total_price INTEGER DEFAULT 0,
          purchase_date TEXT NOT NULL,
          search_keyword TEXT,
          notes TEXT,
          photos TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const res = await executeQuery("SELECT * FROM bo_online_purchases ORDER BY purchase_date DESC, created_at DESC");
      if (res.success && res.rows && res.rows.length > 0) {
        const purchases: OnlinePurchaseItem[] = res.rows.map((row: any) => ({
          id: row.id,
          mallName: row.mall_name,
          storeName: row.store_name,
          itemName: row.item_name,
          sizeSpec: row.size_spec || undefined,
          color: row.color || undefined,
          quantity: Number(row.quantity || 1),
          unitPrice: row.unit_price || undefined,
          totalPrice: Number(row.total_price || 0),
          purchaseDate: row.purchase_date,
          searchKeyword: row.search_keyword || undefined,
          notes: row.notes || undefined,
          photos: row.photos ? JSON.parse(row.photos) : undefined,
          createdAt: row.created_at,
        }));
        return NextResponse.json({ success: true, data: purchases });
      }
    }

    // Fallback to sample data if DB is empty or not connected
    return NextResponse.json({ success: true, data: initialPurchaseItems, isMock: !db });
  } catch (error: any) {
    console.error("[Purchases API GET Error]:", error);
    return NextResponse.json({ success: false, data: initialPurchaseItems, error: error.message });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      mallName,
      storeName,
      itemName,
      sizeSpec,
      color,
      quantity,
      unitPrice,
      totalPrice,
      purchaseDate,
      searchKeyword,
      notes,
      photos,
    } = body;

    const itemId = id || `pur-${Date.now()}`;
    const date = purchaseDate || new Date().toISOString().split("T")[0];
    const photosJson = photos && photos.length > 0 ? JSON.stringify(photos) : null;

    if (db) {
      const sql = `
        INSERT INTO bo_online_purchases (
          id, mall_name, store_name, item_name, size_spec, color, quantity, unit_price, total_price, purchase_date, search_keyword, notes, photos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const res = await executeQuery(sql, [
        itemId,
        mallName || "스마트스토어",
        storeName || "기타상호",
        itemName || "자재품목",
        sizeSpec || "",
        color || "",
        Number(quantity || 1),
        unitPrice || "",
        Number(totalPrice || 0),
        date,
        searchKeyword || "",
        notes || "",
        photosJson,
      ]);

      if (!res.success) {
        throw new Error(res.error || "Failed to insert purchase record into DB");
      }
    }

    return NextResponse.json({
      success: true,
      message: "인터넷 자재구매 내역이 등록되었습니다.",
      id: itemId,
    });
  } catch (error: any) {
    console.error("[Purchases API POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      mallName,
      storeName,
      itemName,
      sizeSpec,
      color,
      quantity,
      unitPrice,
      totalPrice,
      purchaseDate,
      searchKeyword,
      notes,
      photos,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing purchase id" }, { status: 400 });
    }

    const photosJson = photos ? JSON.stringify(photos) : null;

    if (db) {
      const sql = `
        UPDATE bo_online_purchases SET
          mall_name = ?,
          store_name = ?,
          item_name = ?,
          size_spec = ?,
          color = ?,
          quantity = ?,
          unit_price = ?,
          total_price = ?,
          purchase_date = ?,
          search_keyword = ?,
          notes = ?,
          photos = ?
        WHERE id = ?
      `;
      await executeQuery(sql, [
        mallName,
        storeName,
        itemName,
        sizeSpec || "",
        color || "",
        Number(quantity || 1),
        unitPrice || "",
        Number(totalPrice || 0),
        purchaseDate,
        searchKeyword || "",
        notes || "",
        photosJson,
        id,
      ]);
    }

    return NextResponse.json({ success: true, message: "구매 내역이 수정되었습니다." });
  } catch (error: any) {
    console.error("[Purchases API PUT Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
    }

    if (db) {
      await executeQuery("DELETE FROM bo_online_purchases WHERE id = ?", [id]);
    }

    return NextResponse.json({ success: true, message: "구매 내역이 삭제되었습니다." });
  } catch (error: any) {
    console.error("[Purchases API DELETE Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
