"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/websocket-context";
import { useAuth } from "@/lib/api/context/AuthContext";
import { useNotification } from "@/components/NotificationProvider";

// Năm mức độ khó của máy (khớp EngineMoveService ở BE)
export const AI_LEVELS = [
  { level: 1, name: "Tập sự", description: "Hay đi sai, hợp người mới tập" },
  { level: 2, name: "Dễ", description: "Đôi lúc đi dở, dễ thắng" },
  { level: 3, name: "Trung bình", description: "Chơi chắc tay, ít sai" },
  { level: 4, name: "Khó", description: "Tính nửa giây mỗi nước" },
  { level: 5, name: "Đại kiện tướng", description: "Tính hai giây mỗi nước, rất mạnh" },
] as const;

export type AiSide = "r" | "b";

// Tạo ván với máy; khi server báo GAME_STARTED thì vào bàn cờ dùng chung với ván người-người.
export const useAIGame = () => {
  const { stompClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!stompClient || !isConnected || !user) return;
    const subscription = stompClient.subscribe(
      `/user/${user.username}/queue/game.withAI`,
      (message) => {
        const data = JSON.parse(message.body);
        if (data.type === "GAME_STARTED") {
          router.push(`/game-board?matchId=${data.matchId}`);
        } else if (data.type === "ERROR") {
          setIsStarting(false);
          showNotification({ severity: "error", summary: "Không thể bắt đầu", detail: data.message });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [stompClient, isConnected, user, router, showNotification]);

  const startAIGame = useCallback(
    (level: number, side: AiSide) => {
      if (!stompClient || !isConnected || !user) return;
      setIsStarting(true);
      stompClient.publish({
        destination: "/app/game.withAI",
        body: JSON.stringify({ username: user.username, level, side }),
      });
    },
    [stompClient, isConnected, user]
  );

  return { startAIGame, isStarting, canStart: Boolean(stompClient && isConnected && user) };
};
