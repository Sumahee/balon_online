import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { PwaRegistration } from "@/components/common/PwaRegistration";

export const metadata: Metadata = {
  title: "바론 온라인 | BALON INT 통합 관리 시스템",
  description: "바론 INT 내부 업무 관리, A/S 파이프라인, 현장 이미지 아카이브, 서랍장 자동화 치수 산출 통합 플랫폼",
  applicationName: "BALON",
  appleWebApp: { capable: true, title: "BALON", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icon.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <PwaRegistration />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
