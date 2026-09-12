import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { getDashboardMetrics } from "@/lib/dataStore";

export async function GET() {
  try {
    const workItems = serverStore.getWorkItems();
    const asItems = serverStore.getAsItems();
    const metrics = getDashboardMetrics(workItems, asItems);

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
