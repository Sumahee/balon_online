"use client";

import { PageHeader } from "@/components/common/PageHeader";

import React, { useState } from "react";
import {
  Search} from "lucide-react";
import { useData } from "@/context/DataContext";

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
      <PageHeader title="자재 샘플" description="소재와 색상, 규격을 비교하고 필요한 자재를 찾아보세요." />

      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">자재 샘플을 확인할 수 있습니다. 재고 및 재단 연동은 준비 중입니다.</p>

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
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/90 text-slate-800 shadow-xs backdrop-blur-xs">
                  {mat.category}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs",
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

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
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
