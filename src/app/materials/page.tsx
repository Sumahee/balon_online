"use client";

import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  Compass,
  FileCheck,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { MaterialSample } from "@/types";
import { cn } from "@/lib/utils";

export default function MaterialsPage() {
  const { materials } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["전체", "PET", "LPM", "HPM", "원목/무늬목", "엣지밴딩"];

  const filteredMaterials = materials.filter((m) => {
    const matchesCat = selectedCategory === "전체" || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  합판 자재 샘플 라이브러리 (Materials Catalog)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  확장 준비 중 (Beta)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                바론 INT 친환경 가구 원자재(PET, LPM, HPM, 무늬목, 엣지) 규격 및 물성 데이터베이스입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Future Expansion Announcement Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Phase 2 자동 연동 모듈 준비 중</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold">
              스마트 자재 재고 & CNC 판재 네스팅(Nesting) 최적화 연동 예정
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              현재는 바론 표준 자재 샘플 카탈로그로 운영되며, 추후 Turso DB 및 공장 재단 쏘(Saw) CNC 시스템과 연동되어 실시간 판재 잔여 재고 확인 및 네스팅 수율 계산 기능이 탑재될 예정입니다.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold border border-white/20 text-slate-200">
              API: /api/materials 연동 완료
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap",
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/60"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="자재명, 코드, 제조사 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMaterials.map((mat) => (
          <div
            key={mat.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
          >
            {/* Color/Texture Swatch Header */}
            <div
              className="h-28 relative flex items-end p-4 border-b border-slate-100"
              style={{
                backgroundColor: mat.colorHex,
              }}
            >
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-slate-800 shadow-xs backdrop-blur-xs">
                  {mat.category}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs",
                    mat.inStock
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-500 text-white"
                  )}
                >
                  {mat.inStock ? "재고 보유" : "발주 필요"}
                </span>
              </div>

              <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-xs font-mono font-bold text-slate-800 shadow-xs">
                {mat.code}
              </div>
            </div>

            {/* Material Body Info */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{mat.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mat.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">제조/공급사:</span>
                  <span className="font-semibold text-slate-800">{mat.manufacturer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">규격 두께:</span>
                  <span className="font-semibold text-slate-800">{mat.thickness}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">표면 마감/질감:</span>
                  <span className="font-semibold text-indigo-600">{mat.finish}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
