"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/api/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/websocket-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type OnlinePlayer = {
  id: string;
  username: string;
  sessionId: string;
  status: string;
};

export default function OnlinePlayersPage() {
  const [onlineUsers, setOnlineUsers] = useState<OnlinePlayer[]>([]);
  const {
    stompClient,
    onlineUsers: contextOnlineUsers,
    sessionId,
    pendingChallenges,
  } = useWebSocket();
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (contextOnlineUsers) {
      setOnlineUsers(contextOnlineUsers);
    }
  }, [contextOnlineUsers]);

  const handleChallenge = (targetUsername: string) => {
    if (!stompClient?.connected) {
      toast.error("Không thể kết nối đến server");
      return;
    }

    if (!user?.user?.username || !sessionId) {
      toast.error("Không thể gửi thách đấu: Thông tin người dùng không hợp lệ");
      return;
    }

    console.log("[FE] Sending challenge to:", targetUsername);
    console.log("[FE] Current sessionId:", sessionId);
    console.log("[FE] Current user:", user?.user?.username);

    stompClient.publish({
      destination: "/app/challenge.send",
      body: targetUsername,
      headers: {
        username: user?.user?.username,
        sessionId: sessionId,
      },
    });
    console.log("[FE] Challenge request sent to /app/challenge.send");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
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
                .filter((u) => u.status !== "IN_GAME")
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
                    <Button
                      onClick={() => handleChallenge(u.username)}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={
                        u.status === "IN_GAME" ||
                        pendingChallenges.includes(u.username)
                      }
                    >
                      {u.status === "IN_GAME"
                        ? "Đang chơi"
                        : pendingChallenges.includes(u.username)
                        ? "Đang chờ..."
                        : "Thách đấu"}
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
