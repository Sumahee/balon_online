"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { UserInfo } from "@/types";

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (loginIdOrName: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "baron_auth_token";
const USER_KEY = "baron_user_info";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionEpoch = useRef(0);

  // Restore session from LocalStorage / Cookie / URL Query param
  useEffect(() => {
    async function restoreSession() {
      const epoch = sessionEpoch.current;
      try {
        const urlToken = new URLSearchParams(window.location.search).get("token");
        const savedToken = urlToken || localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
        // Cached user names never grant a session before the server checks membership.
        localStorage.removeItem(USER_KEY);
        if (savedToken) {
          const res = await fetch("/api/auth", { headers: { Authorization: `Bearer ${savedToken}` }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
          const data = await res.json();
          if (epoch !== sessionEpoch.current) return;
          if (res.ok && data.success && data.user) {
            const renewedToken = data.token || savedToken;
            document.cookie = `${TOKEN_KEY}=${encodeURIComponent(renewedToken)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
            setUser(data.user);
            setToken(renewedToken);
            localStorage.setItem(TOKEN_KEY, renewedToken);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            if (urlToken) {
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete("token");
              window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
            }
          } else if (res.status === 401 || res.status === 403) {
            setUser(null);
            setToken(null);
            localStorage.removeItem(TOKEN_KEY);
            document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
          }
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
    const refresh = () => { void restoreSession(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);

  const login = async (loginIdOrName: string, password?: string) => {
    sessionEpoch.current++;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          loginId: loginIdOrName,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "로그인에 실패했습니다." };
      }

      setUser(data.user);
      setToken(data.token);

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(data.token)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;

      return { success: true, message: data.message };
    } catch {
      return { success: false, message: "인증 서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 다시 시도해 주세요." };
    }
  };

  const logout = () => {
    sessionEpoch.current++;
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
