"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileUp, Package, Printer, Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getToday } from "@/lib/date";
import { requestApi } from "@/lib/api-client";
import { SHIPPING_MODES, CARRIER, parseShippingRows, shipmentWarnings, validateShippingBatch, type Shipment, type ShippingBatch, type ShippingHistory, type Sender } from "@/lib/shipping";
import { InvoiceSheets } from "@/components/shipping/InvoiceSheets";
import styles from "./shipping.module.css";

const input="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40";
const primary=button+" !border-blue-600 !bg-blue-600 text-white";
type Excluded={source:string;customer:string;note:string;reason:string};
const message=(e:unknown)=>e instanceof Error?e.message:"처리하지 못했습니다. 다시 시도해 주세요.";

export default function ShippingPage(){
  const {user,token,isLoading:authLoading}=useAuth();
  const [date,setDate]=useState(getToday),[sourceName,setSourceName]=useState("");
  const [entries,setEntries]=useState<Shipment[]>([]),[excluded,setExcluded]=useState<Excluded[]>([]);
  const [history,setHistory]=useState<ShippingHistory[]>([]),[hasMore,setHasMore]=useState(false);
  const [from,setFrom]=useState(""),[to,setTo]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[historyError,setHistoryError]=useState(""),[notice,setNotice]=useState("");
  const [dirty,setDirty]=useState(false),[savedId,setSavedId]=useState("");
  const [filter,setFilter]=useState<Sender|"all">("all"),[showPreview,setShowPreview]=useState(false);
  const pendingId=useRef(""),lock=useRef(false),fileInput=useRef<HTMLInputElement>(null),historySequence=useRef(0);
  const headers=useCallback(():Record<string,string>=>token?{Authorization:"Bearer "+token}:{},[token]);
  const loadHistory=useCallback(async(offset=0)=>{
    const seq=++historySequence.current;setLoading(true);setHistoryError("");
    try{
      const result=await requestApi<ShippingHistory[]>("/api/shipping?"+new URLSearchParams({from,to,offset:String(offset)}),{headers:headers()});
      if(seq!==historySequence.current)return;
      setHistory(previous=>offset?[...previous,...result.data!]:result.data!);setHasMore(!!result.hasMore);
    }catch(e){if(seq===historySequence.current)setHistoryError(message(e));}
    finally{if(seq===historySequence.current)setLoading(false);}
  },[from,to,headers]);
  useEffect(()=>{
    if(authLoading||!user)return;
    const timer=setTimeout(()=>void loadHistory(),0);
    return()=>{clearTimeout(timer);historySequence.current+=1;};
  },[loadHistory,authLoading,user]);
  useEffect(()=>{
    const before=(event:BeforeUnloadEvent)=>{if(dirty||busy){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);
  },[dirty,busy]);
  function changed(){setDirty(true);setSavedId("");pendingId.current="";setNotice("");}
  function update(id:string,patch:Partial<Shipment>){changed();setEntries(previous=>previous.map(e=>e.id===id?{...e,...patch}:e));}
  function canReplace(){return !dirty||window.confirm("저장하지 않은 송장이 있습니다. 현재 내용을 바꾸시겠습니까?");}
  async function importFile(file:File){
    if(lock.current||!canReplace())return;
    if(!/\.(xls|xlsx)$/i.test(file.name)||file.size>10*1024*1024){setError("10MB 이하 .xls 또는 .xlsx 파일을 선택해 주세요.");return;}
    lock.current=true;setBusy(true);setError("");setNotice("");
    try{
      const XLSX=await import("xlsx");
      const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",sheetRows:5002});
      const found:Shipment[]=[],skipped:Excluded[]=[];let matching=0;
      for(const sheet of workbook.SheetNames){
        const ws=workbook.Sheets[sheet];
        if(ws["!fullref"]&&XLSX.utils.decode_range(ws["!fullref"]).e.r>=5001)throw new Error("시트당 5,000행 이하로 나누어 올려 주세요.");
        const rows=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:"",blankrows:true,raw:false});
        const parsed=parseShippingRows(rows,sheet);if(!parsed)continue;matching++;
        found.push(...parsed.entries);skipped.push(...parsed.excluded);
      }
      if(!matching)throw new Error("장부명(거래처/업체명)과 적요 열이 있는 택배 리스트가 필요합니다.");
      if(found.length>1000)throw new Error("발송 대상은 한 번에 1,000건까지 처리할 수 있습니다.");
      setEntries(found);setExcluded(skipped);setSourceName(file.name);setSavedId("");pendingId.current="";setDirty(found.length>0);setShowPreview(false);
      setNotice(`발송 대상 ${found.length}건을 찾았습니다. 제외 ${skipped.length}건. 받는 분과 운송구분을 확인해 주세요.`);
    }catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);if(fileInput.current)fileInput.current.value="";}
  }
  const batch:ShippingBatch={id:savedId,date,sourceName,entries};
  async function save(){
    if(lock.current)return;
    setError("");setNotice("");
    try{
      if(!pendingId.current)pendingId.current=crypto.randomUUID();
      const snapshot=validateShippingBatch({...batch,id:pendingId.current});
      lock.current=true;setBusy(true);
      const result=await requestApi<{id:string}>("/api/shipping",{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify(snapshot)});
      setSavedId(result.data!.id);setDirty(false);setNotice(`${date} 송장 ${entries.length}건이 서버에 저장되었습니다.`);
      await loadHistory();
    }catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}
  }
  async function openSaved(id:string){
    if(lock.current||!canReplace())return;
    lock.current=true;setBusy(true);setError("");setNotice("");
    try{
      const result=await requestApi<ShippingBatch>("/api/shipping?id="+encodeURIComponent(id),{headers:headers()});
      const b=result.data!;setDate(b.date);setSourceName(b.sourceName);setEntries(b.entries);setExcluded([]);setSavedId(b.id);pendingId.current=b.id;setDirty(false);setShowPreview(true);setFilter("all");
      setNotice("저장된 송장을 불러왔습니다. 수정 후 저장하면 새 기록으로 남습니다.");
    }catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}
  }
  async function download(sender:Sender){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError("");
    try{
      const response=await fetch(`/shipping-templates/${sender}.xlsx`);if(!response.ok)throw new Error("송장 양식을 불러오지 못했습니다.");
      const {makeShippingExcel}=await import("@/lib/shipping-excel");
      const bytes=makeShippingExcel(new Uint8Array(await response.arrayBuffer()),batch,sender);
      const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
      const a=document.createElement("a");a.href=url;a.download=`${sender==="baron"?"바론":"홈파트너"}_송장_${date}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}
  }
  const baronCount=entries.filter(e=>e.sender==="baron").length,homeCount=entries.length-baronCount;
  const unresolved=entries.some(e=>!e.mode),missing=entries.filter(e=>shipmentWarnings(e).length>0).length;
  if(authLoading)return <p role="status">로그인 확인 중…</p>;
  if(!user)return <p>직원 로그인 후 택배 송장을 이용할 수 있습니다.</p>;
  return <div className="space-y-5">
    <header><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Package/>택배 송장</h1><p className="mt-1 text-sm text-slate-500">오늘의 리스트를 올리고 바론·홈파트너 송장을 작성하세요.</p></header>
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-slate-600">발송일<input type="date" aria-label="발송일" className={input+" mt-1 block"} value={date} disabled={busy} onChange={e=>{changed();setDate(e.target.value);}}/></label>
        <label className={primary+" cursor-pointer"}><FileUp size={17}/>택배 리스트 올리기<input ref={fileInput} type="file" accept=".xls,.xlsx" className="sr-only" aria-label="택배 리스트 올리기" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);}}/></label>
        <span className="text-sm text-slate-500">{sourceName||".xls / .xlsx · 최대 10MB"}</span>
      </div>
      <p className="text-xs leading-6 text-slate-500">적요의 선택 → 택배 선불, 착택·착불택배 → 택배 착불, 선화 → 화물 선불, 착화·화물착불 → 화물 착불. 홈파트너 장부는 홈파트너로, 나머지는 바론으로 분류합니다. 품명·수량이 없으면 빈칸으로 둡니다.</p>
      {notice&&<p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {busy&&<p role="status" className="text-sm text-slate-500">처리 중…</p>}
    </section>
    {sourceName&&<section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">발송 대상 {entries.length}건 <span className="ml-2 text-sm font-normal text-slate-500">바론 {baronCount} · 홈파트너 {homeCount}</span></h2>
        <button className={button} disabled={busy||entries.length>=1000} onClick={()=>{changed();setEntries(previous=>[...previous,{id:crypto.randomUUID(),sender:"baron",customer:"",recipient:"",phone:"",address:"",mode:"",product:"",quantity:null,packaging:"양호",freight:"",note:"",source:"직접 입력"}]);}}><Plus size={16}/>발송 추가</button></div>
      {missing>0&&<p className="text-sm text-amber-700">확인이 필요한 항목이 있는 송장 {missing}건. 받는 분·주소·전화번호·운송구분은 저장 전에 입력해 주세요. 품명·수량은 빈칸으로 저장할 수 있습니다.</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs text-slate-600"><tr>{["발송 업체","받는 분","전화번호","주소 / 수령 지점","품명","수량","운송구분","포장상태","운임비","원본 / 확인"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{entries.map((entry,index)=><tr key={entry.id} className="border-b align-top">
        <td className="p-2"><select aria-label={`${index+1}번 발송 업체`} disabled={busy} className={input+" w-28"} value={entry.sender} onChange={e=>update(entry.id,{sender:e.target.value as Sender})}><option value="baron">바론</option><option value="homepartner">홈파트너</option></select></td>
        <td className="p-2"><input aria-label={`${index+1}번 받는 분`} className={input+" w-32"} value={entry.recipient} disabled={busy} maxLength={200} onChange={e=>update(entry.id,{recipient:e.target.value})}/><p className="mt-1 max-w-32 truncate text-xs text-slate-400" title={entry.customer}>{entry.customer}</p></td>
        <td className="p-2"><input aria-label={`${index+1}번 전화번호`} className={input+" w-36"} value={entry.phone} disabled={busy} maxLength={60} onChange={e=>update(entry.id,{phone:e.target.value})}/></td>
        <td className="p-2"><textarea aria-label={`${index+1}번 주소`} className={input+" w-64"} rows={2} value={entry.address} disabled={busy} maxLength={1000} onChange={e=>update(entry.id,{address:e.target.value})}/></td>
        <td className="p-2"><input aria-label={`${index+1}번 품명`} className={input+" w-28"} value={entry.product} disabled={busy} maxLength={300} onChange={e=>update(entry.id,{product:e.target.value})}/></td>
        <td className="p-2"><input aria-label={`${index+1}번 수량`} className={input+" w-20"} type="number" min="1" max="99999" step="1" value={entry.quantity??""} disabled={busy} onChange={e=>update(entry.id,{quantity:e.target.value===""?null:Number(e.target.value)})}/></td>
        <td className="p-2"><select aria-label={`${index+1}번 운송구분`} className={input+" w-28"+(!entry.mode?" border-amber-500":"")} value={entry.mode} disabled={busy} onChange={e=>update(entry.id,{mode:e.target.value as Shipment["mode"]})}><option value="">선택 필요</option>{SHIPPING_MODES.map(mode=><option key={mode}>{mode}</option>)}</select></td>
        <td className="p-2"><input aria-label={`${index+1}번 포장상태`} className={input+" w-20"} value={entry.packaging} disabled={busy} maxLength={100} onChange={e=>update(entry.id,{packaging:e.target.value})}/></td>
        <td className="p-2"><input aria-label={`${index+1}번 운임비`} className={input+" w-24"} value={entry.freight} disabled={busy} maxLength={100} onChange={e=>update(entry.id,{freight:e.target.value})}/></td>
        <td className="p-2"><details className="w-48 text-xs text-slate-500"><summary className="cursor-pointer">{entry.source}</summary><p className="mt-2 whitespace-pre-wrap break-words">{entry.note}</p></details><p className="mt-1 text-xs text-amber-700">{shipmentWarnings(entry).join(" · ")}</p><button className="mt-2 text-slate-400 hover:text-red-600" aria-label={`${index+1}번 발송 제외`} disabled={busy} onClick={()=>{changed();setEntries(previous=>previous.filter(e=>e.id!==entry.id));}}><Trash2 size={15}/></button></td>
      </tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center gap-2"><button className={primary} onClick={()=>void save()} disabled={busy||!entries.length||!!savedId}><Save size={16}/>{savedId?"저장 완료":"송장 저장"}</button>
        <button className={button} onClick={()=>void download("baron")} disabled={busy||!baronCount||unresolved}><Download size={16}/>바론 엑셀</button><button className={button} onClick={()=>void download("homepartner")} disabled={busy||!homeCount||unresolved}><Download size={16}/>홈파트너 엑셀</button>
        <select aria-label="인쇄할 발송 업체" className={input} value={filter} onChange={e=>setFilter(e.target.value as Sender|"all")}><option value="all">두 업체 모두</option><option value="baron">바론만</option><option value="homepartner">홈파트너만</option></select>
        <button className={button} disabled={busy||!entries.length||unresolved||(filter==="baron"&&!baronCount)||(filter==="homepartner"&&!homeCount)} onClick={()=>window.print()}><Printer size={16}/>인쇄 · 팩스</button>
        <button className={button} disabled={!entries.length} onClick={()=>setShowPreview(v=>!v)}>{showPreview?"미리보기 접기":"송장 미리보기"}</button><span className="text-xs text-slate-500">{dirty?"아직 저장하지 않은 내용이 있습니다.":savedId?"서버 저장 완료":""}</span>
      </div>
      {showPreview&&<div className={styles.preview}><InvoiceSheets batch={batch} filter={filter}/></div>}
      {excluded.length>0&&<details className="border-t pt-3 text-sm"><summary className="cursor-pointer text-slate-500">자동 제외 {excluded.length}건 확인</summary><ul className="mt-3 space-y-2">{excluded.map(e=><li key={e.source} className="rounded-lg bg-slate-50 p-3 text-xs"><b>{e.customer}</b> · {e.source} · {e.reason}<p className="mt-1 whitespace-pre-wrap text-slate-500">{e.note}</p></li>)}</ul></details>}
    </section>}
    <details className="rounded-xl border bg-white p-5 text-sm"><summary className="cursor-pointer font-medium">프린터 팩스로 보내는 방법</summary><div className="mt-3 space-y-2 leading-6 text-slate-600"><p>인쇄 · 팩스 → 인쇄창의 ‘시스템 대화상자를 사용하여 인쇄’ → HP OfficeJet Pro 7740 … (Fax) 선택 → 수신 팩스번호 <b>{CARRIER.fax}</b> 확인 후 전송하세요.</p><p>HP 팩스 드라이버와 프린터 전화선 연결이 필요합니다. 일반 프린터가 선택되어 있으면 종이로 출력됩니다. 팩스 장치 선택이나 수신번호 입력창이 없으면 HP 전체 기능 소프트웨어의 PC 팩스를 확인하세요. PDF로 저장한 뒤 HP 팩스 프로그램에서 열 수도 있습니다.</p><p>인쇄창을 열었다는 이유로 전송 완료로 기록하지 않습니다. 실제 결과는 프린터 팩스 보고서에서 확인해 주세요.</p><a className="text-blue-700 underline" target="_blank" rel="noreferrer" href="https://h10032.www1.hp.com/ctg/Manual/c05216524.pdf#page=62">HP 공식 설명서 · 컴퓨터에서 팩스 보내기</a></div></details>
    <section className="space-y-3 rounded-xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">저장된 송장 기록</h2><button className={button} disabled={loading||busy} onClick={()=>void loadHistory()}><RefreshCw size={15}/>새로고침</button></div>
      <div className="flex flex-wrap items-center gap-3"><label className="text-xs text-slate-500">시작일<input aria-label="기록 시작일" type="date" className={input+" ml-2"} value={from} disabled={loading||busy} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs text-slate-500">종료일<input aria-label="기록 종료일" type="date" className={input+" ml-2"} value={to} disabled={loading||busy} onChange={e=>setTo(e.target.value)}/></label><button className={button} disabled={loading||busy} onClick={()=>{setFrom("");setTo("");}}>전체 기간</button></div>
      {historyError&&<p role="alert" className="text-sm text-red-700">{historyError}</p>}
      {loading&&<p role="status" className="text-sm text-slate-500">기록을 불러오는 중…</p>}
      {!loading&&!historyError&&!history.length&&<p className="py-5 text-sm text-slate-500">이 기간에 저장된 송장이 없습니다. ‘송장 저장’을 누르면 날짜별로 기록됩니다.</p>}
      <div className="divide-y">{history.map(item=><button key={item.id} className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left hover:text-blue-700 disabled:opacity-40" disabled={busy||loading} onClick={()=>void openSaved(item.id)}><div><b>{item.date}</b><span className="ml-3 text-sm">총 {item.count}건 · 바론 {item.baronCount} · 홈파트너 {item.homepartnerCount}</span><p className="mt-1 break-all text-xs text-slate-500">{item.sourceName} · {item.author} · {new Date(item.createdAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</p></div><span className="text-sm text-blue-700">송장 열기 →</span></button>)}</div>
      {hasMore&&<button className={button+" w-full"} disabled={loading||busy} onClick={()=>void loadHistory(history.length)}>이전 기록 더 보기</button>}
    </section>
    {entries.length>0&&typeof document!=="undefined"&&createPortal(<div id="shipping-print" className={styles.printOnly}><InvoiceSheets batch={batch} filter={filter}/></div>,document.body)}
  </div>;
}
