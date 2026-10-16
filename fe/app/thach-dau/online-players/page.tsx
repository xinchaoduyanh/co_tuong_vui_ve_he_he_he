"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/api/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/websocket-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOnlinePlayers } from "@/lib/api/hooks/use-online-players";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";

type OnlinePlayer = {
  id: string;
  username: string;
  sessionId: string;
  status: string;
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center text-gray-500">
        Đang tải danh sách người chơi online...
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {activeMatch && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">
          <span>Bạn đang có trận với <strong>{activeMatch.opponent}</strong>, chưa thể tìm trận khác.</span>
          <Button size="sm" onClick={() => router.push(`/game-board?matchId=${activeMatch.matchId}`)}>Vào lại trận</Button>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Người chơi online</CardTitle>
        </CardHeader>
        <CardContent>
          {!onlineUsers || onlineUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Không có người chơi nào online
            </div>
          ) : (
            <div className="space-y-2">
              {onlineUsers
                .filter((u) => u.username !== user?.user?.username)
                .map((u) => (
                  <div
                    key={u.id || u.username}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-amber-300">
                        <AvatarImage src="/placeholder.svg" alt={u.username} />
                        <AvatarFallback className="bg-amber-100 text-amber-800">
                          {String(u.username || "??")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.username}</p>
                        <p className="text-sm text-gray-500">
                          {u.status === "IN_GAME" ? "Đang chơi" : "Online"}
                        </p>
                      </div>
                    </div>
                    {pendingChallenges.includes(u.username) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Đang chờ...</span>
                        <Button
                          onClick={() => cancelChallenge(u.username)}
                          size="sm"
                          variant="outline"
                        >
                          Huỷ
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleChallenge(u.username)}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={u.status === "IN_GAME" || !!activeMatch}
                        title={activeMatch ? "Bạn đang trong trận, hãy vào lại trận trước" : undefined}
                      >
                        {u.status === "IN_GAME" ? "Đang chơi" : "Thách đấu"}
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
