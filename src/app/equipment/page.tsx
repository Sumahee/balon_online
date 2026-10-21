"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Wrench, ArrowLeft, Pencil, Camera, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { requestApi } from "@/lib/api-client";
import { getToday } from "@/lib/date";
import { compressPhoto, readPhotoFile } from "@/lib/photo-compression";
import { COST_FIELDS, emptyCosts, totalCosts, type Costs, type MachineContact, type Machine, type Maintenance } from "@/lib/equipment";

const money=(value:number)=>Number(value).toLocaleString("ko-KR")+"원";
const input="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40";
const primary=button+" !border-blue-600 !bg-blue-600 text-white";
type Overview={machines:Machine[];totals:Costs & {total:number;count:number}};
type Editor={entity:"machine";value?:Machine}|{entity:"maintenance";value?:Maintenance;machine:Machine};

export default function EquipmentPage(){
  const {user,token,isLoading:authLoading}=useAuth();
  const [overview,setOverview]=useState<Overview>({machines:[],totals:{...emptyCosts(),total:0,count:0}});
  const [selected,setSelected]=useState("");
  const [records,setRecords]=useState<Maintenance[]>([]);
  const [hasMore,setHasMore]=useState(false);
  const [from,setFrom]=useState("");const [to,setTo]=useState("");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");
  const [editor,setEditor]=useState<Editor|null>(null);const [preview,setPreview]=useState<string|null>(null);
  const [opening,setOpening]=useState(false);
  const sequence=useRef(0);
  const headers=useCallback(():Record<string,string>=>token?{Authorization:"Bearer "+token}:{},[token]);
  const load=useCallback(async()=>{
    const seq=++sequence.current;setLoading(true);setError("");
    const params=new URLSearchParams({from,to});
    try{
      const [summary,history]=await Promise.all([
        requestApi<Overview>("/api/equipment?"+params,{headers:headers()}),
        selected?requestApi<Maintenance[]>("/api/equipment?"+params+"&machine="+encodeURIComponent(selected),{headers:headers()}):Promise.resolve(null),
      ]);
      if(seq!==sequence.current)return;
      setOverview(summary.data!);setRecords(history?.data||[]);setHasMore(!!history?.hasMore);
    }catch(cause){if(seq===sequence.current)setError(cause instanceof Error?cause.message:"조회 실패");}
    finally{if(seq===sequence.current)setLoading(false);}
  },[from,to,selected,headers]);
  useEffect(()=>{if(!authLoading&&user)void load();return()=>{sequence.current++;};},[load,authLoading,user]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setPreview(null);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[]);
  const machine=overview.machines.find(item=>item.id===selected);
  const filtered=overview.machines.filter(item=>[item.name,item.model,item.location].some(value=>value.toLowerCase().includes(search.toLowerCase())));
  async function more(){
    setLoading(true);setError("");
    try{const result=await requestApi<Maintenance[]>("/api/equipment?"+new URLSearchParams({from,to,machine:selected,offset:String(records.length)}),{headers:headers()});setRecords(previous=>[...previous,...result.data!]);setHasMore(!!result.hasMore);}
    catch(cause){setError(cause instanceof Error?cause.message:"조회 실패");}finally{setLoading(false);}
  }
  async function editRecord(item:Maintenance){
    setOpening(true);setError("");
    try{const result=await requestApi<Maintenance>("/api/equipment?entry="+encodeURIComponent(item.id),{headers:headers()});setEditor({entity:"maintenance",machine:machine!,value:result.data!});}
    catch(cause){setError(cause instanceof Error?cause.message:"조회 실패");}finally{setOpening(false);}
  }
  if(authLoading)return <p role="status">로그인 확인 중…</p>;
  if(!user)return <p>로그인 후 설비 관리를 이용할 수 있습니다.</p>;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">설비 관리</h1><p className="mt-1 text-sm text-slate-500">공장 기계별 정비 이력과 유지보수 비용</p></div><button className={primary} disabled={!!editor||loading||opening} onClick={()=>setEditor({entity:"machine"})}><Plus size={17}/>기계 등록</button></header>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"><label className="text-xs text-slate-600">조회 시작일<input aria-label="조회 시작일" type="date" className={input+" mt-1"} value={from} disabled={!!editor||opening||loading} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs text-slate-600">조회 종료일<input aria-label="조회 종료일" type="date" className={input+" mt-1"} value={to} disabled={!!editor||opening||loading} onChange={e=>setTo(e.target.value)}/></label><button className={button} disabled={!!editor||loading||opening} onClick={()=>{setFrom("");setTo("");}}>전체 기간</button><span className="text-xs text-slate-500">정비일 기준 · 사용 종료 기계 포함</span></div>
    {error&&<div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button className="underline" onClick={()=>void load()}>다시 불러오기</button></div>}
    {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <section aria-label="전체 설비 비용" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <div className="col-span-2 rounded-xl bg-slate-900 p-4 text-white lg:col-span-1"><p className="text-xs text-slate-300">{from||to?"조회 기간":"전체 누적"} 유지비</p><p className="mt-2 text-2xl font-bold">{loading||error?"—":money(overview.totals.total)}</p><p className="mt-2 text-xs text-slate-300">기계 {overview.machines.length}대 · 정비 {overview.totals.count}건</p></div>
      {COST_FIELDS.map(([key,label])=><div key={key} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{loading||error?"—":money(overview.totals[key])}</p></div>)}
    </section>
    {editor&&<EquipmentEditor key={editor.entity+(editor.value?.id||"new")} editor={editor} defaultName={`${overview.machines.length+1}번 기계`} headers={headers} onCancel={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice("저장했습니다.");void load();}}/>}
    {selected&&machine?<section className="space-y-4">
      <button className={button} disabled={!!editor||loading||opening} onClick={()=>setSelected("")}><ArrowLeft size={16}/>기계 목록</button>
      <div className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-xl font-bold">{machine.name}</h2><span className="rounded bg-slate-100 px-2 py-1 text-xs">{machine.status}</span></div><p className="mt-1 text-sm text-slate-500">{[machine.model,machine.location].filter(Boolean).join(" · ")||"모델·설치 위치 미입력"}</p></div><button className={button} disabled={!!editor||loading||opening} onClick={()=>setEditor({entity:"machine",value:machine})}><Pencil size={14}/>기계 정보 수정</button></div><p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{machine.description||"기계 설명을 추가해주세요."}</p>{(machine.serviceCompany||machine.contacts?.length) ? <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm"><p className="font-semibold">유지보수 업체: {machine.serviceCompany||"미입력"}</p><div className="mt-2 grid gap-3 sm:grid-cols-3">{machine.contacts?.map((contact,index)=><div key={index}><p className="text-slate-600">{index+1}. {contact.technician||"대표 연락처"}</p><p className="mt-1">{contact.phone||contact.technicianPhone||"미입력"}</p></div>)}</div></div> : null}<p className="mt-4 border-t pt-3 text-sm">이 기계 {from||to?"조회 기간":"누적"} 유지비 <strong className="ml-2 text-lg text-blue-700">{money(machine.total)}</strong> · 정비 {machine.count}건</p></div>
      <div className="flex items-center justify-between"><h2 className="font-bold">정비 이력</h2><button className={primary} disabled={!!editor||loading||opening} onClick={()=>setEditor({entity:"maintenance",machine})}><Plus size={16}/>정비 이력 추가</button></div>
      {loading&&<p role="status" className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading&&!error&&!records.length&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">{from||to?"조회 기간에 정비 이력이 없습니다.":"첫 정비 이력을 등록해주세요."}</div>}
      {records.map(item=><article key={item.id} className="rounded-xl border bg-white p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs text-slate-500">{item.date} · {item.kind} · 등록자 {item.author}</p><h3 className="mt-1 font-bold">{item.title}</h3></div><div className="flex items-center gap-3"><strong>{money(item.total)}</strong><button aria-label={item.title+" 수정"} className={button} disabled={!!editor||opening||loading} onClick={()=>void editRecord(item)}><Pencil size={14}/>수정</button></div></div>{item.provider&&<p className="mt-2 text-xs text-slate-500">정비 업체 / 작업자: {item.provider}</p>}<p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs">{COST_FIELDS.map(([key,label])=><span key={key}>{label} <b>{money(item.costs[key])}</b></span>)}</div>{item.photos.length>0&&<div className="mt-3 flex flex-wrap gap-2">{item.photos.map((url,index)=><button key={url} type="button" aria-label={item.title+" 사진 "+(index+1)+" 확대"} onClick={()=>setPreview(url)}><img loading="lazy" src={url} alt={item.title+" 정비 사진 "+(index+1)} className="h-20 w-24 rounded-lg border object-cover"/></button>)}</div>}</article>)}
      {hasMore&&<button disabled={loading||!!editor||opening} className={button+" w-full"} onClick={()=>void more()}>이전 이력 더 보기</button>}
    </section>:<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">기계 목록</h2><input aria-label="기계 검색" className={input+" sm:!w-64"} placeholder="기계명, 모델, 설치 위치 검색" value={search} onChange={e=>setSearch(e.target.value)}/></div>{loading?<p role="status">불러오는 중…</p>:!error&&!filtered.length?<div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">{search?"검색 결과가 없습니다.":"아직 등록된 기계가 없습니다. 기계 등록으로 시작하세요."}</div>:null}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(item=><button key={item.id} disabled={!!editor||loading||opening} onClick={()=>{setSelected(item.id);setNotice("");}} className="rounded-xl border bg-white p-5 text-left transition hover:border-blue-400 hover:shadow-sm disabled:opacity-50"><div className="flex justify-between gap-2"><Wrench className="text-blue-600" size={22}/><span className="text-xs text-slate-500">{item.status}</span></div><h3 className="mt-3 text-lg font-bold">{item.name}</h3><p className="mt-1 truncate text-xs text-slate-500">{[item.model,item.location].filter(Boolean).join(" · ")||"기계 정보 보기"}</p><div className="mt-4 flex justify-between border-t pt-3"><span className="text-xs text-slate-500">정비 {item.count}건</span><strong className="text-blue-700">{money(item.total)}</strong></div><p className="mt-2 text-xs text-slate-400">최근 정비 {item.lastDate||"—"}</p></button>)}</div></section>}
    {preview&&<div role="dialog" aria-modal="true" aria-label="정비 사진" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-5" onClick={()=>setPreview(null)}><button autoFocus aria-label="사진 닫기" className="absolute right-5 top-5 rounded bg-white p-2" onClick={()=>setPreview(null)}><X/></button><img src={preview} alt="정비 사진 확대" className="max-h-[85dvh] max-w-full object-contain" onClick={e=>e.stopPropagation()}/></div>}
  </div>;
}

function EquipmentEditor({editor,defaultName,headers,onCancel,onSaved}:{editor:Editor;defaultName:string;headers:()=>Record<string,string>;onCancel:()=>void;onSaved:()=>void}){
  const isMachine=editor.entity==="machine";
  const machineValue=isMachine?editor.value:undefined,entryValue=editor.entity==="maintenance"?editor.value:undefined;
  const [serviceCompany,setServiceCompany]=useState(machineValue?.serviceCompany||machineValue?.contacts?.[0]?.company||"");
  const [contacts,setContacts]=useState<MachineContact[]>(Array.from({length:3},(_,index)=>machineValue?.contacts?.[index]||{company:"",phone:"",technician:"",technicianPhone:""}));
  const [name,setName]=useState(machineValue?.name||defaultName),[model,setModel]=useState(machineValue?.model||""),[location,setLocation]=useState(machineValue?.location||""),[status,setStatus]=useState(machineValue?.status||"사용중");
  const [title,setTitle]=useState(entryValue?.title||""),[date,setDate]=useState(entryValue?.date||getToday()),[kind,setKind]=useState(entryValue?.kind||"수리"),[provider,setProvider]=useState(entryValue?.provider||"");
  const [description,setDescription]=useState(editor.value?.description||""),[costs,setCosts]=useState<Costs>(entryValue?.costs||emptyCosts()),[photos,setPhotos]=useState<string[]>(entryValue?.photos||[]);
  const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[discard,setDiscard]=useState(false),[dirty,setDirty]=useState(false);
  const lock=useRef(false),uploadLock=useRef(false),form=useRef<HTMLFormElement>(null);
  useEffect(()=>{form.current?.scrollIntoView({behavior:"smooth",block:"start"});},[]);
  useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(dirty||busy||uploading){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[dirty,busy,uploading]);
  async function addPhotos(files:File[]){
    if(uploadLock.current||lock.current)return;
    if(photos.length+files.length>4){setError("사진은 최대 4장까지 첨부할 수 있습니다.");return;}
    uploadLock.current=true;setUploading(true);setError("");
    try{const added:string[]=[];for(const file of files){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>25*1024*1024)throw new Error("25MB 이하 JPEG/PNG/WebP 사진을 선택해주세요.");added.push(await compressPhoto(await readPhotoFile(file)));}setPhotos(prev=>[...prev,...added]);setDirty(true);}
    catch(cause){setError(cause instanceof Error?cause.message:"사진 처리 실패");}finally{uploadLock.current=false;setUploading(false);}
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(lock.current||uploadLock.current)return;lock.current=true;setBusy(true);setError("");
    try{const data=isMachine?{entity:"machine",name,model,location,status,description,contacts,serviceCompany}:{entity:"maintenance",machineId:editor.machine.id,date,title,kind,provider,description,costs,photos};await requestApi("/api/equipment",{method:editor.value?"PUT":"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify({...data,id:editor.value?.id,revision:editor.value?.revision})});onSaved();}
    catch(cause){setError(cause instanceof Error?cause.message:"저장하지 못했습니다.");}finally{lock.current=false;setBusy(false);}
  }
  const field=(label:string,value:string,set:(value:string)=>void,required=false,type="text")=><label className="space-y-1 text-sm"><span>{label}</span><input aria-label={label} className={input} value={value} type={type} required={required} maxLength={type==="text"?200:undefined} onChange={e=>set(e.target.value)}/></label>;
  return <form ref={form} onSubmit={save} onChange={()=>setDirty(true)} className="scroll-mt-20 rounded-xl border-2 border-blue-200 bg-white p-4 sm:p-5">
    <h2 className="mb-4 text-lg font-bold">{isMachine?(editor.value?"기계 정보 수정":"기계 등록"):(editor.value?"정비 이력 수정":"정비 이력 추가")}{!isMachine&&<span className="ml-2 text-sm font-normal text-slate-500">{editor.machine.name}</span>}</h2>
    <fieldset disabled={busy||uploading} className="min-w-0 space-y-4 disabled:opacity-60"><div className="grid gap-3 sm:grid-cols-2">{isMachine?<>{field("기계 이름 *",name,setName,true)}{field("모델 / 제조사",model,setModel)}{field("설치 위치",location,setLocation)}<label className="space-y-1 text-sm">사용 상태<select aria-label="사용 상태" className={input} value={status} onChange={e=>setStatus(e.target.value)}>{["사용중","정비중","사용 종료"].map(value=><option key={value}>{value}</option>)}</select></label></>:<>{field("정비일 *",date,setDate,true,"date")}{field("정비 제목 *",title,setTitle,true)}<label className="space-y-1 text-sm">정비 종류<select aria-label="정비 종류" className={input} value={kind} onChange={e=>setKind(e.target.value)}>{["수리","정기점검","부품교체","기타"].map(value=><option key={value}>{value}</option>)}</select></label>{field("정비 업체 / 작업자",provider,setProvider)}</>}</div>
      {isMachine&&<section className="space-y-3"><h3 className="text-sm font-semibold">유지보수 업체</h3>{field("업체명",serviceCompany,setServiceCompany)}<p className="text-xs text-slate-500">같은 업체의 담당기사·연락처를 최대 3개 입력할 수 있습니다.</p>{contacts.map((contact,index)=><div key={index} className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">{([["technician","담당기사 / 구분"],["phone","연락처"]] as const).map(([key,label])=><label key={key} className="space-y-1 text-sm">{index+1}. {label}<input aria-label={"연락처 "+(index+1)+" "+label} type={key==="phone"?"tel":"text"} maxLength={key==="phone"?50:100} className={input} value={contact[key]||(key==="phone"?contact.technicianPhone||"":"")} onChange={e=>setContacts(previous=>previous.map((entry,i)=>i===index?{...entry,[key]:e.target.value, ...(key==="phone"?{technicianPhone:""}:{})}:entry))}/></label>)}</div>)}</section>}
      <label className="block space-y-1 text-sm">{isMachine?"기계 설명":"정비 내용"}<textarea aria-label={isMachine?"기계 설명":"정비 내용"} rows={3} maxLength={isMachine?5000:10000} className={input} value={description} onChange={e=>setDescription(e.target.value)} placeholder={isMachine?"용도, 구입 시기, 주의사항 등":"증상, 교체한 부품, 작업 내용 등을 기록하세요."}/></label>
      {!isMachine&&<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{COST_FIELDS.map(([key,label])=><label key={key} className="space-y-1 text-sm">{label} (원)<input aria-label={label} type="number" min="0" max="1000000000" step="1" className={input} value={costs[key]} onChange={e=>setCosts(prev=>({...prev,[key]:Number(e.target.value)}))}/></label>)}</div><p className="rounded-lg bg-blue-50 p-3 text-right text-sm">이번 정비 합계 <strong className="ml-2 text-xl text-blue-700">{money(totalCosts(costs))}</strong></p>
      <label className="block space-y-2 text-sm"><span className="flex items-center gap-2 font-medium"><Camera size={17}/>정비 사진 ({photos.length}/4)</span><input aria-label="정비 사진 첨부" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{void addPhotos(Array.from(e.target.files||[]));e.target.value="";}}/><span className="block text-xs text-slate-500">사진은 장당 500KB 이하로 압축해 저장합니다.</span></label><div className="flex flex-wrap gap-3">{photos.map((photo,index)=><div key={index} className="relative"><img src={photo} alt={"첨부 사진 "+(index+1)} className="h-24 w-28 rounded-lg border object-cover"/><button aria-label={"첨부 사진 "+(index+1)+" 제거"} type="button" onClick={()=>{setPhotos(prev=>prev.filter((_,i)=>i!==index));setDirty(true);}} className="absolute right-0 top-0 rounded bg-white p-1"><X size={16}/></button></div>)}</div></>}
    </fieldset>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {discard&&<div role="alertdialog" aria-label="입력 취소 확인" className="mt-3 rounded bg-amber-50 p-3 text-sm">입력한 내용을 버릴까요?<button type="button" className={button+" ml-3"} onClick={()=>setDiscard(false)}>계속 작성</button><button type="button" className={button+" ml-2"} onClick={onCancel}>입력 버리기</button></div>}
    <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4"><span role="status" className="mr-auto text-xs text-slate-500">{uploading?"사진 압축 중…":busy?"저장 중…":""}</span><button type="button" className={button} disabled={busy||uploading} onClick={()=>dirty?setDiscard(true):onCancel()}>취소</button><button className={primary} disabled={busy||uploading||discard} type="submit">{busy?"저장 중…":"저장"}</button></div>
  </form>;
}
