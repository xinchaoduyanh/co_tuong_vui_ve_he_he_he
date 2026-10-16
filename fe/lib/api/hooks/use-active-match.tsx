"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useWebSocket } from "@/lib/websocket-context";
import { API_BASE_URL } from "@/lib/api/config";

export type ActiveMatch = { matchId: string; opponent: string };

const ActiveMatchContext = createContext<ActiveMatch | null>(null);

// Trận người-người còn dở của người đang đăng nhập (null nếu không có).
// Chỉ một provider gọi API, dùng chung cho banner, trang chủ và trang người chơi online;
// tải lại khi kết nối lại hoặc đổi trang để rời bàn cờ vẫn thấy nút vào lại.
export function ActiveMatchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const pathname = usePathname();
  const [match, setMatch] = useState<ActiveMatch | null>(null);

  useEffect(() => {
    if (!user?.id || !isConnected) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/players/${user.id}/active-match`, { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => {
        const snap = body?.success ? body.data : null;
        if (!snap || snap.status !== "ACTIVE") {
          setMatch(null);
          return;
        }
        const isRed = snap.players?.red?.id === user.id;
        const opponent = isRed ? snap.players?.black : snap.players?.red;
        const next = { matchId: snap.matchId, opponent: opponent?.username ?? "đối thủ" };
        // Giữ nguyên tham chiếu nếu không đổi để không vẽ lại các nơi dùng
        setMatch((prev) =>
          prev && prev.matchId === next.matchId && prev.opponent === next.opponent ? prev : next
        );
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setMatch(null);
      });
    return () => controller.abort();
  }, [user?.id, isConnected, pathname]);

  return <ActiveMatchContext.Provider value={match}>{children}</ActiveMatchContext.Provider>;
}

export function useActiveMatch(): ActiveMatch | null {
  return useContext(ActiveMatchContext);
}
