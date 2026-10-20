"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiGameDialog } from "@/components/ai-game-dialog";

// Điểm vào "Chơi với máy": chọn độ khó rồi vào /game-board (cùng bàn cờ với ván người-người)
export default function AIGameLobby() {
  const router = useRouter();
  useEffect(() => {
    document.body.dataset.scene = "match";
    return () => {
      delete document.body.dataset.scene;
    };
  }, []);

  return <AiGameDialog open onClose={() => router.push("/")} />;
}
