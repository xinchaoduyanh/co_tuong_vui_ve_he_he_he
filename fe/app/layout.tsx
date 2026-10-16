import type React from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/lib/websocket-context";
import { AuthProvider } from "@/lib/api/context/AuthContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { RejoinBanner } from "@/components/rejoin-banner";
import { ActiveMatchProvider } from "@/lib/api/hooks/use-active-match";
import { AmbientLayer } from "@/components/ambient-layer";
const ui = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});
const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
// Chữ Hán trên quân cờ và dải sông: chỉ 18 ký tự Noto Serif TC Bold (OFL), lưu cục bộ để không phải
// tải hàng trăm mảnh font CJK từ Google mỗi lần build hay mở trang.
const han = localFont({
  src: "../public/fonts/han-subset.woff2",
  weight: "700",
  variable: "--font-han",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cờ Tướng - Chinese Chess",
  description: "Ứng dụng chơi cờ tướng trực tuyến",
  
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${ui.variable} ${display.variable} ${han.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AmbientLayer />
          <AuthProvider>
            <NotificationProvider>
              <WebSocketProvider>
                <ActiveMatchProvider>
                  <RejoinBanner />
                  <main className="min-h-dvh">{children}</main>
                </ActiveMatchProvider>
              </WebSocketProvider>
            </NotificationProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
