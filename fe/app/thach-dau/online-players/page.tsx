"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/api/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/websocket-context";
import { PlayerAvatar } from "@/components/player-avatar";
import { PageHeader } from "@/components/brand";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/list-states";
import { useOnlinePlayers } from "@/lib/api/hooks/use-online-players";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";

type OnlinePlayer = {
  id: string;
  username: string;
  sessionId: string;
  status: string;
  elo?: number;
};


export default function OnlinePlayersPage() {
  const { data: apiOnlineUsers, isLoading, error } = useOnlinePlayers();
  const [onlineUsers, setOnlineUsers] = useState<OnlinePlayer[]>([]);
  const {
    onlineUsers: contextOnlineUsers,
    pendingChallenges,
    sendChallenge,
    cancelChallenge,
  } = useWebSocket();
  const user = useAuth();
  const router = useRouter();
  const activeMatch = useActiveMatch();

  // Khi apiOnlineUsers thay đổi (lần đầu vào trang), cập nhật danh sách
  useEffect(() => {
    if (apiOnlineUsers && apiOnlineUsers.length > 0) {
      setOnlineUsers(apiOnlineUsers);
    }
  }, [apiOnlineUsers]);

  // Nếu có update từ socket, cập nhật lại
  useEffect(() => {
    if (contextOnlineUsers && contextOnlineUsers.length > 0) {
      setOnlineUsers(contextOnlineUsers);
    }
  }, [contextOnlineUsers]);

  const handleChallenge = (targetUsername: string) => {
    sendChallenge(targetUsername);
  };

  const others = (onlineUsers || []).filter((u) => u.username !== user?.user?.username);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <PageHeader title="Người chơi online" backHref="/thach-dau" />

      {activeMatch && (
        <div className="rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/12 px-4 py-3 ring-1 ring-primary/40">
          <p className="text-sm">
            Bạn đang có trận với <strong>{activeMatch.opponent}</strong>, chưa thể tìm trận khác.
          </p>
          <Button size="sm" onClick={() => router.push(`/game-board?matchId=${activeMatch.matchId}`)}>
            Vào lại trận
          </Button>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={String(error)} />
      ) : others.length === 0 ? (
        <EmptyState
          title="Chưa có ai online"
          hint="Mời bạn bè vào cùng, danh sách sẽ tự cập nhật khi có người đăng nhập."
        />
      ) : (
        <ul className="flex flex-col">
          {others.map((u, i) => {
            const inGame = u.status === "IN_GAME";
            const pending = pendingChallenges.includes(u.username);
            return (
              <li
                key={u.id || u.username}
                className="rise flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/60"
                style={{ ["--i" as any]: Math.min(i, 8) }}
              >
                <PlayerAvatar name={u.username} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{u.username}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={`h-2 w-2 rounded-full ${inGame ? "bg-warning" : "bg-success"}`}
                      aria-hidden
                    />
                    {inGame ? "Đang chơi" : "Online"}
                    {typeof u.elo === "number" && <span className="tabular">· Elo {u.elo}</span>}
                  </p>
                </div>
                {pending ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Đang chờ…</span>
                    <Button onClick={() => cancelChallenge(u.username)} size="sm" variant="outline">
                      Huỷ
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleChallenge(u.username)}
                    size="sm"
                    disabled={inGame || !!activeMatch}
                    title={activeMatch ? "Bạn đang trong trận, hãy vào lại trận trước" : undefined}
                  >
                    {inGame ? "Đang chơi" : "Thách đấu"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
