import { NextResponse } from "next/server";
import { VERIFY } from "./auth";
import { getStorageUsage } from "@/lib/r2-storage";

export async function GET(request: Request) {
  const auth = await VERIFY(request);
  if (!auth.ok) return auth;
  try {
    return NextResponse.json({ success: true, data: await getStorageUsage() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, message: "저장 용량을 확인하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
