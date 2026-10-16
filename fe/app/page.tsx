"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { handleLogout } from "@/lib/api/context/AuthContext";
import { User } from "@/lib/types/user";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";
import { PlayerAvatar } from "@/components/player-avatar";
import { Wordmark } from "@/components/brand";
import { BoardMenu } from "@/components/board-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { CultureCard } from "@/components/culture-card";
import { RankBadge } from "@/components/rank-badge";

export default function Home() {
  const router = useRouter();
  const activeMatch = useActiveMatch();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      router.push("/login");
    }
  }, []);

  if (!user) return null;

  const playHref = activeMatch ? `/game-board?matchId=${activeMatch.matchId}` : "/thach-dau";
  const stats: Array<[string, number]> = [
    ["Thắng", user.wins],
    ["Thua", user.loses],
    ["Hòa", user.draws],
    ["Tổng trận", user.totalMatches],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="rise flex items-center justify-between" style={{ ["--i" as any]: 0 }}>
        <Wordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut />
            Thoát
          </Button>
        </div>
      </header>

      <section className="rise mt-10 flex items-end justify-between gap-4" style={{ ["--i" as any]: 1 }}>
        <div className="flex min-w-0 items-center gap-4">
          <PlayerAvatar name={user.username} className="h-14 w-14 shrink-0 text-lg" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Xin chào</p>
            <h1 className="truncate font-display text-3xl font-bold leading-tight">{user.username}</h1>
            <p className="mt-1 text-sm text-muted-foreground"><RankBadge elo={user.elo} /></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Elo</p>
          <p className="tabular font-display text-5xl font-bold leading-none">{user.elo}</p>
        </div>
      </section>

      <dl className="rise mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-border" style={{ ["--i" as any]: 2 }}>
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="tabular mt-0.5 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <nav className="rise mt-8" aria-label="Chức năng" style={{ ["--i" as any]: 3 }}>
        <BoardMenu
          cta={{
            href: playHref,
            title: activeMatch ? `Vào lại trận với ${activeMatch.opponent}` : "Thách đấu",
            hint: activeMatch ? "Hoàn thành ván hiện tại trước khi tìm ván khác" : "Mời một kỳ thủ đang online",
            badge: activeMatch ? "Đang có trận" : undefined,
          }}
          pieces={[
            { id: "ai", href: activeMatch ? playHref : "/ai-game-board", x: 1, y: 2, side: "r", type: "H", title: activeMatch ? "Vào lại trận" : "Chơi với máy", hint: "Luyện tập, không tính điểm" },
            { id: "rank", href: "/bang-xep-hang", x: 7, y: 2, side: "r", type: "R", title: "Xếp hạng", hint: "Theo Elo và tỉ lệ thắng" },
            { id: "history", href: "/lich-su-dau", x: 1, y: 7, side: "b", type: "A", title: "Lịch sử đấu", hint: "Các ván gần đây" },
            { id: "culture", href: "/van-hoa", x: 7, y: 7, side: "b", type: "E", title: "Văn hóa", hint: "Quân, cổ tích, lời răn" },
          ]}
        />
      </nav>

      <CultureCard className="rise mt-10" />
    </div>
  );
}
