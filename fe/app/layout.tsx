import type React from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/lib/websocket-context";
import { AuthProvider } from "@/lib/api/context/AuthContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { RejoinBanner } from "@/components/rejoin-banner";
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
// Chữ Hán chỉ dùng trên quân cờ và dải sông; file lớn nên không preload
const han = Noto_Serif_TC({
  weight: ["700"],
  variable: "--font-han",
  display: "swap",
  preload: false,
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
          <AuthProvider>
            <NotificationProvider>
              <WebSocketProvider>
                <RejoinBanner />
                <main className="min-h-dvh">{children}</main>
              </WebSocketProvider>
            </NotificationProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
