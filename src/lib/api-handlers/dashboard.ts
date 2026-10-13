import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { getDashboardMetrics } from "@/lib/dataStore";
import { db, executeQuery } from "@/lib/db";

export async function GET() {
  try {
    if(db) {
      const [work,service]=await Promise.all([
        executeQuery("SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('오피스','공장') THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='시공완료' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status='대기' THEN 1 ELSE 0 END) AS todo, SUM(CASE WHEN status='준비완료' THEN 1 ELSE 0 END) AS ready FROM bo_work_items"),
        executeQuery("SELECT COUNT(*) AS urgent FROM bo_as_items WHERE priority='긴급' AND result_status!='완료'"),
      ]);
      if(!work.success || !service.success) throw new Error("통계 조회 실패");
      const row=work.rows[0],total=Number(row?.total || 0);
      return NextResponse.json({success:true,data:{totalProjects:total,inProgressTasks:Number(row?.active || 0),urgentAsCount:Number(service.rows[0]?.urgent || 0),completionRate:total ? Math.round(Number(row?.completed || 0)/total*100) : 0,todoCount:Number(row?.todo || 0),readyCount:Number(row?.ready || 0)}});
    }
    const workItems = serverStore.getWorkItems();
    const asItems = serverStore.getAsItems();
    const metrics = getDashboardMetrics(workItems, asItems);

    return NextResponse.json({
      success: true,
      data: {totalProjects:metrics.totalProjects,inProgressTasks:metrics.inProgressTasks,urgentAsCount:metrics.urgentAsCount,completionRate:metrics.completionRate,todoCount:metrics.kanban.todo.length,readyCount:metrics.kanban.ready.length},
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
