"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FileText, Paperclip, Pin, Plus, Search, Download, ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { requestApi } from "@/lib/api-client";
import { DOCUMENT_FILE_COUNT, DOCUMENT_FILE_LIMIT, type DocumentAttachment, type DocumentPost } from "@/lib/document-board";

type PendingFile = { key: string; file: File; uploaded?: DocumentAttachment };
const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed";
const primary = `${button} !border-blue-600 !bg-blue-600 !text-white hover:!bg-blue-700`;
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const date = (value: string) => new Date(value).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
const message = (error: unknown) => error instanceof Error ? error.message : "요청에 실패했습니다. 다시 시도해 주세요.";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DocumentPost[]>([]);
  const [selected, setSelected] = useState<DocumentPost | null>(null);
  const [mode, setMode] = useState<"list" | "detail" | "edit">("list");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [files, setFiles] = useState<PendingFile[]>([]);

  useEffect(() => {
    if (mode !== "list") return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true); setError("");
      return requestApi<DocumentPost[]>(`/api/documents?q=${encodeURIComponent(search)}&offset=${page * 20}`);
    })
      .then(result => { if (active && result) { setItems(result.data || []); setHasMore(Boolean(result.hasMore)); } })
      .catch(err => { if (active) setError(message(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, search, page, revision]);

  async function open(id: string) {
    setBusy(true); setError("");
    try {
      const result = await requestApi<DocumentPost>(`/api/documents?id=${encodeURIComponent(id)}`);
      setSelected(result.data!); setMode("detail");
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  function edit(post: DocumentPost | null) {
    setSelected(post); setTitle(post?.title || ""); setBody(post?.body || "");
    setPinned(post?.pinned || false); setAttachments(post?.attachments || []); setFiles([]); setError(""); setMode("edit");
  }
  function cancel() {
    if (!window.confirm("작성 중인 내용을 취소할까요?")) return;
    setError(""); setMode(selected ? "detail" : "list"); setFiles([]);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const ids = attachments.map(file => file.id);
      for (let i = 0; i < files.length; i++) {
        const pending = files[i];
        let uploaded = pending.uploaded;
        if (!uploaded) {
          setStatus(`첨부파일 저장 중 (${i + 1}/${files.length})`);
          const form = new FormData(); form.set("file", pending.file);
          const result = await requestApi<DocumentAttachment>("/api/documents?action=upload", { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
          uploaded = result.data!;
          setFiles(current => current.map(file => file.key === pending.key ? { ...file, uploaded } : file));
        }
        ids.push(uploaded.id);
      }
      setStatus("게시글 저장 중…");
      await requestApi("/api/documents" + (selected ? `?id=${encodeURIComponent(selected.id)}` : ""), {
        method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned, attachments: ids }),
      });
      setSelected(null); setFiles([]); setPage(0); setRevision(v => v + 1); setMode("list");
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); setStatus(""); }
  }
  async function remove() {
    if (!selected || !window.confirm("게시글과 첨부파일을 삭제할까요?")) return;
    setBusy(true); setError("");
    try {
      await requestApi(`/api/documents?id=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      setSelected(null); setMode("list"); setRevision(v => v + 1);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function download(file: DocumentAttachment) {
    setBusy(true); setError("");
    try {
      const headers = new Headers(), token = localStorage.getItem("baron_auth_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`/api/documents?file=${encodeURIComponent(file.id)}`, { headers, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error("첨부파일을 내려받지 못했습니다. 다시 시도해 주세요.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a"); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <PageHeader title="바론 문서 & 양식" description="각종 문서와 양식을 공유하는 게시판입니다. 공지 글은 목록 상단에 고정됩니다."
      actions={mode === "list" ? <button className={primary} disabled={busy} onClick={() => edit(null)}><Plus size={16} />글쓰기</button> : undefined} />
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{mode === "list" && <button className={button} onClick={() => setRevision(v => v + 1)}>다시 불러오기</button>}</div>}
    {mode === "list" && <>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(query.trim()); setRevision(v => v + 1); }}>
        <label className="flex-1 max-w-lg"><span className="sr-only">제목, 본문, 작성자 검색</span><input className={field} value={query} onChange={e => setQuery(e.target.value)} placeholder="제목, 본문, 작성자 검색" maxLength={200} /></label>
        <button className={button} disabled={busy}><Search size={16} />검색</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-500"><span>제목</span><span>작성자</span><span>등록일</span></div>
        {loading ? <p role="status" className="p-12 text-center text-sm text-slate-500">문서를 불러오는 중…</p> : error ? <p className="p-12 text-center text-sm text-slate-500">목록을 불러오지 못했습니다.</p> : items.length === 0 ? <div className="p-12 text-center text-slate-500"><FileText className="mx-auto mb-3 text-slate-300" size={32} /><p>{search ? "검색 결과가 없습니다." : "등록된 문서가 없습니다. 첫 문서를 올려보세요."}</p></div> : items.map(item =>
          <button key={item.id} onClick={() => open(item.id)} disabled={busy} className={`grid w-full grid-cols-1 sm:grid-cols-[minmax(0,1fr)_110px_110px] items-center gap-2 sm:gap-4 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-blue-50 disabled:opacity-50 ${item.pinned ? "bg-amber-50/60" : ""}`}>
            <span className="flex min-w-0 items-center gap-2">{item.pinned && <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"><Pin size={12} />공지</span>}<span className="truncate text-sm font-semibold text-slate-800">{item.title}</span>{item.attachmentCount > 0 && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500" aria-label={`첨부파일 ${item.attachmentCount}개`}><Paperclip size={13} />{item.attachmentCount}</span>}</span>
            <span className="truncate text-xs text-slate-500">{item.author}<span className="sm:hidden"> · {date(item.createdAt)}</span></span><span className="hidden sm:block text-xs text-slate-500">{date(item.createdAt)}</span>
          </button>)}
      </div>
      <div className="flex items-center justify-center gap-4"><button className={button} disabled={page === 0 || loading || busy} onClick={() => setPage(p => p - 1)}>이전</button><span className="text-sm text-slate-500">{page + 1} 페이지</span><button className={button} disabled={!hasMore || loading || busy || !!error} onClick={() => setPage(p => p + 1)}>다음</button></div>
    </>}
    {mode === "detail" && selected && <>
      <div className="flex flex-wrap justify-between gap-2"><button className={button} disabled={busy} onClick={() => { setMode("list"); setError(""); }}><ArrowLeft size={16} />목록</button>{String(user?.id) === selected.authorId && <div className="flex gap-2"><button className={button} disabled={busy} onClick={() => edit(selected)}>수정</button><button className={button} disabled={busy} onClick={remove}><Trash2 size={14} />삭제</button></div>}</div>
      <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="space-y-3 border-b border-slate-200 p-5 sm:p-7">{selected.pinned && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><Pin size={14} />공지 · 상단 고정</span>}<h2 className="break-words text-xl font-bold text-slate-900">{selected.title}</h2><p className="text-xs text-slate-500">{selected.author} · 등록 {date(selected.createdAt)}{selected.updatedAt !== selected.createdAt && ` · 수정 ${date(selected.updatedAt)}`}</p></header>
        <div className="min-h-48 whitespace-pre-wrap break-words p-5 text-sm leading-7 text-slate-700 sm:p-7">{selected.body || "본문 내용이 없습니다."}</div>
        <section className="border-t border-slate-200 p-5 sm:p-7"><h3 className="mb-3 text-sm font-semibold text-slate-700">첨부파일 {selected.attachments?.length || 0}개</h3><div className="space-y-2">{selected.attachments?.map(file => <button key={file.id} disabled={busy} onClick={() => download(file)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:bg-blue-50 disabled:opacity-50"><Download size={16} className="shrink-0 text-blue-600" /><span className="min-w-0 flex-1 break-all text-sm text-slate-700">{file.name}</span><span className="shrink-0 text-xs text-slate-500">{size(file.size)}</span></button>)}</div></section>
      </article>
    </>}
    {mode === "edit" && <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">{selected ? "게시글 수정" : "새 글 작성"}</h2>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">제목 <span className="text-red-500">*</span></span><input className={field} required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="문서 또는 양식 제목을 입력해 주세요" /></label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="h-4 w-4 accent-blue-600" /><Pin size={15} />공지사항으로 등록 (목록 상단 고정)</label>
        <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">본문</span><textarea className={`${field} min-h-64 resize-y leading-7`} maxLength={50_000} value={body} onChange={e => setBody(e.target.value)} placeholder="문서에 대한 설명이나 전달할 내용을 입력해 주세요" /></label>
        <div className="space-y-3"><label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">첨부파일</span><input type="file" multiple className={`${field} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm`} onChange={e => {
          const next = Array.from(e.target.files || []); e.target.value = "";
          if (attachments.length + files.length + next.length > DOCUMENT_FILE_COUNT) { setError("첨부파일은 최대 10개까지 등록할 수 있습니다."); return; }
          if (next.some(file => !file.size || file.size > DOCUMENT_FILE_LIMIT || file.name.length > 255)) { setError("빈 파일은 첨부할 수 없으며, 파일당 3MB·파일명 255자까지 지원합니다."); return; }
          setError(""); setFiles(current => [...current, ...next.map(file => ({ key: crypto.randomUUID(), file }))]);
        }} /></label><p className="text-xs text-slate-500">PDF, 한글, Word, Excel, ZIP 등 · 파일당 최대 3MB · 최대 10개</p>
          {attachments.map(file => <div key={file.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><Paperclip size={14} className="shrink-0" /><span className="min-w-0 flex-1 break-all">{file.name} <span className="text-xs text-slate-500">({size(file.size)})</span></span><button type="button" className="shrink-0 text-red-600" aria-label={`${file.name} 첨부 제거`} onClick={() => setAttachments(current => current.filter(f => f.id !== file.id))}>제거</button></div>)}
          {files.map(pending => <div key={pending.key} className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm"><Paperclip size={14} className="shrink-0" /><span className="min-w-0 flex-1 break-all">{pending.file.name} <span className="text-xs text-slate-500">({size(pending.file.size)}) · 새 첨부</span></span><button type="button" className="shrink-0 text-red-600" aria-label={`${pending.file.name} 첨부 제거`} onClick={() => setFiles(current => current.filter(f => f.key !== pending.key))}>제거</button></div>)}
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><span role="status" className="self-center text-sm text-slate-500">{status}</span><button type="button" className={button} disabled={busy} onClick={cancel}>취소</button><button className={primary} disabled={busy || !title.trim()}>{busy ? "저장 중…" : "저장"}</button></div>
    </form>}
  </div>;
}
