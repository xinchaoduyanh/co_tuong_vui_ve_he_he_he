"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";

// Còn trận dở: thanh nổi luôn hiện ở mọi trang (trừ bàn cờ) cùng nút vào lại;
// tự đưa về bàn cờ một lần cho mỗi lần tải trang.
export function RejoinBanner() {
  const match = useActiveMatch();
  const router = useRouter();
  const pathname = usePathname();
  const autoOpened = useRef<string | null>(null);
  const onBoard = pathname === "/game-board";

  useEffect(() => {
    if (!match || onBoard || autoOpened.current === match.matchId) return;
    autoOpened.current = match.matchId;
    router.push(`/game-board?matchId=${match.matchId}`);
  }, [match, onBoard, router]);

  if (!match || onBoard) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[960] flex items-center justify-center gap-3 bg-red-600 px-4 py-2 text-white shadow-lg">
      <span className="text-sm">
        Bạn đang trong trận với <strong>{match.opponent}</strong>. Rời trận quá lâu sẽ bị xử thua.
      </span>
      <button
        type="button"
        onClick={() => router.push(`/game-board?matchId=${match.matchId}`)}
        className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Vào lại trận
      </button>
    </div>
  );
}
