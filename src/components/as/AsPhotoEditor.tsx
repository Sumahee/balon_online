"use client";

import { useRef, useState } from "react";
import { PhotoImage } from "@/components/common/PhotoImage";
import { PhotoInputArea } from "@/components/common/PhotoInputArea";
import { compressPhoto, readPhotoFile } from "@/lib/photo-compression";
import { AS_PHOTO_BYTES, AS_PHOTO_COUNT } from "@/lib/as-photos";

interface Props {
  label: string;
  photos: string[];
  disabled?: boolean;
  onChange: (photos: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}

export function AsPhotoEditor({ label, photos, disabled, onChange, onBusyChange }: Props) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function add(files: File[]) {
    if (!files.length || disabled || lock.current) return;
    setError("");
    if (photos.length + files.length > AS_PHOTO_COUNT) { setError(`${label}은 최대 ${AS_PHOTO_COUNT}장까지 첨부할 수 있습니다.`); return; }
    lock.current = true; setBusy(true); onBusyChange(true);
    try {
      const added: string[] = [];
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 25 * 1024 * 1024) throw new Error("25MB 이하 JPEG·PNG·WebP 사진을 선택해주세요.");
        added.push(await compressPhoto(await readPhotoFile(file), AS_PHOTO_BYTES));
      }
      onChange([...photos, ...added]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "사진을 준비하지 못했습니다. 다시 선택해주세요."); }
    finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  return <section className="space-y-2 rounded-xl border border-slate-200 p-3">
    <h4 className="text-sm font-semibold text-slate-800">{label} · {photos.length}/{AS_PHOTO_COUNT}장</h4>
    <PhotoInputArea label={label} disabled={disabled || busy} onFiles={add}>
      <label className="block text-xs text-slate-600">{label} 파일 선택
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label={`${label} 파일 선택`} disabled={disabled || busy} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; void add(files); }} className="mt-1 block w-full min-w-0 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 disabled:opacity-50" />
      </label>
      <p className="text-xs text-slate-500">사진은 자동 압축되며, 접수 또는 수정 저장을 눌러야 보관됩니다.</p>
      {busy && <p role="status" className="text-xs text-blue-700">사진 준비 중…</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-2">{photos.map((src, index) => <div key={`${index}-${src.slice(-40)}`} className="w-20 space-y-1">
        <PhotoImage src={src} alt={`${label} ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
        <button type="button" disabled={disabled || busy} onClick={() => onChange(photos.filter((_, i) => i !== index))} aria-label={`${label} ${index + 1} 제거`} className="w-full rounded border border-rose-200 py-1 text-xs text-rose-700 disabled:opacity-50">제거</button>
      </div>)}</div>
    </PhotoInputArea>
  </section>;
}
