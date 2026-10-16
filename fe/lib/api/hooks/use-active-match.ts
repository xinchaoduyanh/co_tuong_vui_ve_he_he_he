"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useWebSocket } from "@/lib/websocket-context";
import { API_BASE_URL } from "@/lib/api/config";

export type ActiveMatch = { matchId: string; opponent: string };

// Trận người-người còn dở của người đang đăng nhập (null nếu không có).
// Tải lại mỗi khi kết nối lại hoặc đổi trang, nên rời bàn cờ rồi vẫn thấy nút vào lại.
export function useActiveMatch(): ActiveMatch | null {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const pathname = usePathname();
  const [match, setMatch] = useState<ActiveMatch | null>(null);

  useEffect(() => {
    if (!user?.id || !isConnected) {
      setMatch(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/players/${user.id}/active-match`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        const snap = body?.success ? body.data : null;
        if (!snap || snap.status !== "ACTIVE") {
          setMatch(null);
          return;
        }
        const isRed = snap.players?.red?.id === user.id;
        const opponent = isRed ? snap.players?.black : snap.players?.red;
        setMatch({ matchId: snap.matchId, opponent: opponent?.username ?? "đối thủ" });
      })
      .catch(() => {
        if (!cancelled) setMatch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isConnected, pathname]);

  return match;
}
