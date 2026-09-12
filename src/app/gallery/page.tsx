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
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { GalleryImage, GalleryFolder } from "@/types";
import { cn } from "@/lib/utils";

export default function GalleryPage() {
  const { folders, images, addFolder, addImage, deleteImage } = useData();

  const [selectedFolderId, setSelectedFolderId] = useState<string>("folder-all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Folder creation modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSiteName, setUploadSiteName] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered images
  const filteredImages =
    selectedFolderId === "folder-all"
      ? images
      : images.filter((img) => img.folderId === selectedFolderId);

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

    const targetFolder = selectedFolderId === "folder-all" ? "folder-1" : selectedFolderId;
    const tagsArray = uploadTags
      ? uploadTags.split(",").map((t) => t.trim()).filter(Boolean)
      : ["현장시공", "바론"];

    await addImage({
      folderId: targetFolder,
      title: uploadTitle,
      url: uploadPreview,
      siteName: uploadSiteName || "바론 INT 시공 현장",
      tags: tagsArray,
      dimensions: "2400 x 1600",
      size: "2.4 MB",
    });

    setUploadPreview(null);
    setUploadTitle("");
    setUploadSiteName("");
    setUploadTags("");
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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Images className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                바론 이미지 모음 (Gallery Archive)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                현장 시공 실적, 디테일 마감 사진, 자재 레퍼런스를 폴더별로 아카이빙합니다.
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
            <span>사진 업로드</span>
          </button>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">저장할 폴더</label>
                  <select
                    value={selectedFolderId === "folder-all" ? "folder-1" : selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {folders
                      .filter((f) => f.id !== "folder-all")
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  태그 입력 (쉼표 구분)
                </label>
                <input
                  type="text"
                  placeholder="예: 주방가구, 언더레일, 댐핑, 세라믹"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  아카이브 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
