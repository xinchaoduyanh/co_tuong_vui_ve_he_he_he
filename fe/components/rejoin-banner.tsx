"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useWebSocket } from "@/lib/websocket-context";
import { API_BASE_URL } from "@/lib/api/config";

type ActiveMatch = { matchId: string; opponent: string };

// Khi đăng nhập/kết nối mà còn trận dở: hiện banner và tự đưa về bàn cờ (mỗi lần tải trang một lần)
export function RejoinBanner() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const router = useRouter();
  const pathname = usePathname();
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const autoOpened = useRef<string | null>(null);

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
        if (!snap) {
          setMatch(null);
          return;
        }
        const isRed = snap.players?.red?.id === user.id;
        const opponent = isRed ? snap.players?.black : snap.players?.red;
        setMatch({
          matchId: snap.matchId,
          opponent: opponent?.username ?? "đối thủ",
        });
      })
      .catch(() => {
        if (!cancelled) setMatch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isConnected]);

  useEffect(() => {
    if (!match || pathname === "/game-board") return;
    if (autoOpened.current === match.matchId) return;
    autoOpened.current = match.matchId;
    router.push(`/game-board?matchId=${match.matchId}`);
  }, [match, pathname, router]);

  if (!match || pathname === "/game-board") return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg border border-amber-300">
      <span className="text-sm text-amber-900">
        Bạn đang có trận dở với <strong>{match.opponent}</strong>
      </span>
      <button
        type="button"
        onClick={() => router.push(`/game-board?matchId=${match.matchId}`)}
        className="rounded-md bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
      >
        Vào lại
      </button>
    </div>
  );
}
