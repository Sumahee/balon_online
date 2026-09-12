import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "바론 온라인 | BARON INT 통합 관리 시스템",
  description: "바론 INT 내부 업무 관리, A/S 파이프라인, 현장 이미지 아카이브, 서랍장 자동화 치수 산출 통합 플랫폼",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
