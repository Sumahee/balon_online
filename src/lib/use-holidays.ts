"use client";
import { useEffect,useState } from "react";
const cache=new Map<number,Record<string,string>>();
const pending=new Map<number,Promise<Record<string,string>>>();
export function useHolidays(year:number) {
  const [holidays,setHolidays]=useState<Record<string,string>>({});
  useEffect(()=>{
    let active=true;
    const cached=cache.get(year);
    if(cached){queueMicrotask(()=>{if(active)setHolidays(cached);});return()=>{active=false;};}
    let request=pending.get(year);
    if(!request){request=fetch(`/api/holidays?year=${year}`).then(response=>response.json()).then(result=>{if(!result.success)throw new Error("휴일 조회 실패");cache.set(year,result.data);return result.data as Record<string,string>;}).finally(()=>pending.delete(year));pending.set(year,request);}
    void request.then(data=>{if(active)setHolidays(data);}).catch(()=>{});
    return()=>{active=false;};
  },[year]);
  return holidays;
}
