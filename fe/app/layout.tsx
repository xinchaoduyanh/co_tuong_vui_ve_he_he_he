import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/lib/websocket-context";
import { AuthProvider } from "@/lib/api/context/AuthContext";
import { NotificationProvider } from "@/components/NotificationProvider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cờ Tướng - Chinese Chess",
  description: "Ứng dụng chơi cờ tướng trực tuyến",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              <WebSocketProvider>
                <main className="min-h-screen">{children}</main>
              </WebSocketProvider>
            </NotificationProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
