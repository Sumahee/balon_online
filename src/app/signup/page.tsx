"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [type,setType]=useState("installer"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[done,setDone]=useState(false);
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white"><h1 className="text-2xl font-bold">BALON 회원가입</h1><p className="mt-2 text-sm text-slate-400">바론웹과 같은 회원 계정을 사용합니다. 관리자 승인 후 로그인할 수 있습니다.</p>
    {done ? <p role="status" className="my-6 text-sm text-emerald-300">{message}</p> : <form className="my-6 space-y-4" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setMessage("");const values=Object.fromEntries(new FormData(event.currentTarget));try{if(values.password!==values.confirmPassword)throw new Error("비밀번호 확인이 일치하지 않습니다.");const response=await fetch("/api/auth?action=register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,accountType:type})});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||"가입 실패");setDone(true);setMessage(result.message);}catch(error){setMessage(error instanceof Error?error.message:"가입 실패");}finally{setBusy(false);}}}>
      <label className="block text-sm">가입 등급<select value={type} onChange={event=>setType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3"><option value="installer">바론 직원 · 시공자</option><option value="staff">바론 직원 · 일반 직원</option></select></label><p className="text-xs text-slate-400">시공자는 달력 업무 조회·사진 업로드·댓글 작성만 이용합니다.</p>
      {[["loginId","아이디 (영문·숫자 4~40자)","text"],["name","이름","text"],["phone","휴대폰 연락처","tel"],["email","이메일 (선택)","email"],["password","비밀번호 (8자 이상)","password"],["confirmPassword","비밀번호 확인","password"]].map(([name,label,type])=><label key={name} className="block text-sm">{label}<input name={name} type={type} required={name!=="email"} minLength={type==="password"?8:undefined} autoComplete={name==="password"||name==="confirmPassword"?"new-password":name==="loginId"?"username":undefined} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-3" /></label>)}
      {message&&<p role="alert" className="text-sm text-rose-300">{message}</p>}<button disabled={busy} className="w-full rounded-lg bg-blue-600 py-3 font-semibold disabled:opacity-50">{busy?"신청 중…":"가입 신청"}</button>
    </form>}<Link href="/login" className="text-sm text-blue-300 underline">로그인으로 돌아가기</Link>
  </section></div>;
}
