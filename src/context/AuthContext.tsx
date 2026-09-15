"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserInfo } from "@/types";

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (loginIdOrName: string, passwordOrPhone?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "baron_auth_token";
const USER_KEY = "baron_user_info";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from LocalStorage / Cookie / URL Query param
  useEffect(() => {
    async function restoreSession() {
      try {
        // 1. Check URL query token (for integration with drawing program)
        if (typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          const urlToken = searchParams.get("token");
          if (urlToken) {
            setToken(urlToken);
            localStorage.setItem(TOKEN_KEY, urlToken);
            document.cookie = `${TOKEN_KEY}=${urlToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
          }
        }

        const savedToken = localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
        const savedUserStr = localStorage.getItem(USER_KEY);

        if (savedUserStr) {
          try {
            setUser(JSON.parse(savedUserStr));
          } catch (e) {}
        }

        if (savedToken) {
          setToken(savedToken);
          // Verify with API
          const res = await fetch(`/api/auth?token=${encodeURIComponent(savedToken)}`);
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          } else {
            // Token invalid or expired -> reset
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (loginIdOrName: string, passwordOrPhone?: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginIdOrName,
          password: passwordOrPhone,
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
      document.cookie = `${TOKEN_KEY}=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || "서버 통신 오류가 발생했습니다." };
    }
  };

  const logout = () => {
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
