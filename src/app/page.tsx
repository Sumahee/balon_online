"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Wrench,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Calculator,
  Images,
  Layers,
  ChevronRight,
  ListTodo,
  CalendarDays,
  Plus,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { GanttChart } from "@/components/dashboard/GanttChart";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";

export default function DashboardPage() {
  const { workItems, asItems, metrics, setQuickModalType } = useData();
  const [showGantt, setShowGantt] = useState(false);

  const urgentAsList = asItems.filter(
    (item) => item.priority === "긴급" && item.resultStatus !== "완료"
  );

  return (
    <div className="space-y-7">
      {/* Welcome & System Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              바론 INT 실시간 통합 관제
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              바론 온라인 가구 공정 & A/S 대시보드
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              실측부터 맞춤 제작, 현장 시공, 그리고 A/S 유지보수까지 모든 가구 제조 공정을 한눈에 파악하고 효율적으로 조율합니다.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setQuickModalType("work")}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>새 업무 등록</span>
            </button>
            <Link
              href="/drawer"
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>서랍장 자동화 툴</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">전체 등록 프로젝트</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {metrics.totalProjects}
            </span>
            <span className="text-xs text-slate-400 font-medium">건 진행 관리 중</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              제작 {workItems.filter((w) => w.category === "제작").length} / 시공{" "}
              {workItems.filter((w) => w.category === "시공").length} / 설계{" "}
              {workItems.filter((w) => w.category === "설계").length}
            </span>
            <Link href="/work" className="text-blue-600 hover:underline flex items-center gap-0.5">
              목록보기 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">진행 중인 공정 (In Progress)</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {metrics.inProgressTasks}
            </span>
            <span className="text-xs text-slate-400 font-medium">건 가동 중</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>대기 중 {metrics.kanban.todo.length}건 대기</span>
            <span className="text-amber-600 font-medium">집중 공정 관리</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">긴급 대응 A/S</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {metrics.urgentAsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">건 즉시 조치 필요</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>미처리 누적 AS {asItems.filter(a => a.resultStatus !== "완료").length}건</span>
            <Link href="/as" className="text-rose-600 hover:underline flex items-center gap-0.5 font-bold">
              접수확인 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">전체 공정 달성률</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {metrics.completionRate}%
            </span>
            <span className="text-xs text-slate-400 font-medium">준비완료 {metrics.kanban.ready.length}건</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Urgent A/S Alert Card (if any urgent ticket) */}
      {urgentAsList.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-lg mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-900 text-sm">긴급 A/S 조치 요망 현장</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 font-bold">
                  {urgentAsList.length}건 미결
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                {urgentAsList[0].clientName} ({urgentAsList[0].siteAddress}) : &quot;
                {urgentAsList[0].reason}&quot;
              </p>
            </div>
          </div>
          <Link
            href="/as"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>A/S 현장 조치 처리하기</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Kanban Board Section (Primary & Top View) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <span>현장 공정 칸반 보드 (Kanban Cards)</span>
            </h3>
            <span className="text-xs text-slate-500 hidden md:inline">
              (상태 클릭/드래그하여 대기 → 진행 → 시공 완료 관리)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGantt(!showGantt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                showGantt
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              <span>간트 차트 {showGantt ? "접기 ✕" : "보기 (옵션)"}</span>
            </button>

            <Link
              href="/work"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
            >
              <span>업무 전체 관리</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <KanbanBoard items={workItems} />
      </section>

      {/* Optional Gantt Chart Section (Shown only when turned on) */}
      {showGantt && (
        <section className="space-y-3 pt-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-bold text-indigo-950">
                전체 현장 공정 타임라인 (간트 차트 옵션)
              </h3>
            </div>
            <button
              onClick={() => setShowGantt(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer px-2 py-1 bg-white rounded-md border border-indigo-200 shadow-2xs"
            >
              차트 접기 ✕
            </button>
          </div>
          <GanttChart items={workItems} />
        </section>
      )}

      {/* Quick Shortcuts to Core Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Link
          href="/drawer"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
              서랍장 규격 자동 산출
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              가구 외경(W×H×D) 및 15T/18T 판재 기준 부속별 재단 치수와 레일 부자재 규격을 자동 산출합니다.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
            <span>계산기 실행하기</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/gallery"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Images className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
              바론 시공 이미지 아카이브
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              현장별/자재별 폴더 계층 구조와 고화질 시공 갤러리, 상세 라이트박스 확대 보기를 제공합니다.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
            <span>갤러리 바로가기</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/materials"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400 transition group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
              합판 자재 샘플 라이브러리
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              PET 무광 도어, LPM 우드그레인, HPM 석재 질감 등 바론 INT 가구 자재 스펙을 탐색합니다.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
            <span>자재 샘플 확인</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>
    </div>
  );
}
