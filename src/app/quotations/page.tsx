"use client";
import React,{useEffect,useState,createElement} from 'react';
import {requestApi} from '@/lib/api-client';
import './quotation-archive.css';
type Tree=string|{tag:string;className?:string;style?:React.CSSProperties;colSpan?:number;rowSpan?:number;src?:string;alt?:string;children:Tree[]};
interface Quote {id:string;title:string;client_name:string;site_address:string;quote_date:string;installation_date:string;created_at:string;created_by:string;total:number;vat_included:number;document?:{pages:Tree[]}}
const allowed=new Set(['article','header','h1','div','label','span','table','colgroup','col','tbody','thead','tr','th','td','main','img','small','strong','b','footer','section','br']);
function renderTree(node:Tree,key:number):React.ReactNode {
 if(typeof node==='string')return node;
 if(!allowed.has(node.tag))return null;
 const props:Record<string,unknown>={key,className:node.className,style:node.style};
 if(['td','th'].includes(node.tag)){props.colSpan=node.colSpan;props.rowSpan=node.rowSpan;}
 if(node.tag==='img')return createElement('img',{key,src:'/balon.png',alt:'BALON',className:node.className});
 if(['col','br'].includes(node.tag))return createElement(node.tag,props);
 return createElement(node.tag,props,...node.children.map(renderTree));
}
export default function QuotationsPage(){
 const [items,setItems]=useState<Quote[]>([]),[selected,setSelected]=useState<Quote|null>(null),[search,setSearch]=useState('');
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;requestApi<Quote[]>('/api/quotations').then(result=>{if(!cancelled)setItems(result.data||[]);}).catch(error=>{if(!cancelled)setError(error.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[]);
 const open=async(id:string)=>{setError('');try{const result=await requestApi<Quote>(`/api/quotations?id=${encodeURIComponent(id)}`);setSelected(result.data!);}catch(error){setError(error instanceof Error?error.message:'견적서를 열지 못했습니다.');}};
 const visible=items.filter(item=>`${item.title} ${item.site_address} ${item.created_by}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="space-y-5"><header><h1 className="text-2xl font-bold">견적서 게시판</h1><p className="text-sm text-slate-500 mt-2">바론웹에서 PDF 저장 시 등록한 최종 견적서입니다.</p></header>
  <label className="block text-sm">견적서 검색<input className="block bg-white rounded-lg border p-3 mt-2 w-full max-w-lg" placeholder="업체·현장·작성자 검색" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  {error&&<p role="alert" className="text-red-600">{error}</p>}
  {loading?<p role="status">견적서를 불러오는 중…</p>:<div className="overflow-auto bg-white border rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['견적서 제목','견적일','시공 예정일','금액','등록일','등록자'].map(name=><th className="p-4 whitespace-nowrap" key={name}>{name}</th>)}</tr></thead><tbody>{visible.map(item=><tr key={item.id} className="border-t hover:bg-blue-50"><td className="p-4"><button className="text-blue-700 font-medium text-left" onClick={()=>void open(item.id)}>{item.title}</button><p className="text-xs text-slate-500 mt-1">{item.site_address}</p></td><td className="p-4 whitespace-nowrap">{item.quote_date}</td><td className="p-4 whitespace-nowrap">{item.installation_date||'—'}</td><td className="p-4 whitespace-nowrap">{Number(item.total).toLocaleString('ko-KR')}원 <small>({item.vat_included?'포함가':'별도가'})</small></td><td className="p-4 whitespace-nowrap">{new Date(item.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</td><td className="p-4">{item.created_by}</td></tr>)}{!visible.length&&<tr><td colSpan={6} className="p-10 text-center text-slate-500">{search?'검색 결과가 없습니다.':'등록된 견적서가 없습니다.'}</td></tr>}</tbody></table></div>}
  {selected&&<div role="dialog" aria-modal="true" aria-label="저장된 견적서" className="quotation-overlay"><div className="quotation-toolbar"><span>{selected.title}</span><button className="border border-slate-400 rounded px-4 py-2" onClick={()=>setSelected(null)}>닫기</button></div><div className="quotation-archive-document quotation-pdf-snapshot">{selected.document?.pages.map(renderTree)}</div></div>}
 </div>;
}
