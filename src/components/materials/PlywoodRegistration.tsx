"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestApi } from "@/lib/api-client";
import type { PlywoodSample } from "@/lib/plywood-catalog";

export function PlywoodRegistration({ sample, onClose, onSaved }: { sample?: PlywoodSample; onClose: () => void; onSaved: (sample: PlywoodSample) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { user, token } = useAuth();
  const [name, setName] = useState(sample?.name || "");
  const [code, setCode] = useState(sample?.code || "");
  const [color, setColor] = useState(sample?.color || "#e7e2d8");
  const [image, setImage] = useState<string | null>(sample?.image || null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || reading) return;
    setBusy(true); setError("");
    try {
      const result = await requestApi<PlywoodSample>("/api/plywoods", { method: sample ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(sample ? { id: sample.id, image } : { name, code, color, image }) });
      if (!result.data) throw new Error("저장 결과를 확인할 수 없습니다.");
      onSaved(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "저장에 실패했습니다."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="plywood-register-title" className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
    <div className="mb-5 flex items-center justify-between"><h2 id="plywood-register-title" className="text-xl font-semibold">{sample ? "합판 이미지 수정" : "합판 수동 등록"}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="등록 닫기"><X size={20} /></button></div>
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-medium">합판명<input readOnly={!!sample} autoFocus required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" placeholder="예: 내추럴 오크" /></label>
      <label className="block text-sm font-medium">품번<input readOnly={!!sample} required maxLength={64} value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" placeholder="제조사 또는 사내 품번" /></label>
      <label className="block text-sm font-medium">샘플 이미지 <span className="font-normal text-slate-500">선택 · JPG/PNG/WebP, 최대 2MB</span><input disabled={reading || busy} type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        e.target.value = ""; setError("");
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("JPG, PNG, WebP 이미지 2MB 이하를 선택해 주세요."); return; }
        setReading(true);
        try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); setImage(data); setFileName(file.name); }
        catch { setError("이미지를 읽지 못했습니다."); } finally { setReading(false); }
      }} /></label>
      {image && <div><div role="img" aria-label="등록할 샘플 이미지" className="h-32 rounded-lg bg-slate-100 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${image}")` }} /><p className="mt-1 truncate text-xs text-slate-500">{fileName}</p><button type="button" className="mt-1 text-xs text-rose-700" onClick={() => { setImage(null); setFileName(""); }}>이미지 제거</button></div>}
      <label className="flex items-center justify-between text-sm">기본 색상 <input disabled={!!sample} type="color" aria-label="기본 색상" value={color} onChange={(e) => setColor(e.target.value)} /></label>
      <p className="text-xs leading-5 text-slate-500">이미지가 없으면 기본 색상으로 표시됩니다. 등록 내용과 이미지는 서버 DB에 저장됩니다.</p>
      {!user && <p className="text-sm text-amber-800">저장하려면 <a className="underline" href="/login">직원 로그인</a>이 필요합니다.</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className="action-secondary" disabled={busy} onClick={onClose}>취소</button><button className="action-primary disabled:opacity-40" disabled={!user || busy || reading || (!!sample && image === sample.image)}>{busy ? "저장 중…" : reading ? "이미지 읽는 중…" : sample ? "이미지 저장" : "합판 등록"}</button></div>
    </form>
  </dialog>;
}
