"use client";

import React, { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { OnlinePurchaseItem } from "@/types";
import {
  ShoppingBag,
  Plus,
  Search,
  Grid,
  List as ListIcon,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Maximize2,
  Upload,
  Store,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PurchasesPage() {
  const { purchaseItems, addPurchaseItem, updatePurchaseItem, deletePurchaseItem } = useData();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMall, setSelectedMall] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OnlinePurchaseItem | null>(null);

  // Lightbox Modal State
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Form State
  const [formData, setFormData] = useState<{
    mallName: string;
    storeName: string;
    itemName: string;
    sizeSpec: string;
    color: string;
    quantity: number;
    unitPrice: string;
    purchaseDate: string;
    searchKeyword: string;
    notes: string;
    photos: string[];
  }>({
    mallName: "",
    storeName: "",
    itemName: "",
    sizeSpec: "",
    color: "",
    quantity: 1,
    unitPrice: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    searchKeyword: "",
    notes: "",
    photos: [],
  });

  // Extract unique shopping malls for filter dropdown
  const uniqueMalls = useMemo(() => {
    const malls = new Set(purchaseItems.map((item) => item.mallName).filter(Boolean));
    return Array.from(malls);
  }, [purchaseItems]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return purchaseItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mallName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.searchKeyword && item.searchKeyword.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMall = selectedMall === "all" || item.mallName === selectedMall;

      return matchesSearch && matchesMall;
    });
  }, [purchaseItems, searchTerm, selectedMall]);

  // Total calculated statistics
  const totalCount = purchaseItems.length;
  const totalWithPhotos = purchaseItems.filter((i) => i.photos && i.photos.length > 0).length;

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      mallName: "",
      storeName: "",
      itemName: "",
      sizeSpec: "",
      color: "",
      quantity: 1,
      unitPrice: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      searchKeyword: "",
      notes: "",
      photos: [],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: OnlinePurchaseItem) => {
    setEditingItem(item);
    setFormData({
      mallName: item.mallName || "",
      storeName: item.storeName || "",
      itemName: item.itemName || "",
      sizeSpec: item.sizeSpec || "",
      color: item.color || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || "",
      purchaseDate: item.purchaseDate || new Date().toISOString().split("T")[0],
      searchKeyword: item.searchKeyword || "",
      notes: item.notes || "",
      photos: item.photos || [],
    });
    setIsModalOpen(true);
  };

  // Handle Photo Upload (Convert file to Base64 data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, result],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove Photo from Form
  const handleRemovePhoto = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      alert("품목명을 입력해주세요.");
      return;
    }

    if (editingItem) {
      updatePurchaseItem(editingItem.id, formData);
    } else {
      addPurchaseItem(formData);
    }

    setIsModalOpen(false);
  };

  // Delete Handler
  const handleDelete = (id: string, itemName: string) => {
    if (confirm(`'${itemName}' 구매 내역을 삭제하시겠습니까?`)) {
      deletePurchaseItem(id);
    }
  };

  // Lightbox Trigger
  const openLightbox = (photos: string[], index: number = 0) => {
    setLightboxImages(photos);
    setActiveImageIndex(index);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Internet Procurement Management</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            인터넷 자재구매 목록
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            온라인 쇼핑몰(네이버, 쿠팡, 포장자재몰 등)에서 구매한 부자재, 테이프, 포장재 등의 구매 이력 및 실물 사진을 모아 한눈에 관리합니다.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>신규 구매 등록</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">전체 구매 건수</p>
            <p className="text-xl font-extrabold text-slate-900">{totalCount} <span className="text-xs font-normal text-slate-500">건</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">등록 쇼핑몰 수</p>
            <p className="text-xl font-extrabold text-slate-900">{uniqueMalls.length} <span className="text-xs font-normal text-slate-500">개처</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">사진 보유 품목</p>
            <p className="text-xl font-extrabold text-slate-900">{totalWithPhotos} <span className="text-xs font-normal text-slate-500">건</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">최근 업데이트</p>
            <p className="text-sm font-bold text-slate-800">
              {purchaseItems.length > 0 ? purchaseItems[0].purchaseDate : "없음"}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Mall Filter, View Switcher */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="품목명, 상호, 쇼핑몰, 검색어 등 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mall Filter Dropdown */}
          <select
            value={selectedMall}
            onChange={(e) => setSelectedMall(e.target.value)}
            className="py-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 쇼핑몰 ({purchaseItems.length})</option>
            {uniqueMalls.map((mall) => (
              <option key={mall} value={mall}>
                {mall}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition",
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>엑셀 테이블</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition",
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>카드형</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">등록된 인터넷 구매 내역이 없습니다</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchTerm || selectedMall !== "all"
              ? "검색 조건에 일치하는 결과가 없습니다. 필터를 변경해보세요."
              : "+ 신규 구매 등록 버튼을 눌러 첫 번째 구매 정보를 등록하세요."}
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* Excel Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">쇼핑몰</th>
                  <th className="py-3.5 px-4">상호</th>
                  <th className="py-3.5 px-4">품목</th>
                  <th className="py-3.5 px-4">사이즈</th>
                  <th className="py-3.5 px-4">색상</th>
                  <th className="py-3.5 px-4 text-center">수량</th>
                  <th className="py-3.5 px-4">금액 / 단가</th>
                  <th className="py-3.5 px-4">구매날짜</th>
                  <th className="py-3.5 px-4">검색방법</th>
                  <th className="py-3.5 px-4">기타 (비고)</th>
                  <th className="py-3.5 px-4 text-center">사진</th>
                  <th className="py-3.5 px-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const hasPhotos = item.photos && item.photos.length > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 쇼핑몰업체 */}
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.mallName || "온라인몰"}
                        </span>
                      </td>

                      {/* 상호 */}
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {item.storeName}
                      </td>

                      {/* 품목 */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.itemName}
                      </td>

                      {/* 사이즈 */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {item.sizeSpec || "-"}
                      </td>

                      {/* 색상 */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {item.color ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.color}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* 수량 */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {item.quantity}
                      </td>

                      {/* 금액/단가 */}
                      <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">
                        {item.unitPrice || "-"}
                      </td>

                      {/* 구매날짜 */}
                      <td className="py-3 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {item.purchaseDate}
                      </td>

                      {/* 검색방법 */}
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {item.searchKeyword ? (
                          <span className="text-blue-600 underline underline-offset-2">
                            {item.searchKeyword}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* 기타 (비고) */}
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {item.notes || "-"}
                      </td>

                      {/* 사진 썸네일 */}
                      <td className="py-3 px-4 text-center">
                        {hasPhotos ? (
                          <button
                            onClick={() => openLightbox(item.photos!)}
                            className="relative group inline-block rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:border-blue-500 transition cursor-pointer"
                          >
                            <img
                              src={item.photos![0]}
                              alt={item.itemName}
                              className="w-10 h-10 object-cover group-hover:scale-110 transition-transform"
                            />
                            {item.photos!.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 rounded-tl">
                                +{item.photos!.length - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.itemName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const hasPhotos = item.photos && item.photos.length > 0;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col overflow-hidden group"
              >
                {/* Card Image Header */}
                {hasPhotos ? (
                  <div
                    onClick={() => openLightbox(item.photos!)}
                    className="relative h-44 bg-slate-900 cursor-pointer overflow-hidden group/img"
                  >
                    <img
                      src={item.photos![0]}
                      alt={item.itemName}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold bg-white/90 text-slate-900 shadow-xs backdrop-blur-xs">
                      {item.mallName}
                    </span>
                    <button className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition backdrop-blur-xs">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
                      <span>{item.storeName}</span>
                      <span>{item.purchaseDate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {item.mallName}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{item.purchaseDate}</span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 text-lg leading-snug">
                        {item.itemName}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{item.storeName}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-medium">규격 / 사이즈</span>
                        <span className="font-bold text-slate-800">{item.sizeSpec || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">색상</span>
                        <span className="font-bold text-slate-800">{item.color || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">수량</span>
                        <span className="font-bold text-slate-800">{item.quantity} 개</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">단가/금액</span>
                        <span className="font-bold text-emerald-600">{item.unitPrice || "-"}</span>
                      </div>
                    </div>

                    {item.searchKeyword && (
                      <div className="mt-3 text-xs text-slate-600">
                        <span className="font-semibold text-slate-400 mr-1.5">검색어:</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                          {item.searchKeyword}
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                        <span className="font-semibold text-slate-600">기타:</span> {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>수정</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.itemName)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {editingItem ? "구매 정보 수정" : "신규 인터넷 구매 등록"}
                </h3>
                <p className="text-xs text-slate-500">
                  쇼핑몰에서 구매한 자재의 상세 항목 10가지 및 실물 사진을 입력합니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 쇼핑몰업체 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    쇼핑몰업체 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 스마트스토어, 쿠팡, 포장자재몰"
                    value={formData.mallName}
                    onChange={(e) => setFormData({ ...formData, mallName: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* 상호 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    상호 (스토어명) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: N테이프, 장갑나라, 구오공식물"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 품목 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  품목명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 벤딩끈 / pp자동밴드 (반자동, 자동 겸용)"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 사이즈 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">사이즈</label>
                  <input
                    type="text"
                    placeholder="예: 15mm * 750m"
                    value={formData.sizeSpec}
                    onChange={(e) => setFormData({ ...formData, sizeSpec: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* 색상 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">색상</label>
                  <input
                    type="text"
                    placeholder="예: 옐로우, 투명, 백색"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* 수량 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 금액/단가 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">금액 / 단가</label>
                  <input
                    type="text"
                    placeholder="예: 개당 11,400원 (박스당 182,400원)"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-emerald-600"
                  />
                </div>

                {/* 구매날짜 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">구매날짜</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 검색방법 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  검색방법 (재구매 키워드)
                </label>
                <input
                  type="text"
                  placeholder="예: 보호테이프50mm 검색 후 N테이프 스토어 선택"
                  value={formData.searchKeyword}
                  onChange={(e) => setFormData({ ...formData, searchKeyword: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-600"
                />
              </div>

              {/* 기타 (비고) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">기타 (비고)</label>
                <textarea
                  rows={2}
                  placeholder="예: 중국산 / 박스당 16개 / 배송 2일 소요"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  상품 / 자재 실물 사진
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {formData.photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <img src={photo} alt="자재 사진" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-red-600 transition opacity-90 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition text-slate-400 hover:text-blue-600">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">사진 첨부</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 text-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  {editingItem ? "수정 완료" : "구매 등록 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Viewer Modal */}
      {lightboxImages && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
            <span className="text-sm font-semibold">
              사진 {activeImageIndex + 1} / {lightboxImages.length}
            </span>
            <button
              onClick={() => setLightboxImages(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image */}
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center">
            <img
              src={lightboxImages[activeImageIndex]}
              alt="확대 사진"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Thumbnail Strip */}
          {lightboxImages.length > 1 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto max-w-xl p-2 bg-black/50 rounded-xl">
              {lightboxImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={cn(
                    "w-14 h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer",
                    activeImageIndex === idx ? "border-blue-500 scale-105" : "border-transparent opacity-60"
                  )}
                >
                  <img src={img} alt="썸네일" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
