"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, User, Lock, ArrowRight, AlertCircle, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      router.push("/work");
    }
  }, [user, router]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.success && data.staff) {
          setStaffList(data.staff);
        }
      } catch (err) {
        console.error("Failed to load staff list:", err);
      }
    }
    loadStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginId.trim()) {
      setErrorMsg("이름 또는 직원 계정을 입력하거나 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(loginId, password);
      if (result.success) {
        router.push("/work");
      } else {
        setErrorMsg(result.message || "로그인에 실패했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStaff = (staffName: string) => {
    setLoginId(staffName);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          BARON ONLINE
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          바론 INT 본사 직원 전용 통합 업무 및 공정 플랫폼
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                직원 이름 또는 아이디
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="예: 김진우 실장 또는 이민아 팀장"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                비밀번호 (선택/내선번호)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력 (기본 인증)"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Quick Staff Selection */}
            {staffList.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  ⚡ 본사 직원 빠른 선택
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {staffList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStaff(s.name)}
                      className={`text-left px-3 py-2 text-xs rounded-lg border transition-all ${
                        loginId === s.name
                          ? "bg-blue-600/30 border-blue-500 text-blue-300 font-semibold"
                          : "bg-slate-900/50 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{s.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  "인증 확인 중..."
                ) : (
                  <>
                    <span>로그인 및 토큰 발행</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>바론 본사 직원(`client_id` 미부여 계정)만 로그인 허용</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
