'use client';
import { useCallback, useEffect, useState } from 'react';

type LinkedDrawing = { projectId:string; revision:number; syncedAt:string; sheets:{id:string;name:string;number:string;pdfUrl:string;syncedAt:string}[]; versions:{id:string;url:string;name:string;createdAt:string}[] };
export function DrawingLinksPanel({ workItemId,token,onOpen }: {workItemId:string;token:string | null;onOpen:(projectId:string)=>void}) {
  const [links,setLinks] = useState<LinkedDrawing[]>([]);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/drawing-requests?workItemId=${encodeURIComponent(workItemId)}`,{headers:token ? {Authorization:`Bearer ${token}`} : {}});
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '연동 정보를 확인하지 못했습니다.');
      setLinks(data.links || []);
    } catch(error) {setError(error instanceof Error ? error.message : String(error));}
    finally {setLoading(false);}
  },[workItemId,token]);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    const focus = () => {void refresh();};
    window.addEventListener('focus',focus);
    return () => { clearTimeout(timer); window.removeEventListener('focus',focus); };
  },[refresh]);
  return <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
    <div className="flex justify-between gap-2 items-center"><h3 className="font-bold text-sm text-blue-950">바론웹 연결 도면</h3><button type="button" onClick={() => void refresh()} disabled={loading} className="text-xs text-blue-700 underline">{loading ? '확인 중…' : '새로고침'}</button></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {!loading && !error && !links.length && <p className="text-xs text-slate-500">미연동 · 웹에서 도면을 먼저 그린 뒤 온라인으로 전송해도 이 업무에 연결할 수 있습니다.</p>}
    {links.map(link => <div key={link.projectId} className="border border-blue-100 rounded-lg bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{link.revision ? `도면 수신 완료 · ${link.sheets.length}개 시트` : '업무 연결됨 · 도면 전송 대기'}</p><p className="text-[11px] text-slate-500 break-all">연결번호 {link.projectId}</p><p className="text-xs text-slate-500">마지막 전달 {new Date(link.syncedAt).toLocaleString('ko-KR')}</p></div><button type="button" onClick={() => onOpen(link.projectId)} className="rounded bg-blue-700 px-3 py-2 text-xs text-white">이 도면 이어서 작업</button></div>
      <ul className="text-sm space-y-1">{link.sheets.map(sheet => <li key={sheet.id} className="flex flex-wrap justify-between gap-2"><a className="text-blue-700 underline" href={sheet.pdfUrl} target="_blank" rel="noreferrer">{sheet.name} · PDF</a><span className="text-xs text-slate-500">{new Date(sheet.syncedAt).toLocaleString('ko-KR')}</span></li>)}</ul>
      {!!link.versions.length && <details className="text-xs"><summary className="cursor-pointer text-slate-600">도면 전송 이력 ({link.versions.length})</summary><ul className="mt-2 space-y-1">{link.versions.map(version => <li key={version.id}><a href={version.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{version.name}</a> · {new Date(version.createdAt).toLocaleString('ko-KR')}</li>)}</ul></details>}
    </div>)}
  </section>;
}
