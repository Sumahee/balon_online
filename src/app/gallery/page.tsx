"use client";

import React, { useState, useRef } from "react";
import {
  Images,
  FolderPlus,
  Folder,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Tag,
  Maximize2,
  Plus,
  Building,
  Image as ImageIcon,
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { GalleryImage, GalleryFolder } from "@/types";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
  const { folders, images, addFolder, addImage, deleteImage } = useData();

  const [selectedFolderId, setSelectedFolderId] = useState<string>("folder-all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Search & Attribute Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [hasMirror, setHasMirror] = useState<boolean | null>(null);
  const [hasDrawer, setHasDrawer] = useState<boolean | null>(null);

  // Folder creation modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSiteName, setUploadSiteName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("주방가구");
  const [uploadColor, setUploadColor] = useState("화이트");
  const [uploadHasMirror, setUploadHasMirror] = useState(false);
  const [uploadHasDrawer, setUploadHasDrawer] = useState(true);
  const [uploadCustomTags, setUploadCustomTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter types & colors
  const TYPES = ["전체", "주방가구", "아일랜드", "붙박이장", "수납장", "신발장", "기타"];
  const COLORS = ["전체", "화이트", "그레이", "우드/원목", "다크/블랙", "세라믹"];

  // Filtered images with Tag & Attribute Search
  const filteredImages = images.filter((img) => {
    // Folder filter
    if (selectedFolderId !== "folder-all" && img.folderId !== selectedFolderId) {
      return false;
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = img.title.toLowerCase().includes(q);
      const matchSite = img.siteName?.toLowerCase().includes(q) || false;
      const matchTags = img.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSite && !matchTags) return false;
    }

    // Type filter
    if (selectedType !== "all" && selectedType !== "전체") {
      const matchType = img.tags.includes(selectedType) || img.title.includes(selectedType);
      if (!matchType) return false;
    }

    // Color filter
    if (selectedColor !== "all" && selectedColor !== "전체") {
      const colorKey = selectedColor.split("/")[0];
      const matchColor = img.tags.some((t) => t.includes(colorKey)) || img.title.includes(colorKey);
      if (!matchColor) return false;
    }

    // Mirror filter
    if (hasMirror === true) {
      const matchMirror = img.tags.some((t) => t.includes("거울")) || img.title.includes("거울");
      if (!matchMirror) return false;
    }

    // Drawer filter
    if (hasDrawer === true) {
      const matchDrawer = img.tags.some((t) => t.includes("서랍")) || img.title.includes("서랍");
      if (!matchDrawer) return false;
    }

    return true;
  });

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName.trim(), newFolderDesc.trim());
    setNewFolderName("");
    setNewFolderDesc("");
    setShowFolderModal(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPreview || !uploadTitle.trim()) {
      alert("이미지와 사진 제목을 입력해 주세요.");
      return;
    }

    // Auto folder classification: Match category to existing folder or use selected
    let targetFolderId = selectedFolderId === "folder-all" ? "folder-1" : selectedFolderId;
    const matchedFolder = folders.find((f) => f.name.includes(uploadCategory));
    if (matchedFolder) {
      targetFolderId = matchedFolder.id;
    }

    // Auto-generate tags based on drawing/item attributes
    const autoTags: string[] = [
      uploadCategory,
      uploadColor,
      uploadHasMirror ? "거울포함" : "거울없음",
      uploadHasDrawer ? "서랍장포함" : "서랍장없음",
    ];

    if (uploadCustomTags) {
      const extra = uploadCustomTags.split(",").map((t) => t.trim()).filter(Boolean);
      autoTags.push(...extra);
    }

    await addImage({
      folderId: targetFolderId,
      title: uploadTitle,
      url: uploadPreview,
      siteName: uploadSiteName || "바론 INT 시공 현장",
      tags: Array.from(new Set(autoTags)),
      dimensions: "2400 x 1600",
      size: "2.4 MB",
    });

    setUploadPreview(null);
    setUploadTitle("");
    setUploadSiteName("");
    setUploadCustomTags("");
    setShowUploadModal(false);
  };

  const currentLightboxImage =
    lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const handleNextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredImages.length);
    }
  };

  const handlePrevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(
        (lightboxIndex - 1 + filteredImages.length) % filteredImages.length
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Images className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span>시공 사진 아카이브 & 스마트 태그 검색</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  자동 태그 분류
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                현장 시공 사진, 컬러/타입별 자재 마감, 거울/서랍장 옵션 태그 기반 스마트 탐색
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>새 폴더 생성</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>사진 업로드 (자동 태그)</span>
          </button>
        </div>
      </div>

      {/* 🔍 Smart Tag & Attribute Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Text & Tag Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="태그(#반포, #일산, #화이트, #서랍장), 현장명, 프로젝트 제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Toggle Filter Buttons: Mirror & Drawer */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setHasMirror((prev) => (prev === true ? null : true))}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shrink-0",
                hasMirror === true
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <span>🪞 거울 포함</span>
              {hasMirror === true && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setHasDrawer((prev) => (prev === true ? null : true))}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shrink-0",
                hasDrawer === true
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <span>🗄️ 서랍장 포함</span>
              {hasDrawer === true && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Type & Color Sub-Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-400 shrink-0">타입:</span>
            {TYPES.map((type) => {
              const isSel = (type === "전체" && selectedType === "all") || selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type === "전체" ? "all" : type)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs",
                    isSel
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Color Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-400 shrink-0">컬러:</span>
            {COLORS.map((col) => {
              const isSel = (col === "전체" && selectedColor === "all") || selectedColor === col;
              return (
                <button
                  key={col}
                  onClick={() => setSelectedColor(col === "전체" ? "all" : col)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs",
                    isSel
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  )}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* Folder Tabs / Hierarchy Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          const count =
            folder.id === "folder-all"
              ? images.length
              : images.filter((img) => img.folderId === folder.id).length;

          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Folder className={cn("w-3.5 h-3.5", isSelected ? "text-blue-400" : "text-slate-400")} />
              <span>{folder.name}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Folder Description Info */}
      {activeFolder && activeFolder.description && (
        <div className="text-xs text-slate-500 flex items-center gap-2 px-1">
          <span className="font-semibold text-slate-700">{activeFolder.name}:</span>
          <span>{activeFolder.description}</span>
        </div>
      )}

      {/* Photo Gallery Grid */}
      {filteredImages.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-slate-100 rounded-full text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-700">이 폴더에 저장된 사진이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">
              상단의 &apos;사진 업로드&apos; 버튼을 눌러 시공 사진을 등록해 보세요.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
          >
            사진 등록하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img, idx) => (
            <div
              key={img.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => setLightboxIndex(idx)}
                className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="p-2.5 rounded-full bg-white/90 text-slate-900 shadow-md transform scale-90 group-hover:scale-100 transition">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>

                {/* Size pill */}
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md font-mono">
                  {img.size}
                </span>
              </div>

              {/* Card Meta */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3
                    onClick={() => setLightboxIndex(idx)}
                    className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-1 cursor-pointer"
                  >
                    {img.title}
                  </h3>
                  {img.siteName && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{img.siteName}</span>
                    </p>
                  )}
                </div>

                {/* Tags and Delete */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex flex-wrap gap-1">
                    {img.tags.slice(0, 2).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`'${img.title}' 사진을 삭제하시겠습니까?`)) {
                        deleteImage(img.id);
                      }
                    }}
                    className="p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {currentLightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev button */}
          <button
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next button */}
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-50 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Central Stage */}
          <div className="max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4">
            <div className="relative max-h-[75vh] overflow-hidden rounded-xl shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentLightboxImage.url}
                alt={currentLightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>

            {/* Bottom Details Panel */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white px-6 py-3 rounded-xl flex items-center justify-between w-full max-w-2xl text-xs">
              <div>
                <h4 className="font-bold text-sm text-white">{currentLightboxImage.title}</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  현장: {currentLightboxImage.siteName} | 등록일: {currentLightboxImage.createdAt} | 해상도:{" "}
                  {currentLightboxImage.dimensions}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentLightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <span>새 폴더 만들기</span>
              </h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  폴더 이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 2026 하반기 오피스 가구 시공"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">폴더 설명</label>
                <input
                  type="text"
                  placeholder="예: 성수동 및 판교 오피스 라운지 맞춤 가구"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  폴더 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Image Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span>시공 사진 아카이빙 업로드</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {uploadPreview ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="max-h-40 mx-auto rounded-lg object-contain border border-slate-200 shadow-2xs"
                    />
                    <p className="text-xs text-blue-600 font-semibold">
                      클릭하여 다른 사진으로 변경
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-500">
                    <UploadCloud className="w-10 h-10 mx-auto text-slate-400" />
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-700">
                        사진을 이곳에 끌어다 놓거나 클릭하여 선택하세요.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        JPG, PNG, WebP 지원 (최대 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  사진 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 반포 원베일리 주방 아일랜드 서랍 마감"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    가구 분류 (자동 폴더 분류)
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="주방가구">주방가구</option>
                    <option value="아일랜드">아일랜드</option>
                    <option value="붙박이장">붙박이장</option>
                    <option value="수납장">수납장</option>
                    <option value="신발장">신발장</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">대표 컬러 / 마감</label>
                  <select
                    value={uploadColor}
                    onChange={(e) => setUploadColor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="화이트">화이트</option>
                    <option value="그레이">그레이 / 샌드</option>
                    <option value="우드">우드 / 원목</option>
                    <option value="다크">다크 / 블랙</option>
                    <option value="세라믹">세라믹 / 스톤</option>
                  </select>
                </div>
              </div>

              {/* Feature Options: Mirror & Drawer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="block text-xs font-bold text-slate-700">도면 사양 및 옵션 체크:</span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadHasMirror}
                      onChange={(e) => setUploadHasMirror(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>🪞 거울도어 포함</span>
                  </label>

                  <label className="flex items-center gap-1.5 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadHasDrawer}
                      onChange={(e) => setUploadHasDrawer(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"
                    />
                    <span>🗄️ 서랍장 포함</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">시공 현장명</label>
                <input
                  type="text"
                  placeholder="예: 서초구 반포 래미안 104동"
                  value={uploadSiteName}
                  onChange={(e) => setUploadSiteName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  추가 커스텀 태그 (쉼표 구분)
                </label>
                <input
                  type="text"
                  placeholder="예: 댐핑언더레일, 세라믹상판, 아일랜드"
                  value={uploadCustomTags}
                  onChange={(e) => setUploadCustomTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Auto Generated Tags Live Preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>자동 생성 태그 미리보기:</span>
                </span>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded">#{uploadCategory}</span>
                  <span className="bg-slate-800 text-white font-bold px-2 py-0.5 rounded">#{uploadColor}</span>
                  <span className={cn("font-bold px-2 py-0.5 rounded", uploadHasMirror ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600")}>
                    #{uploadHasMirror ? "거울포함" : "거울없음"}
                  </span>
                  <span className={cn("font-bold px-2 py-0.5 rounded", uploadHasDrawer ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-600")}>
                    #{uploadHasDrawer ? "서랍장포함" : "서랍장없음"}
                  </span>
                  {uploadCustomTags.split(",").map((t) => t.trim()).filter(Boolean).map((t, idx) => (
                    <span key={idx} className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  사진 아카이빙 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
